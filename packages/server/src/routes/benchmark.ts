import type { Hono } from 'hono';
import { benchmarkStartSchema } from '@mcpspec/shared';
import type { BenchmarkResult, ServerConfig } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl, BenchmarkRunner } from '@mcpspec/core';
import type { WebSocketHandler } from '../websocket.js';
import { randomUUID } from 'node:crypto';

type BenchmarkStatus = 'connecting' | 'running' | 'completed' | 'error';

interface BenchmarkProgress {
  completedIterations: number;
  totalIterations: number;
  phase: 'warmup' | 'measuring';
}

interface BenchmarkSession {
  client: MCPClient;
  processManager: ProcessManagerImpl;
  status: BenchmarkStatus;
  progress: BenchmarkProgress;
  result?: BenchmarkResult;
  error?: string;
  lastUsed: number;
}

const sessions = new Map<string, BenchmarkSession>();
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

export function benchmarkRoutes(app: Hono, wsHandler?: WebSocketHandler): void {
  app.post('/api/benchmark/start', async (c) => {
    const body = await c.req.json();
    const parsed = benchmarkStartSchema.safeParse(body);
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

    const session: BenchmarkSession = {
      client: null as unknown as MCPClient,
      processManager,
      status: 'connecting',
      progress: { completedIterations: 0, totalIterations: parsed.data.iterations, phase: 'warmup' },
      lastUsed: Date.now(),
    };

    const client = new MCPClient({ serverConfig: config, processManager });
    session.client = client;
    sessions.set(sessionId, session);

    // Connect and start benchmark in background
    (async () => {
      try {
        await client.connect();
        session.status = 'running';

        const runner = new BenchmarkRunner();
        const result = await runner.run(
          client,
          parsed.data.tool,
          parsed.data.toolArgs,
          {
            iterations: parsed.data.iterations,
            warmupIterations: parsed.data.warmup,
            timeout: parsed.data.timeout,
          },
          {
            onWarmupStart: () => {
              session.progress.phase = 'warmup';
              session.lastUsed = Date.now();
              wsHandler?.broadcast(`benchmark:${sessionId}`, 'warmup-start', {});
            },
            onIterationComplete: (iteration, total, durationMs) => {
              session.progress.phase = 'measuring';
              session.progress.completedIterations = iteration;
              session.progress.totalIterations = total;
              session.lastUsed = Date.now();
              wsHandler?.broadcast(`benchmark:${sessionId}`, 'iteration', {
                iteration,
                duration: durationMs,
                success: true,
              });
            },
            onComplete: (benchResult) => {
              session.result = benchResult;
              session.status = 'completed';
              session.lastUsed = Date.now();
              wsHandler?.broadcast(`benchmark:${sessionId}`, 'completed', { result: benchResult });
            },
          },
        );

        // In case onComplete wasn't called (shouldn't happen, but be safe)
        if (session.status !== 'completed') {
          session.result = result;
          session.status = 'completed';
          session.lastUsed = Date.now();
        }
      } catch (err) {
        session.status = 'error';
        session.error = err instanceof Error ? err.message : 'Benchmark failed';
        session.lastUsed = Date.now();
        wsHandler?.broadcast(`benchmark:${sessionId}`, 'error', { message: session.error });
      }
    })();

    return c.json({ data: { sessionId } });
  });

  app.get('/api/benchmark/status/:sessionId', (c) => {
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

  app.get('/api/benchmark/result/:sessionId', (c) => {
    const sessionId = c.req.param('sessionId');
    const session = sessions.get(sessionId);
    if (!session) {
      return c.json({ error: 'not_found', message: 'Session not found or expired' }, 404);
    }

    if (session.status !== 'completed' || !session.result) {
      return c.json({ error: 'not_ready', message: 'Benchmark not completed yet' }, 404);
    }

    session.lastUsed = Date.now();
    return c.json({ data: session.result });
  });

  app.get('/api/benchmark/tools/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
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

  app.post('/api/benchmark/stop/:sessionId', async (c) => {
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
