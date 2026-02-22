import type { Hono } from 'hono';
import { auditStartSchema, auditDryRunSchema } from '@mcpspec/shared';
import type { SecurityScanResult, SecurityScanMode, ServerConfig } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl, SecurityScanner, ScanConfig } from '@mcpspec/core';
import type { DryRunResult } from '@mcpspec/core';
import type { WebSocketHandler } from '../websocket.js';
import { randomUUID } from 'node:crypto';

type AuditStatus = 'connecting' | 'scanning' | 'completed' | 'error';

interface AuditProgress {
  currentRule?: string;
  completedRules: number;
  totalRules: number;
  findingsCount: number;
}

interface AuditSession {
  client: MCPClient;
  processManager: ProcessManagerImpl;
  status: AuditStatus;
  progress: AuditProgress;
  result?: SecurityScanResult;
  error?: string;
  lastUsed: number;
}

const sessions = new Map<string, AuditSession>();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

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

export function auditRoutes(app: Hono, wsHandler?: WebSocketHandler): void {
  app.post('/api/audit/start', async (c) => {
    const body = await c.req.json();
    const parsed = auditStartSchema.safeParse(body);
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

    const scanConfig = new ScanConfig({
      mode: parsed.data.mode as SecurityScanMode,
      rules: parsed.data.rules,
      excludeTools: parsed.data.excludeTools,
      acknowledgeRisk: true, // UI handles confirmation client-side
    });

    const session: AuditSession = {
      client: null as unknown as MCPClient,
      processManager,
      status: 'connecting',
      progress: { completedRules: 0, totalRules: scanConfig.rules.length, findingsCount: 0 },
      lastUsed: Date.now(),
    };

    const client = new MCPClient({ serverConfig: config, processManager });
    session.client = client;
    sessions.set(sessionId, session);

    // Connect and start scan in background
    (async () => {
      try {
        await client.connect();
        session.status = 'scanning';

        const scanner = new SecurityScanner();
        const result = await scanner.scan(client, scanConfig, {
          onRuleStart: (ruleId, ruleName) => {
            session.progress.currentRule = ruleName;
            session.lastUsed = Date.now();
            wsHandler?.broadcast(`scan:${sessionId}`, 'rule-start', { ruleId, ruleName });
          },
          onRuleComplete: (ruleId, findingsCount) => {
            session.progress.completedRules++;
            session.lastUsed = Date.now();
            wsHandler?.broadcast(`scan:${sessionId}`, 'rule-complete', { ruleId, findingsCount });
          },
          onFinding: (finding) => {
            session.progress.findingsCount++;
            session.lastUsed = Date.now();
            wsHandler?.broadcast(`scan:${sessionId}`, 'finding', { finding });
          },
        });

        session.result = result;
        session.status = 'completed';
        session.lastUsed = Date.now();
        wsHandler?.broadcast(`scan:${sessionId}`, 'completed', { summary: result.summary });
      } catch (err) {
        session.status = 'error';
        session.error = err instanceof Error ? err.message : 'Scan failed';
        session.lastUsed = Date.now();
        wsHandler?.broadcast(`scan:${sessionId}`, 'error', { message: session.error });
      }
    })();

    return c.json({ data: { sessionId } });
  });

  app.post('/api/audit/dry-run', async (c) => {
    const body = await c.req.json();
    const parsed = auditDryRunSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const processManager = new ProcessManagerImpl();
    const config: ServerConfig = {
      transport: parsed.data.transport,
      command: parsed.data.command,
      args: parsed.data.args,
      url: parsed.data.url,
      env: parsed.data.env,
    };

    const scanConfig = new ScanConfig({
      mode: parsed.data.mode as SecurityScanMode,
      rules: parsed.data.rules,
      excludeTools: parsed.data.excludeTools,
      acknowledgeRisk: true,
    });

    const client = new MCPClient({ serverConfig: config, processManager });

    try {
      await client.connect();
      const scanner = new SecurityScanner();
      const result = await scanner.dryRun(client, scanConfig);
      await client.disconnect();
      await processManager.shutdownAll();
      return c.json({ data: result });
    } catch (err) {
      await client.disconnect().catch(() => {});
      await processManager.shutdownAll().catch(() => {});
      return c.json(
        { error: 'dry_run_failed', message: err instanceof Error ? err.message : 'Dry run failed' },
        500,
      );
    }
  });

  app.get('/api/audit/status/:sessionId', (c) => {
    const sessionId = c.req.param('sessionId');
    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    session.lastUsed = Date.now();
    return c.json({
      data: {
        status: session.status,
        progress: session.progress,
        error: session.error,
        result: session.status === 'completed' ? session.result : undefined,
      },
    });
  });

  app.get('/api/audit/result/:sessionId', (c) => {
    const sessionId = c.req.param('sessionId');
    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    if (session.status !== 'completed' || !session.result) {
      return c.json({ error: 'not_ready', message: 'Scan not completed yet' }, 404);
    }

    session.lastUsed = Date.now();
    return c.json({ data: session.result });
  });

  app.post('/api/audit/stop/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ data: { stopped: true } });
    }

    try {
      await session.client.disconnect();
      await session.processManager.shutdownAll();
    } catch {
      // Best-effort cleanup
    }
    sessions.delete(sessionId);
    return c.json({ data: { stopped: true } });
  });
}
