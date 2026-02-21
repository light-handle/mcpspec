import type { Hono } from 'hono';
import { scoreCalculateSchema } from '@mcpspec/shared';
import type { ServerConfig, MCPScore } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl, MCPScoreCalculator, BadgeGenerator } from '@mcpspec/core';
import type { WebSocketHandler } from '../websocket.js';
import { randomUUID } from 'node:crypto';

export function scoreRoutes(app: Hono, wsHandler?: WebSocketHandler): void {
  app.post('/api/score/calculate', async (c) => {
    const body = await c.req.json();
    const parsed = scoreCalculateSchema.safeParse(body);
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
      const calculator = new MCPScoreCalculator();
      const score = await calculator.calculate(client, {
        onCategoryStart: (category) => {
          wsHandler?.broadcast(`score:${sessionId}`, 'category-start', { category });
        },
        onCategoryComplete: (category, categoryScore) => {
          wsHandler?.broadcast(`score:${sessionId}`, 'category-complete', { category, score: categoryScore });
        },
      });

      await client.disconnect();
      await processManager.shutdownAll();

      return c.json({ data: { sessionId, score } });
    } catch (err) {
      await client.disconnect().catch(() => {});
      await processManager.shutdownAll().catch(() => {});
      return c.json(
        { error: 'score_error', message: err instanceof Error ? err.message : 'Failed to calculate score' },
        500,
      );
    }
  });

  app.post('/api/score/badge', async (c) => {
    const body = await c.req.json();
    const score = body.score as MCPScore | undefined;
    if (!score || typeof score.overall !== 'number') {
      return c.json({ error: 'validation_error', message: 'Invalid score object' }, 400);
    }

    const generator = new BadgeGenerator();
    const svg = generator.generate(score);
    return c.json({ data: { svg } });
  });
}
