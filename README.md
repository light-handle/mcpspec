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
mcpspec audit "npx my-server"         # Security scan
mcpspec bench "npx my-server"         # Performance benchmark
mcpspec score "npx my-server"         # Quality rating (0-100)
mcpspec docs "npx my-server"          # Auto-generate documentation
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
```

## Features

| | Feature | Description |
|---|---|---|
| **Test Collections** | YAML-based test suites with 10 assertion types, environments, variables, tags, retries, and parallel execution |
| **Interactive Inspector** | Connect to any MCP server and explore tools, resources, and schemas in a live REPL |
| **Security Audit** | Scan for path traversal, injection, auth bypass, resource exhaustion, and information disclosure |
| **Benchmarks** | Measure min/max/mean/median/P95/P99 latency and throughput across hundreds of iterations |
| **MCP Score** | 0-100 quality rating across documentation, schema quality, error handling, performance, and security |
| **Doc Generator** | Auto-generate Markdown or HTML documentation from server introspection |
| **Web Dashboard** | Full React UI with server management, test runner, audit viewer, and dark mode |
| **CI/CD Ready** | JUnit/JSON/TAP reporters, deterministic exit codes, `--ci` mode, GitHub Actions compatible |

## Commands

| Command | Description |
|---------|-------------|
| `mcpspec test [collection]` | Run test collections with `--env`, `--tag`, `--parallel`, `--reporter`, `--watch`, `--ci` |
| `mcpspec inspect <server>` | Interactive REPL — `.tools`, `.call`, `.schema`, `.resources`, `.info` |
| `mcpspec audit <server>` | Security scan — `--mode passive\|active\|aggressive`, `--fail-on <severity>` |
| `mcpspec bench <server>` | Performance benchmark — `--iterations`, `--tool`, `--args` |
| `mcpspec score <server>` | Quality score (0-100) — `--badge badge.svg` |
| `mcpspec docs <server>` | Generate docs — `--format markdown\|html`, `--output <dir>` |
| `mcpspec compare` | Compare test runs or `--baseline <name>` |
| `mcpspec baseline save <name>` | Save/list baselines for regression detection |
| `mcpspec init [dir]` | Scaffold project — `--template minimal\|standard\|full` |
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

## Architecture

| Package | Description |
|---------|-------------|
| `@mcpspec/shared` | Types, Zod schemas, constants |
| `@mcpspec/core` | MCP client, test runner, assertions, security scanner, profiler, doc generator, scorer |
| `@mcpspec/cli` | 10 CLI commands built with Commander.js |
| `@mcpspec/server` | Hono HTTP server with REST API + WebSocket |
| `@mcpspec/ui` | React SPA — TanStack Router, TanStack Query, Tailwind, shadcn/ui |

## Development

```bash
git clone https://github.com/light-handle/mcpspec.git
cd mcpspec
pnpm install && pnpm build
pnpm test   # 259 tests across core + server
```

## License

MIT
