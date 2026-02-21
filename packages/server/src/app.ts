import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { localhostOnly } from './middleware/localhost-only.js';
import { authMiddleware } from './middleware/auth.js';
import { registerRoutes } from './routes/index.js';
import type { Database } from './db/database.js';
import type { WebSocketHandler } from './websocket.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export interface AppOptions {
  db: Database;
  uiDistPath?: string;
  wsHandler?: WebSocketHandler;
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono();

  // Middleware
  app.use('*', localhostOnly());
  app.use('*', cors({ origin: '*' }));
  app.use('/api/*', authMiddleware());

  // API routes
  registerRoutes(app, options.db, options.wsHandler);

  // Static file serving (SPA fallback)
  if (options.uiDistPath) {
    app.get('*', (c) => {
      const urlPath = new URL(c.req.url).pathname;

      // Try serving the exact file
      const filePath = join(options.uiDistPath!, urlPath === '/' ? 'index.html' : urlPath);
      if (existsSync(filePath) && !filePath.endsWith('/')) {
        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
        const content = readFileSync(filePath);
        return c.body(content, 200, { 'Content-Type': mime });
      }

      // SPA fallback: serve index.html for non-file routes
      const indexPath = join(options.uiDistPath!, 'index.html');
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath, 'utf-8');
        return c.html(content);
      }

      return c.json({ error: 'not_found', message: 'UI not found' }, 404);
    });
  }

  return app;
}
