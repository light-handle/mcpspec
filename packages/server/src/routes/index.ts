import type { Hono } from 'hono';
import type { Database } from '../db/database.js';
import type { WebSocketHandler } from '../websocket.js';
import { serversRoutes } from './servers.js';
import { collectionsRoutes } from './collections.js';
import { runsRoutes } from './runs.js';
import { inspectRoutes } from './inspect.js';

export function registerRoutes(app: Hono, db: Database, wsHandler?: WebSocketHandler): void {
  serversRoutes(app, db);
  collectionsRoutes(app, db);
  runsRoutes(app, db);
  inspectRoutes(app, wsHandler);
}
