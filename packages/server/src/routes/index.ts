import type { Hono } from 'hono';
import type { Database } from '../db/database.js';
import type { WebSocketHandler } from '../websocket.js';
import { serversRoutes } from './servers.js';
import { collectionsRoutes } from './collections.js';
import { runsRoutes } from './runs.js';
import { inspectRoutes } from './inspect.js';
import { auditRoutes } from './audit.js';
import { benchmarkRoutes } from './benchmark.js';
import { docsRoutes } from './docs.js';
import { scoreRoutes } from './score.js';

export function registerRoutes(app: Hono, db: Database, wsHandler?: WebSocketHandler): void {
  serversRoutes(app, db);
  collectionsRoutes(app, db);
  runsRoutes(app, db);
  inspectRoutes(app, wsHandler);
  auditRoutes(app, wsHandler);
  benchmarkRoutes(app, wsHandler);
  docsRoutes(app);
  scoreRoutes(app, wsHandler);
}
