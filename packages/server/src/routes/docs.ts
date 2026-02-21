import type { Hono } from 'hono';
import { docsGenerateSchema } from '@mcpspec/shared';
import type { ServerConfig } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl, DocGenerator } from '@mcpspec/core';

export function docsRoutes(app: Hono): void {
  app.post('/api/docs/generate', async (c) => {
    const body = await c.req.json();
    const parsed = docsGenerateSchema.safeParse(body);
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

    const client = new MCPClient({ serverConfig: config, processManager });

    try {
      await client.connect();
      const generator = new DocGenerator();
      const content = await generator.generate(client, {
        format: parsed.data.format as 'markdown' | 'html',
      });

      await client.disconnect();
      await processManager.shutdownAll();

      return c.json({ data: { content, format: parsed.data.format } });
    } catch (err) {
      await client.disconnect().catch(() => {});
      await processManager.shutdownAll().catch(() => {});
      return c.json(
        { error: 'generation_error', message: err instanceof Error ? err.message : 'Failed to generate docs' },
        500,
      );
    }
  });
}
