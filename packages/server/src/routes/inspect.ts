import type { Hono } from 'hono';
import { inspectConnectSchema, inspectCallSchema, saveInspectRecordingSchema } from '@mcpspec/shared';
import type { ProtocolLogEntry, Recording, RecordingStep } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl } from '@mcpspec/core';
import type { ServerConfig } from '@mcpspec/shared';
import type { WebSocketHandler } from '../websocket.js';
import type { Database } from '../db/database.js';
import { randomUUID } from 'node:crypto';

const MAX_LOG_ENTRIES = 10_000;

interface InspectSession {
  client: MCPClient;
  processManager: ProcessManagerImpl;
  lastUsed: number;
  protocolLog: ProtocolLogEntry[];
  pendingRequests: Map<string | number, number>;
}

const sessions = new Map<string, InspectSession>();
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastUsed > SESSION_TIMEOUT_MS) {
      session.client.disconnect().catch(() => {});
      session.processManager.shutdownAll().catch(() => {});
      sessions.delete(id);
    }
  }
}, 60_000);

export function inspectRoutes(app: Hono, db?: Database, wsHandler?: WebSocketHandler): void {
  app.post('/api/inspect/connect', async (c) => {
    const body = await c.req.json();
    const parsed = inspectConnectSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const sessionId = randomUUID();
    const processManager = new ProcessManagerImpl();
    const config: ServerConfig = {
      transport: parsed.data.transport,
      command: parsed.data.command,
      args: parsed.data.args,
      url: parsed.data.url,
      env: parsed.data.env,
    };

    const session: InspectSession = {
      client: null as unknown as MCPClient,
      processManager,
      lastUsed: Date.now(),
      protocolLog: [],
      pendingRequests: new Map(),
    };

    const onProtocolMessage = (direction: 'outgoing' | 'incoming', message: Record<string, unknown>) => {
      const jsonrpcId = message.id as string | number | null | undefined;
      const method = message.method as string | undefined;
      const isError = message.error !== undefined;
      const now = Date.now();

      const entry: ProtocolLogEntry = {
        id: randomUUID(),
        timestamp: now,
        direction,
        message,
        jsonrpcId: jsonrpcId ?? undefined,
        method,
        isError: isError || undefined,
      };

      // Request-response pairing for round-trip timing
      if (direction === 'outgoing' && jsonrpcId != null && method) {
        session.pendingRequests.set(jsonrpcId, now);
      } else if (direction === 'incoming' && jsonrpcId != null) {
        const sentAt = session.pendingRequests.get(jsonrpcId);
        if (sentAt !== undefined) {
          entry.roundTripMs = now - sentAt;
          session.pendingRequests.delete(jsonrpcId);
        }
      }

      // Cap stored entries
      if (session.protocolLog.length >= MAX_LOG_ENTRIES) {
        session.protocolLog.shift();
      }
      session.protocolLog.push(entry);

      // Broadcast via WebSocket
      if (wsHandler) {
        wsHandler.broadcast(`inspect:${sessionId}`, 'protocol-message', entry);
      }
    };

    const client = new MCPClient({ serverConfig: config, processManager, onProtocolMessage });
    session.client = client;

    try {
      await client.connect();
      sessions.set(sessionId, session);
      return c.json({ data: { sessionId, connected: true } });
    } catch (err) {
      await processManager.shutdownAll();
      const message = err instanceof Error ? err.message : 'Connection failed';
      return c.json({ error: 'connection_error', message }, 500);
    }
  });

  app.post('/api/inspect/tools', async (c) => {
    const body = await c.req.json();
    const sessionId = body?.sessionId as string | undefined;
    if (!sessionId) {
      return c.json({ error: 'validation_error', message: 'sessionId is required' }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    session.lastUsed = Date.now();
    try {
      const tools = await session.client.listTools();
      return c.json({ data: tools });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list tools';
      return c.json({ error: 'tool_error', message }, 500);
    }
  });

  app.post('/api/inspect/call', async (c) => {
    const body = await c.req.json();
    const parsed = inspectCallSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const session = sessions.get(parsed.data.sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    session.lastUsed = Date.now();
    try {
      const result = await session.client.callTool(parsed.data.tool, parsed.data.input ?? {});
      return c.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool call failed';
      return c.json({ error: 'tool_error', message }, 500);
    }
  });

  app.post('/api/inspect/resources', async (c) => {
    const body = await c.req.json();
    const sessionId = body?.sessionId as string | undefined;
    if (!sessionId) {
      return c.json({ error: 'validation_error', message: 'sessionId is required' }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    session.lastUsed = Date.now();
    try {
      const resources = await session.client.listResources();
      return c.json({ data: resources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list resources';
      return c.json({ error: 'resource_error', message }, 500);
    }
  });

  app.post('/api/inspect/messages', async (c) => {
    const body = await c.req.json();
    const sessionId = body?.sessionId as string | undefined;
    if (!sessionId) {
      return c.json({ error: 'validation_error', message: 'sessionId is required' }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    session.lastUsed = Date.now();
    const after = typeof body.after === 'number' ? body.after : undefined;

    let entries = session.protocolLog;
    if (after !== undefined) {
      entries = entries.filter((e) => e.timestamp > after);
    }

    return c.json({ data: entries, total: session.protocolLog.length });
  });

  app.post('/api/inspect/disconnect', async (c) => {
    const body = await c.req.json();
    const sessionId = body?.sessionId as string | undefined;
    if (!sessionId) {
      return c.json({ error: 'validation_error', message: 'sessionId is required' }, 400);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ data: { disconnected: true } });
    }

    try {
      await session.client.disconnect();
      await session.processManager.shutdownAll();
    } catch {
      // Best-effort cleanup
    }
    sessions.delete(sessionId);
    return c.json({ data: { disconnected: true } });
  });

  // Save current inspect session as a recording
  app.post('/api/inspect/save-recording', async (c) => {
    if (!db) {
      return c.json({ error: 'unavailable', message: 'Database not configured' }, 500);
    }

    const body = await c.req.json();
    const parsed = saveInspectRecordingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const session = sessions.get(parsed.data.sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    // Extract tool calls from protocol log
    const steps: RecordingStep[] = [];
    const pendingCalls = new Map<string | number, { tool: string; input: Record<string, unknown>; sentAt: number }>();

    for (const entry of session.protocolLog) {
      if (entry.direction === 'outgoing' && entry.method === 'tools/call') {
        const msg = entry.message as Record<string, unknown>;
        const params = msg.params as Record<string, unknown> | undefined;
        if (params && entry.jsonrpcId != null) {
          pendingCalls.set(entry.jsonrpcId, {
            tool: params.name as string,
            input: (params.arguments ?? {}) as Record<string, unknown>,
            sentAt: entry.timestamp,
          });
        }
      } else if (entry.direction === 'incoming' && entry.jsonrpcId != null) {
        const pending = pendingCalls.get(entry.jsonrpcId);
        if (pending) {
          const msg = entry.message as Record<string, unknown>;
          const result = msg.result as Record<string, unknown> | undefined;
          const isError = msg.error !== undefined || (result && (result as Record<string, unknown>).isError === true);
          const content = result?.content as unknown[] ?? [];
          const durationMs = entry.roundTripMs ?? (entry.timestamp - pending.sentAt);

          steps.push({
            tool: pending.tool,
            input: pending.input,
            output: content,
            isError: isError || undefined,
            durationMs,
          });
          pendingCalls.delete(entry.jsonrpcId);
        }
      }
    }

    if (steps.length === 0) {
      return c.json({ error: 'no_calls', message: 'No tool calls found in session to record' }, 400);
    }

    // Get tool list from session
    let toolList: Array<{ name: string; description?: string }> = [];
    try {
      const tools = await session.client.listTools();
      toolList = tools.map((t) => ({ name: t.name, description: t.description }));
    } catch {
      // Best effort
    }

    const serverInfo = session.client.getServerInfo();
    const recording: Recording = {
      id: randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description,
      serverName: serverInfo?.name,
      tools: toolList,
      steps,
      createdAt: new Date().toISOString(),
    };

    const saved = db.createRecording({
      name: recording.name,
      description: recording.description,
      serverName: recording.serverName,
      data: JSON.stringify(recording),
    });

    return c.json({ data: saved }, 201);
  });
}
