import type { Hono } from 'hono';
import type { Database } from '../db/database.js';
import { createServerSchema, updateServerSchema } from '@mcpspec/shared';
import { MCPClient, ProcessManagerImpl } from '@mcpspec/core';
import type { ServerConfig } from '@mcpspec/shared';

export function serversRoutes(app: Hono, db: Database): void {
  app.get('/api/servers', (c) => {
    const servers = db.listServers();
    return c.json({ data: servers, total: servers.length });
  });

  app.post('/api/servers', async (c) => {
    const body = await c.req.json();
    const parsed = createServerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }
    const server = db.createServer(parsed.data);
    return c.json({ data: server }, 201);
  });

  app.get('/api/servers/:id', (c) => {
    const server = db.getServer(c.req.param('id'));
    if (!server) return c.json({ error: 'not_found', message: 'Server not found' }, 404);
    return c.json({ data: server });
  });

  app.put('/api/servers/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateServerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }
    const server = db.updateServer(c.req.param('id'), parsed.data);
    if (!server) return c.json({ error: 'not_found', message: 'Server not found' }, 404);
    return c.json({ data: server });
  });

  app.delete('/api/servers/:id', (c) => {
    const deleted = db.deleteServer(c.req.param('id'));
    if (!deleted) return c.json({ error: 'not_found', message: 'Server not found' }, 404);
    return c.json({ data: { deleted: true } });
  });

  app.post('/api/servers/:id/test', async (c) => {
    const server = db.getServer(c.req.param('id'));
    if (!server) return c.json({ error: 'not_found', message: 'Server not found' }, 404);

    const processManager = new ProcessManagerImpl();
    const config: ServerConfig = {
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      url: server.url,
      env: server.env,
    };

    const client = new MCPClient({ serverConfig: config, processManager });
    try {
      await client.connect();
      const tools = await client.listTools();
      await client.disconnect();
      await processManager.shutdownAll();
      return c.json({ data: { connected: true, toolCount: tools.length } });
    } catch (err) {
      await processManager.shutdownAll();
      const message = err instanceof Error ? err.message : 'Connection failed';
      return c.json({ data: { connected: false, error: message } });
    }
  });
}
