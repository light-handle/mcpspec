import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export { createApp } from './app.js';
export type { AppOptions } from './app.js';
export { startServer } from './start.js';
export type { StartServerOptions, ServerInstance } from './start.js';
export { Database } from './db/database.js';
export { WebSocketHandler } from './websocket.js';

const __serverDir = dirname(fileURLToPath(import.meta.url));
export const UI_DIST_PATH = join(__serverDir, '..', 'ui-dist');
