import { serve } from '@hono/node-server';
import type { Hono } from 'hono';
import { WebSocketHandler } from './websocket.js';
import { Database } from './db/database.js';
import { createApp } from './app.js';
import { getPlatformInfo } from '@mcpspec/core';
import { join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

export interface StartServerOptions {
  port?: number;
  host?: string;
  uiDistPath?: string;
  dbPath?: string;
}

export interface ServerInstance {
  port: number;
  host: string;
  app: Hono;
  db: Database;
  wsHandler: WebSocketHandler;
  close: () => void;
}

export async function startServer(options: StartServerOptions = {}): Promise<ServerInstance> {
  const port = options.port ?? 6274;
  const host = options.host ?? '127.0.0.1';

  // Initialize database
  const dbPath = options.dbPath ?? join(getPlatformInfo().dataDir, 'mcpspec.db');
  const db = new Database(dbPath);
  await db.init();

  // Create Hono app
  const app = createApp({ db, uiDistPath: options.uiDistPath });

  // Create WebSocket handler
  const wsHandler = new WebSocketHandler();

  // Start HTTP server with WS upgrade
  const server = serve({ fetch: app.fetch, port, hostname: host }, (info) => {
    console.log(`MCPSpec server running at http://${host}:${info.port}`);
  });

  // Handle WebSocket upgrades
  (server as ReturnType<typeof serve>).on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url === '/ws') {
      wsHandler.handleUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  return {
    port,
    host,
    app,
    db,
    wsHandler,
    close: () => {
      wsHandler.closeAll();
      db.close();
      server.close();
    },
  };
}
