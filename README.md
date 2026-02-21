# MCPSpec

**The complete testing, debugging, and quality platform for MCP servers.**

MCPSpec is Postman for [Model Context Protocol](https://modelcontextprotocol.io) — test collections, interactive inspection, security auditing, performance benchmarking, auto-generated docs, and a quality scoring system. Works from the CLI, in CI/CD, or through a full web UI.

```
mcpspec test ./collection.yaml        # Run tests
mcpspec inspect "npx my-server"       # Interactive REPL
mcpspec audit "npx my-server"         # Security scan
mcpspec bench "npx my-server"         # Performance benchmark
mcpspec score "npx my-server"         # Quality rating (0-100)
mcpspec docs "npx my-server"          # Auto-generate documentation
mcpspec ui                            # Launch web dashboard
```

---

## Why MCPSpec?

MCP servers expose tools (file access, database queries, API calls) to AI assistants. Before shipping a server, you need to answer:

- **Does it work?** — Do tools return correct results? Do they handle bad input?
- **Is it safe?** — Can inputs cause path traversal, injection, or information leaks?
- **Is it fast?** — What's the P95 latency? Can it handle load?
- **Is it documented?** — Do tools have descriptions and proper schemas?

MCPSpec answers all of these with a single tool.

---

## Installation

```bash
npm install -g mcpspec
```

Requires Node.js 22+.

---

## Quick Start

### 1. Initialize a project

```bash
mcpspec init --template standard
```

### 2. Write a test collection

```yaml
name: Filesystem Server Tests
server: npx @modelcontextprotocol/server-filesystem /tmp

tests:
  - name: Read a file
    call: read_file
    with:
      path: /tmp/test.txt
    expect:
      - exists: $.content

  - name: Handle missing file
    call: read_file
    with:
      path: /tmp/nonexistent.txt
    expectError: true
```

### 3. Run it

```bash
mcpspec test ./collection.yaml
```

```
MCPSpec running Filesystem Server Tests (2 tests)

  ✓ Read a file (124ms)
  ✓ Handle missing file (89ms)

  Tests:  2 passed (2 total)
  Time:   0.45s
```

---

## Commands

### `mcpspec test` — Run Test Collections

```bash
mcpspec test                              # Uses ./mcpspec.yaml
mcpspec test ./tests.yaml                 # Specific file
mcpspec test --env staging                # Use staging variables
mcpspec test --tag @smoke                 # Filter by tag
mcpspec test --parallel 4                 # Parallel execution
mcpspec test --reporter junit --output results.xml  # JUnit for CI
mcpspec test --baseline main              # Compare against saved baseline
mcpspec test --watch                      # Re-run on file changes
mcpspec test --ci                         # CI mode (no colors, strict exit codes)
```

**Reporters:** `console`, `json`, `junit`, `html`, `tap`

### `mcpspec inspect` — Interactive REPL

```bash
mcpspec inspect "npx @modelcontextprotocol/server-filesystem /tmp"
```

| Command | Description |
|---------|-------------|
| `.tools` | List all tools |
| `.resources` | List all resources |
| `.call <tool> <json>` | Call a tool |
| `.schema <tool>` | Show input schema |
| `.info` | Server info |
| `.exit` | Disconnect |

### `mcpspec audit` — Security Scanner

Scans for 6 categories of vulnerabilities:

```bash
mcpspec audit "npx my-server"                       # Passive (safe, read-only)
mcpspec audit "npx my-server" --mode active          # Active (test payloads)
mcpspec audit "npx my-server" --mode aggressive      # Aggressive probing
mcpspec audit "npx my-server" --fail-on medium       # Fail CI on medium+ findings
```

| Rule | What It Detects |
|------|-----------------|
| Path Traversal | `../../etc/passwd` style attacks |
| Input Validation | Missing/malformed input handling |
| Resource Exhaustion | Crash-inducing large payloads |
| Auth Bypass | Access control circumvention |
| Injection | SQL/command injection in tool inputs |
| Information Disclosure | Leaked paths, stack traces, secrets |

Active and aggressive modes send potentially harmful payloads and require confirmation (or `--acknowledge-risk` for CI).

### `mcpspec bench` — Performance Benchmark

```bash
mcpspec bench "npx my-server"                        # Default: 100 iterations
mcpspec bench "npx my-server" --iterations 500        # More iterations
mcpspec bench "npx my-server" --tool read_file        # Specific tool
mcpspec bench "npx my-server" --args '{"path":"/tmp/f"}'  # With arguments
```

Reports min, max, mean, median, P95, P99, standard deviation, and throughput (calls/sec).

### `mcpspec score` — MCP Quality Score

Calculates a 0–100 quality rating:

```bash
mcpspec score "npx my-server"
mcpspec score "npx my-server" --badge badge.svg      # Generate SVG badge
```

```
  MCP Score
  ────────────────────────────────────────
  Documentation    ████████████████████ 100/100
  Schema Quality   ████████████████████ 100/100
  Error Handling   ██████████████░░░░░░  70/100
  Performance      ████████████████░░░░  80/100
  Security         ████████████████████ 100/100

  Overall: 91/100
```

| Category (weight) | What It Measures |
|--------------------|-----------------|
| Documentation (25%) | % of tools/resources with descriptions |
| Schema Quality (25%) | Proper `type`, `properties`, `required` in input schemas |
| Error Handling (20%) | Returns `isError: true` for bad input vs. crashing |
| Performance (15%) | Median response latency |
| Security (15%) | Findings from a passive security scan |

The `--badge` flag generates a shields.io-style SVG for your README.

### `mcpspec docs` — Documentation Generator

```bash
mcpspec docs "npx my-server"                          # Markdown to stdout
mcpspec docs "npx my-server" --format html             # HTML output
mcpspec docs "npx my-server" --output ./docs           # Write to directory
```

Connects to the server, introspects all tools and resources, and generates documentation with tool descriptions, input schemas, and resource tables.

### `mcpspec compare` / `mcpspec baseline` — Regression Detection

```bash
mcpspec baseline save main                 # Save current run as "main"
mcpspec baseline list                      # List saved baselines
mcpspec compare --baseline main            # Compare latest run against baseline
mcpspec compare <run-id-1> <run-id-2>      # Compare two specific runs
```

### `mcpspec init` — Project Scaffolding

```bash
mcpspec init                               # Current directory
mcpspec init ./my-project                  # Specific directory
mcpspec init --template minimal            # Minimal starter
mcpspec init --template standard           # Standard (recommended)
mcpspec init --template full               # Full with environments
```

### `mcpspec ui` — Web Dashboard

```bash
mcpspec ui                                 # Opens localhost:6274
mcpspec ui --port 8080                     # Custom port
```

Full web interface with:
- Server management and connection testing
- Collection editor with YAML validation
- Test run history with drill-down
- Interactive tool inspector
- Security audit with live progress
- Performance benchmarking with real-time stats
- Documentation generator with copy/download
- MCP Score calculator with category breakdown
- Dark mode

---

## Collection Format

### Simple Format

```yaml
name: My Tests
server: npx my-mcp-server

tests:
  - name: Basic call
    call: tool_name
    with:
      param: value
    expect:
      - exists: $.result
```

### Advanced Format

```yaml
schemaVersion: "1.0"
name: Comprehensive Tests
description: Full test suite

server:
  transport: stdio
  command: npx
  args: ["my-mcp-server"]
  env:
    NODE_ENV: test

environments:
  dev:
    variables:
      BASE_PATH: /tmp/dev
  prod:
    variables:
      BASE_PATH: /data

defaultEnvironment: dev

tests:
  - id: test-1
    name: Get data
    tags: [smoke, api]
    timeout: 5000
    retries: 2
    call: get_data
    with:
      path: "{{BASE_PATH}}/file.txt"
    assertions:
      - type: schema
      - type: exists
        path: $.content
      - type: matches
        path: $.content
        pattern: "^Hello"
      - type: latency
        maxMs: 1000
      - type: expression
        expr: "response.content.length > 0"
    extract:
      - name: fileContent
        path: $.content
```

### Assertion Types

| Type | Description | Example |
|------|-------------|---------|
| `schema` | Response is valid | `type: schema` |
| `equals` | Exact match | `path: $.id, value: 123` |
| `contains` | Array/string contains | `path: $.tags, value: "active"` |
| `exists` | Path exists | `path: $.name` |
| `matches` | Regex match | `path: $.email, pattern: ".*@.*"` |
| `type` | Type check | `path: $.count, expected: number` |
| `length` | Length check | `path: $.items, operator: gt, value: 0` |
| `latency` | Response time | `maxMs: 1000` |
| `mimeType` | Content type | `expected: "image/png"` |
| `expression` | Safe expression | `expr: "response.total > 0"` |

Expressions use [expr-eval](https://github.com/silentmatt/expr-eval) — comparisons, logical operators, property access, and math. No arbitrary code execution.

---

## CI/CD Integration

### GitHub Actions

```yaml
name: MCP Server Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm install -g mcpspec

      - name: Run tests
        run: mcpspec test --ci --reporter junit --output results.xml

      - name: Security audit
        run: mcpspec audit "npx my-server" --mode passive --fail-on high

      - uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: results.xml
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Test failure |
| 2 | Runtime error |
| 3 | Configuration error |
| 4 | Connection error |
| 5 | Timeout |
| 6 | Security findings above threshold |
| 7 | Validation error |
| 130 | Interrupted (Ctrl+C) |

---

## Architecture

MCPSpec is a TypeScript monorepo:

| Package | Description |
|---------|-------------|
| `@mcpspec/shared` | Types, Zod schemas, constants |
| `@mcpspec/core` | MCP client, test runner, assertions, security scanner, profiler, doc generator, scorer |
| `@mcpspec/cli` | 10 CLI commands built with Commander.js |
| `@mcpspec/server` | Hono HTTP server with REST API + WebSocket for real-time updates |
| `@mcpspec/ui` | React SPA with TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui |

Key design decisions:
- **Local-first** — works offline, no account needed, server binds to localhost only
- **Safe by default** — FAILSAFE YAML parsing, secret masking, process cleanup on SIGINT/SIGTERM
- **sql.js** for storage — WebAssembly SQLite, no native compilation required
- **Transports** — stdio, SSE, and streamable-http (SSE/HTTP lazy-loaded for code splitting)

---

## Development

```bash
git clone https://github.com/mcpspec/mcpspec.git
cd mcpspec
pnpm install
pnpm build
pnpm test      # 259 tests across core + server
```

Run the CLI locally:

```bash
node packages/cli/dist/index.js test ./examples/collections/simple.yaml
```

Launch the UI in dev mode:

```bash
node packages/cli/dist/index.js ui
```

---

## License

MIT
