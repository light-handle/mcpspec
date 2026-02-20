import type { Hono } from 'hono';
import { inspectConnectSchema, inspectCallSchema } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl } from '@mcpspec/core';
import type { ServerConfig } from '@mcpspec/shared';
import { randomUUID } from 'node:crypto';

interface InspectSession {
  client: MCPClient;
  processManager: ProcessManagerImpl;
  lastUsed: number;
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

export function inspectRoutes(app: Hono): void {
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

    const client = new MCPClient({ serverConfig: config, processManager });

    try {
      await client.connect();
      sessions.set(sessionId, { client, processManager, lastUsed: Date.now() });
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
}
