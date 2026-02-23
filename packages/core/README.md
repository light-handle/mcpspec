# @mcpspec/core

Core engine for [MCPSpec](https://www.npmjs.com/package/mcpspec) — the reliability platform for MCP servers. MCP client, test runner, security scanner (including Tool Poisoning detection), performance profiler, documentation generator, quality scorer, recording/replay, and mock server generator.

> **For CLI usage, install [`mcpspec`](https://www.npmjs.com/package/mcpspec) instead.** This package is for programmatic use — embedding MCPSpec capabilities in your own tools.

## Installation

```bash
npm install @mcpspec/core
```

## Usage

### Connect to an MCP server

```typescript
import { MCPClient } from '@mcpspec/core';

const client = new MCPClient({
  transport: 'stdio',
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('read_file', { path: '/tmp/test.txt' });
await client.disconnect();
```

### Run a test collection

```typescript
import { TestRunner, ConsoleReporter, loadYamlSafely } from '@mcpspec/core';
import { readFileSync } from 'node:fs';

const yaml = readFileSync('./collection.yaml', 'utf-8');
const collection = loadYamlSafely(yaml);

const runner = new TestRunner();
const results = await runner.run(collection, {
  reporter: new ConsoleReporter(),
});

console.log(`${results.summary.passed}/${results.summary.total} passed`);
```

## Exports

### Client

- `MCPClient` — Core MCP client (stdio, SSE, streamable-http transports)
- `MCPClientInterface` — Abstract interface for swappability
- `ConnectionManager` — Connection state machine with reconnection
- `LoggingTransport` — Protocol message logging

### Process Management

- `ProcessManagerImpl` — Spawn, monitor, and cleanup MCP server processes
- `ProcessRegistry` — Track all managed processes
- `registerCleanupHandlers` — Graceful shutdown on SIGINT/SIGTERM

### Testing

- `TestRunner` — Orchestrates collection execution
- `TestExecutor` — Executes individual test cases
- `TestScheduler` — Parallel execution with dependency resolution

### Assertions

Evaluated via `TestExecutor` — schema, equals, contains, exists, matches, type, length, latency, mimeType, expression (safe expr-eval).

### Reporters

- `ConsoleReporter` — Terminal output with colors
- `JsonReporter` — JSON output
- `JunitReporter` — JUnit XML for CI
- `HtmlReporter` — Standalone HTML report
- `TapReporter` — TAP protocol

### Comparison

- `BaselineStore` — Save and load test run baselines
- `ResultDiffer` — Diff two test runs

### Security

- `SecurityScanner` — Orchestrates security audits
- `ScanConfig` — Safety controls and mode filtering
- Rules: `PathTraversalRule`, `InputValidationRule`, `ResourceExhaustionRule`, `AuthBypassRule`, `InjectionRule`, `InformationDisclosureRule`, `ToolPoisoningRule`, `ExcessiveAgencyRule`
- `getSafePayloads`, `getPlatformPayloads`, `getPayloadsForMode` — Payload management

### Performance

- `Profiler`, `computeStats` — Timing and statistics
- `BenchmarkRunner` — Iterative benchmarking with warmup
- `WaterfallGenerator` — Waterfall chart data

### Documentation

- `DocGenerator` — Orchestrates doc generation from server introspection
- `MarkdownGenerator` — Markdown output
- `HtmlDocGenerator` — HTML output

### Scoring

- `MCPScoreCalculator` — 0–100 quality score across 5 categories; schema quality uses opinionated linting (property types, descriptions, constraints, naming conventions)
- `BadgeGenerator` — shields.io-style SVG badges

### Recording & Replay

- `RecordingStore` — Save, load, list, and delete session recordings
- `RecordingReplayer` — Replay recorded steps against a live server
- `RecordingDiffer` — Diff original recording vs replayed results (matched/changed/added/removed)

### Mock Server

- `MockMCPServer` — Start a mock MCP server from a recording (stdio transport, drop-in replacement)
- `ResponseMatcher` — Match incoming tool calls to recorded responses (`match` or `sequential` mode)
- `MockGenerator` — Generate standalone `.js` mock server files (only requires `@modelcontextprotocol/sdk`)

### Utilities

- `loadYamlSafely` — FAILSAFE_SCHEMA YAML parsing
- `SecretMasker` — Redact secrets from output
- `resolveVariables` — Template variable resolution
- `queryJsonPath` — JSONPath queries
- `getPlatformInfo` — Cross-platform data/config directories
- `RateLimiter` — Throttle MCP calls
- `MCPSpecError`, `formatError` — Structured error handling

## License

MIT
