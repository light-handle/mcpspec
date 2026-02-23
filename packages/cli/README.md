<p align="center">
  <img src="mcpspec.png" alt="MCPSpec" width="200" />
</p>

<h1 align="center">MCPSpec</h1>

<p align="center">
  <strong>The complete testing platform for MCP servers</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mcpspec"><img src="https://img.shields.io/npm/v/mcpspec.svg?style=flat&colorA=18181B&colorB=3b82f6" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/mcpspec"><img src="https://img.shields.io/npm/dm/mcpspec.svg?style=flat&colorA=18181B&colorB=3b82f6" alt="npm downloads" /></a>
  <a href="https://github.com/light-handle/mcpspec/blob/main/LICENSE"><img src="https://img.shields.io/github/license/light-handle/mcpspec?style=flat&colorA=18181B&colorB=3b82f6" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-3b82f6?style=flat&colorA=18181B" alt="node 22+" />
</p>

<p align="center">
  Test collections, interactive inspection, security auditing, performance benchmarking, auto-generated docs, and quality scoring for <a href="https://modelcontextprotocol.io">Model Context Protocol</a> servers. Works from the CLI, in CI/CD, or through a full web UI.
</p>

---

```bash
mcpspec test ./collection.yaml        # Run tests
mcpspec inspect "npx my-server"       # Interactive REPL
mcpspec audit "npx my-server"         # Security scan (8 rules)
mcpspec bench "npx my-server"         # Performance benchmark
mcpspec score "npx my-server"         # Quality rating (0-100)
mcpspec docs "npx my-server"          # Auto-generate documentation
mcpspec record start "npx my-server"  # Record & replay sessions
mcpspec mock my-recording             # Start mock server from recording
mcpspec ci-init --platform github     # Generate CI pipeline config
mcpspec ui                            # Launch web dashboard
```

## Quick Start

```bash
# 1. Install
npm install -g mcpspec

# 2. Scaffold a project
mcpspec init --template standard

# 3. Run tests
mcpspec test

# 4. Add CI gating (optional)
mcpspec ci-init
```

## Features

### Test Collections

Write tests in YAML with 10 assertion types, environments, variable extraction, tags, retries, and parallel execution.

```yaml
name: Filesystem Tests
server: npx @modelcontextprotocol/server-filesystem /tmp

tests:
  - name: Read a file
    call: read_file
    with:
      path: /tmp/test.txt
    expect:
      - exists: $.content
      - type: [$.content, string]

  - name: Handle missing file
    call: read_file
    with:
      path: /tmp/nonexistent.txt
    expectError: true
```

**Advanced features:**

```yaml
schemaVersion: "1.0"
name: Advanced Tests

server:
  command: npx
  args: ["my-mcp-server"]
  env:
    NODE_ENV: test

environments:
  dev:
    variables:
      BASE_PATH: /tmp/dev
  staging:
    variables:
      BASE_PATH: /tmp/staging

defaultEnvironment: dev

tests:
  - id: create-data
    name: Create data
    tags: [smoke, write]
    timeout: 5000
    retries: 2
    call: create_item
    with:
      name: "test-item"
    assertions:
      - type: schema
      - type: exists
        path: $.id
      - type: latency
        maxMs: 1000
    extract:
      - name: itemId
        path: $.id

  - id: verify-data
    name: Verify created data
    tags: [smoke, read]
    call: get_item
    with:
      id: "{{itemId}}"
    assertions:
      - type: equals
        path: $.name
        value: "test-item"
      - type: expression
        expr: "response.id == itemId"
```

**Assertion types:**

| Type | Description | Example |
|------|-------------|---------|
| `schema` | Validate response structure | `type: schema` |
| `equals` | Exact match (deep comparison) | `path: $.id, value: 123` |
| `contains` | Array or string contains value | `path: $.tags, value: "active"` |
| `exists` | Path exists and is not null | `path: $.name` |
| `matches` | Regex pattern match | `path: $.email, pattern: ".*@.*"` |
| `type` | Type check | `path: $.count, expected: number` |
| `length` | Array/string length | `path: $.items, operator: gt, value: 0` |
| `latency` | Response time threshold | `maxMs: 1000` |
| `mimeType` | Content type validation | `expected: "image/png"` |
| `expression` | Safe expression eval | `expr: "response.total > 0"` |

Expressions use [expr-eval](https://github.com/silentmatt/expr-eval) — comparisons, logical operators, property access, math. No arbitrary code execution.

**Shorthand format** for common assertions:

```yaml
expect:
  - exists: $.field
  - equals: [$.id, 123]
  - contains: [$.tags, "active"]
  - matches: [$.email, ".*@.*"]
```

**Run options:**

```bash
mcpspec test ./tests.yaml              # Specific file
mcpspec test --env staging             # Switch environment
mcpspec test --tag @smoke              # Filter by tag
mcpspec test --parallel 4              # Parallel execution
mcpspec test --reporter junit --output results.xml
mcpspec test --baseline main           # Compare against baseline
mcpspec test --watch                   # Re-run on file changes
mcpspec test --ci                      # CI mode (no colors)
```

**Reporters:** console (default), json, junit, html, tap.

---

### Interactive Inspector

Connect to any MCP server and explore its capabilities in a live REPL.

```bash
mcpspec inspect "npx @modelcontextprotocol/server-filesystem /tmp"
```

| Command | Description |
|---------|-------------|
| `.tools` | List all available tools with descriptions |
| `.resources` | List all available resources (URIs) |
| `.call <tool> <json>` | Call a tool with JSON input |
| `.schema <tool>` | Display tool's JSON Schema input spec |
| `.info` | Show server info (name, version, capabilities) |
| `.help` | Show help |
| `.exit` | Disconnect and exit |

```
mcpspec> .tools
  read_file        Read complete contents of a file
  write_file       Create or overwrite a file
  list_directory   List directory contents

mcpspec> .call read_file {"path": "/tmp/test.txt"}
{
  "content": "Hello, world!"
}
```

---

### Security Audit

8 security rules covering traditional vulnerabilities and LLM-specific threats. A safety filter auto-skips destructive tools, and `--dry-run` previews targets before scanning.

```bash
mcpspec audit "npx my-server"                        # Passive (safe)
mcpspec audit "npx my-server" --mode active           # Active probing
mcpspec audit "npx my-server" --fail-on medium        # CI gate
mcpspec audit "npx my-server" --exclude-tools delete  # Skip tools
mcpspec audit "npx my-server" --dry-run               # Preview targets
```

**Security rules:**

| Rule | Mode | What it detects |
|------|------|-----------------|
| Path Traversal | Passive | `../../etc/passwd` style directory escape attacks |
| Input Validation | Passive | Missing constraints (enum, pattern, min/max) on tool inputs |
| Info Disclosure | Passive | Leaked paths, stack traces, API keys in tool descriptions |
| Tool Poisoning | Passive | LLM prompt injection in descriptions, hidden Unicode, cross-tool manipulation |
| Excessive Agency | Passive | Destructive tools without confirmation params, arbitrary code execution |
| Resource Exhaustion | Active | Unbounded loops, large allocations, recursion |
| Auth Bypass | Active | Missing auth checks, hardcoded credentials |
| Injection | Active | SQL and command injection in tool inputs |

**Scan modes:**

- **Passive** (default) — 5 rules, analyzes metadata only, no tool calls. Safe for production.
- **Active** — All 8 rules, sends test payloads. Requires confirmation prompt.
- **Aggressive** — All 8 rules with more exhaustive probing. Requires confirmation prompt.

Active/aggressive modes auto-skip tools matching destructive patterns (`delete_*`, `drop_*`, `destroy_*`, etc.) and require explicit confirmation unless `--acknowledge-risk` is passed.

Each finding includes severity (info/low/medium/high/critical), description, evidence, and remediation advice.

---

### Recording & Replay

Record inspector sessions, save them, and replay against the same or different server versions. Diff output highlights regressions.

```bash
# Record a session
mcpspec record start "npx my-server"
mcpspec> .call get_user {"id": "1"}
mcpspec> .call list_items {}
mcpspec> .save my-session

# Later: replay against new server version
mcpspec record replay my-session "npx my-server-v2"
```

**Replay output:**

```
Replaying 3 steps against my-server-v2...

  1/3 get_user............. [OK] 42ms
  2/3 list_items........... [CHANGED] 38ms
  3/3 create_item.......... [OK] 51ms

Summary: 2 matched, 1 changed, 0 added, 0 removed
```

**Manage recordings:**

```bash
mcpspec record list                    # List saved recordings
mcpspec record delete my-session       # Delete a recording
```

Recordings are stored in `~/.mcpspec/recordings/` and include tool names, inputs, outputs, timing, and error states for each step.

---

### Mock Server

Turn any recording into a mock MCP server — a drop-in replacement for the real server. Useful for CI/CD without real dependencies, offline development, and deterministic tests.

```bash
# Start mock server from a recording (stdio transport)
mcpspec mock my-api

# Use as a server in test collections
mcpspec test --server "mcpspec mock my-api" ./tests.yaml

# Generate standalone .js file (only needs @modelcontextprotocol/sdk)
mcpspec mock my-api --generate ./mock-server.js
node mock-server.js
```

**Matching modes:**

| Mode | Behavior |
|------|----------|
| `match` (default) | Exact input match first, then next queued response per tool |
| `sequential` | Tape/cassette style — responses served in recorded order |

**Options:**

```bash
mcpspec mock my-api --mode sequential       # Tape-style matching
mcpspec mock my-api --latency original      # Simulate original response times
mcpspec mock my-api --latency 100           # Fixed 100ms delay
mcpspec mock my-api --on-missing empty      # Return empty instead of error for unrecorded tools
```

The generated standalone file embeds the recording data and matching logic — commit it to your repo for portable, dependency-light mock servers.

---

### Performance Benchmarks

Measure latency and throughput with statistical analysis across hundreds of iterations.

```bash
mcpspec bench "npx my-server"                         # 100 iterations
mcpspec bench "npx my-server" --iterations 500
mcpspec bench "npx my-server" --tool read_file
mcpspec bench "npx my-server" --args '{"path":"/tmp/f"}'
mcpspec bench "npx my-server" --warmup 10
```

**Output:**

```
Benchmarking read_file (100 iterations, 5 warmup)...

  Latency
  ────────────────────────────
  Min        12.34ms
  Max        89.21ms
  Mean       34.56ms
  Median     31.22ms
  P95        67.89ms
  P99        82.45ms
  Std Dev    15.23ms

  Throughput: 28.94 calls/sec
  Errors:     0
```

Warmup iterations (default: 5) are excluded from measurements. The profiler uses `performance.now()` for high-resolution timing.

---

### MCP Score

A 0-100 quality rating across 5 weighted categories with opinionated schema linting.

```bash
mcpspec score "npx my-server"
mcpspec score "npx my-server" --badge badge.svg       # Generate SVG badge
mcpspec score "npx my-server" --min-score 80          # Fail if below threshold
```

**Scoring categories:**

| Category (weight) | What it measures |
|--------------------|-----------------|
| Documentation (25%) | Percentage of tools and resources with descriptions |
| Schema Quality (25%) | Property types, descriptions, required fields, constraints (enum/pattern/min/max), naming conventions |
| Error Handling (20%) | Structured error responses (`isError: true`) vs. crashes on bad input |
| Responsiveness (15%) | Median latency: <100ms = 100, <500ms = 80, <1s = 60, <5s = 40 |
| Security (15%) | Findings from passive security scan: 0 = 100, <=2 = 70, <=5 = 40 |

Schema quality uses 6 sub-criteria: structure (20%), property types (20%), descriptions (20%), required fields (15%), constraints (15%), naming conventions (10%).

The `--badge` flag generates a shields.io-style SVG badge for your README.

---

### Doc Generator

Auto-generate Markdown or HTML documentation from server introspection. Zero manual writing.

```bash
mcpspec docs "npx my-server"                   # Markdown to stdout
mcpspec docs "npx my-server" --format html      # HTML output
mcpspec docs "npx my-server" --output ./docs    # Write to directory
```

Generated docs include: server name/version/description, all tools with their input schemas, and all resources with URIs and descriptions.

---

### Web Dashboard

A full React UI for managing servers, running tests, viewing audit results, and more. Dark mode included.

```bash
mcpspec ui                    # Opens localhost:6274
mcpspec ui --port 8080        # Custom port
mcpspec ui --no-open          # Don't auto-open browser
```

**Pages:**

| Page | What it does |
|------|-------------|
| Dashboard | Overview of servers, collections, recent runs |
| Servers | Connect and manage MCP server connections |
| Collections | Create and edit YAML test collections |
| Runs | View test run history and results |
| Inspector | Interactive tool calling with schema forms and protocol logging |
| Audit | Run security scans and view findings |
| Benchmark | Performance profiling with charts |
| Score | MCP Score visualization |
| Docs | Generated server documentation |
| Recordings | View, replay, and manage recorded sessions |

Real-time WebSocket updates for running tests, live protocol logging in the inspector, and dark mode with localStorage persistence.

---

### CI/CD Integration

`ci-init` generates ready-to-use pipeline configurations. Deterministic exit codes and JUnit/JSON/TAP reporters for seamless CI integration.

```bash
mcpspec ci-init                                 # Interactive wizard
mcpspec ci-init --platform github               # GitHub Actions
mcpspec ci-init --platform gitlab               # GitLab CI
mcpspec ci-init --platform shell                # Shell script
mcpspec ci-init --checks test,audit,score       # Choose checks
mcpspec ci-init --fail-on medium                # Audit severity gate
mcpspec ci-init --min-score 70                  # MCP Score threshold
mcpspec ci-init --force                         # Overwrite/replace existing
```

Auto-detects platform from `.github/` or `.gitlab-ci.yml`. GitLab `--force` surgically replaces only the mcpspec job block, preserving other jobs.

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Test failure |
| `2` | Runtime error |
| `3` | Configuration error |
| `4` | Connection error |
| `5` | Timeout |
| `6` | Security findings above threshold |
| `7` | Validation error |
| `130` | Interrupted (Ctrl+C) |

---

### Baselines & Comparison

Save test runs as baselines and detect regressions between versions.

```bash
mcpspec baseline save main                      # Save current run
mcpspec baseline list                           # List all baselines
mcpspec test --baseline main                    # Compare against baseline
mcpspec compare --baseline main                 # Explicit comparison
mcpspec compare <run-id-1> <run-id-2>           # Compare two runs
```

Comparison output shows regressions (tests that now fail), fixes (tests that now pass), new tests, and removed tests.

---

### Transports

MCPSpec supports 3 transport types for connecting to MCP servers:

| Transport | Use case | Connection |
|-----------|----------|------------|
| **stdio** | Local processes | Spawns child process, communicates via stdin/stdout |
| **SSE** | Server-Sent Events | Connects to HTTP SSE endpoint |
| **HTTP** | Streamable HTTP | POST requests to HTTP endpoint |

```yaml
# stdio (default)
server:
  command: npx
  args: ["my-mcp-server"]

# SSE
server:
  transport: sse
  url: http://localhost:3000/sse

# HTTP
server:
  transport: http
  url: http://localhost:3000/mcp
```

Connection state machine with automatic reconnection: exponential backoff (1s, 2s, 4s, 8s) up to 30s max, 3 retry attempts.

## Commands

| Command | Description |
|---------|-------------|
| `mcpspec test [collection]` | Run test collections with `--env`, `--tag`, `--parallel`, `--reporter`, `--watch`, `--ci` |
| `mcpspec inspect <server>` | Interactive REPL — `.tools`, `.call`, `.schema`, `.resources`, `.info` |
| `mcpspec audit <server>` | Security scan — `--mode`, `--fail-on`, `--exclude-tools`, `--dry-run` |
| `mcpspec bench <server>` | Performance benchmark — `--iterations`, `--tool`, `--args`, `--warmup` |
| `mcpspec score <server>` | Quality score (0-100) — `--badge badge.svg`, `--min-score` |
| `mcpspec docs <server>` | Generate docs — `--format markdown\|html`, `--output <dir>` |
| `mcpspec compare` | Compare test runs or `--baseline <name>` |
| `mcpspec baseline save <name>` | Save/list baselines for regression detection |
| `mcpspec record start <server>` | Record an inspector session — `.call`, `.save`, `.steps` |
| `mcpspec record replay <name> <server>` | Replay a recording and diff against original |
| `mcpspec record list` | List saved recordings |
| `mcpspec record delete <name>` | Delete a saved recording |
| `mcpspec mock <recording>` | Mock server from recording — `--mode`, `--latency`, `--on-missing`, `--generate` |
| `mcpspec init [dir]` | Scaffold project — `--template minimal\|standard\|full` |
| `mcpspec ci-init` | Generate CI config — `--platform github\|gitlab\|shell`, `--checks`, `--fail-on`, `--force` |
| `mcpspec ui` | Launch web dashboard on `localhost:6274` |

## Community Collections

Pre-built test suites for popular MCP servers in [`examples/collections/servers/`](examples/collections/servers/):

| Collection | Server | Tests |
|------------|--------|-------|
| [filesystem.yaml](examples/collections/servers/filesystem.yaml) | @modelcontextprotocol/server-filesystem | 12 |
| [memory.yaml](examples/collections/servers/memory.yaml) | @modelcontextprotocol/server-memory | 10 |
| [everything.yaml](examples/collections/servers/everything.yaml) | @modelcontextprotocol/server-everything | 11 |
| [fetch.yaml](examples/collections/servers/fetch.yaml) | @modelcontextprotocol/server-fetch | 7 |
| [time.yaml](examples/collections/servers/time.yaml) | @modelcontextprotocol/server-time | 10 |
| [chrome-devtools.yaml](examples/collections/servers/chrome-devtools.yaml) | chrome-devtools-mcp | 11 |
| [github.yaml](examples/collections/servers/github.yaml) | @modelcontextprotocol/server-github | 9 |

**70 tests** covering tool discovery, read/write operations, error handling, security edge cases, and latency.

```bash
# Run community collections directly
mcpspec test examples/collections/servers/filesystem.yaml
mcpspec test examples/collections/servers/time.yaml --tag smoke
```

## Architecture

| Package | Description |
|---------|-------------|
| `@mcpspec/shared` | Types, Zod schemas, constants |
| `@mcpspec/core` | MCP client, test runner, assertions, security scanner (8 rules), profiler, doc generator, scorer, recording/replay |
| `@mcpspec/cli` | 13 CLI commands built with Commander.js |
| `@mcpspec/server` | Hono HTTP server with REST API + WebSocket |
| `@mcpspec/ui` | React SPA — TanStack Router, TanStack Query, Tailwind, shadcn/ui |

## Development

```bash
git clone https://github.com/light-handle/mcpspec.git
cd mcpspec
pnpm install && pnpm build
pnpm test   # 329 tests across core + server
```

## License

MIT
