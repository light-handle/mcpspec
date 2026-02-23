# @mcpspec/server

HTTP server and web UI backend for [MCPSpec](https://www.npmjs.com/package/mcpspec) — the reliability platform for MCP servers. Provides a REST API, WebSocket real-time events, and serves the MCPSpec web dashboard.

> **For CLI usage, install [`mcpspec`](https://www.npmjs.com/package/mcpspec) instead.** This package is for embedding the MCPSpec server in your own applications.

## Installation

```bash
npm install @mcpspec/server
```

## Usage

```typescript
import { startServer } from '@mcpspec/server';

const server = await startServer({
  port: 6274,       // default
  host: '127.0.0.1', // localhost-only by default
});

// server.port, server.host, server.app, server.db, server.wsHandler
// server.close() to shut down
```

## Exports

- `startServer(options?)` — Start the HTTP server with WebSocket support
- `createApp(options)` — Create the Hono app without starting a server (for testing/embedding)
- `Database` — sql.js (WASM SQLite) database for storing servers, collections, runs, recordings, and audit results
- `WebSocketHandler` — Real-time event broadcasting over WebSocket
- `UI_DIST_PATH` — Path to the bundled web UI static files

### Types

- `StartServerOptions` — `{ port?, host?, uiDistPath?, dbPath? }`
- `ServerInstance` — `{ port, host, app, db, wsHandler, close() }`
- `AppOptions` — Options for `createApp`

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/servers` | List saved servers |
| POST | `/api/servers` | Save a server connection |
| GET | `/api/servers/:id` | Get server details |
| PUT | `/api/servers/:id` | Update server |
| DELETE | `/api/servers/:id` | Delete server |
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Save a collection |
| GET | `/api/collections/:id` | Get collection |
| PUT | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection |
| GET | `/api/runs` | List test runs |
| POST | `/api/runs` | Trigger a test run |
| GET | `/api/runs/:id` | Get run details |
| POST | `/api/inspect/connect` | Start inspect session |
| POST | `/api/inspect/call` | Call a tool in session |
| POST | `/api/inspect/disconnect` | End inspect session |
| POST | `/api/inspect/save-recording` | Save session as recording |
| GET | `/api/recordings` | List recordings |
| GET | `/api/recordings/:id` | Get recording |
| POST | `/api/recordings` | Save a recording |
| DELETE | `/api/recordings/:id` | Delete recording |
| POST | `/api/recordings/:id/replay` | Replay recording against server |
| POST | `/api/audit` | Start security audit |
| POST | `/api/benchmark` | Start benchmark |
| POST | `/api/docs/generate` | Generate documentation |
| POST | `/api/score/calculate` | Calculate MCP Score |

## WebSocket

Connect to `ws://localhost:6274/ws` for real-time events.

```typescript
// Subscribe to events
ws.send(JSON.stringify({ type: 'subscribe', channel: 'run:<id>' }));

// Receive events
// { type: 'event', channel: 'run:<id>', event: 'test-completed', data: {...} }
```

Channels: `server:<id>`, `run:<id>`, `scan:<id>`, `benchmark:<id>`

## License

MIT
