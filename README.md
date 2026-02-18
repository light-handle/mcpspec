# MCPSpec

The testing platform for Model Context Protocol (MCP) servers. Think Postman, but for MCP.

## Features

- **Test Collections** — Define tests in YAML, run them from CLI
- **Interactive Inspector** — REPL for exploring MCP server tools and resources
- **Multiple Assertions** — schema, equals, contains, exists, matches, latency
- **Environment Support** — Switch between dev/staging/prod variables
- **CI/CD Ready** — JSON reporter, exit codes, GitHub Actions examples
- **Safe by Design** — FAILSAFE YAML parsing, secret masking, process cleanup

## Installation

```bash
npm install -g mcpspec
```

Or with pnpm:

```bash
pnpm add -g mcpspec
```

## Quick Start

### 1. Initialize a project

```bash
mcpspec init --template standard
```

This creates a `mcpspec.yaml` file you can customize.

### 2. Write a test collection

```yaml
name: My MCP Server Tests
server: npx my-mcp-server

tests:
  - name: Basic tool call
    call: my_tool
    with:
      param: value
    expect:
      - exists: $.content

  - name: Handle errors
    call: my_tool
    with:
      invalid: true
    expectError: true
```

### 3. Run tests

```bash
mcpspec test ./mcpspec.yaml
```

Output:

```
MCPSpec running My MCP Server Tests (2 tests)

  ✓ Basic tool call (124ms)
  ✓ Handle errors (89ms)

  Tests:  2 passed (2 total)
  Time:   0.45s
```

## CLI Commands

### `mcpspec test [collection]`

Run tests from a YAML collection file.

```bash
mcpspec test                          # Uses ./mcpspec.yaml
mcpspec test ./my-tests.yaml          # Specific file
mcpspec test --env staging            # Use staging environment
mcpspec test --reporter json          # JSON output
mcpspec test --output results.json    # Save results to file
mcpspec test --ci                     # CI mode (no colors)
```

### `mcpspec inspect <server>`

Interactive REPL for exploring an MCP server.

```bash
mcpspec inspect "npx @modelcontextprotocol/server-filesystem /tmp"
```

REPL commands:

| Command | Description |
|---------|-------------|
| `.tools` | List all available tools |
| `.resources` | List all available resources |
| `.call <tool> <json>` | Call a tool with JSON arguments |
| `.schema <tool>` | Show tool's input schema |
| `.info` | Show server information |
| `.help` | Show help |
| `.exit` | Disconnect and exit |

### `mcpspec init [directory]`

Initialize a new mcpspec project.

```bash
mcpspec init                          # Current directory
mcpspec init ./my-project             # Specific directory
mcpspec init --template minimal       # Minimal template
mcpspec init --template full          # Full template with environments
```

## Collection Format

### Simple Format

```yaml
name: My Tests
server: npx my-mcp-server

tests:
  - name: Test name
    call: tool_name
    with:
      param: value
    expect:
      - exists: $.path
```

### Advanced Format

```yaml
schemaVersion: "1.0"
name: My Tests
description: Test description

server:
  transport: stdio
  command: npx
  args: ["my-mcp-server"]
  env:
    NODE_ENV: test

environments:
  dev:
    variables:
      API_URL: http://localhost:3000
  prod:
    variables:
      API_URL: https://api.example.com

defaultEnvironment: dev

tests:
  - id: test-1
    name: Get data
    tags: [smoke]
    call: get_data
    with:
      id: "{{userId}}"
    assertions:
      - type: schema
      - type: exists
        path: $.name
      - type: latency
        maxMs: 1000
    extract:
      - name: dataId
        path: $.id
```

## Assertion Types

| Type | Description | Example |
|------|-------------|---------|
| `schema` | Response is valid (not null) | `type: schema` |
| `equals` | Exact value match | `type: equals, path: $.id, value: 123` |
| `contains` | Array contains / string includes | `type: contains, path: $.tags, value: "active"` |
| `exists` | Path exists in response | `type: exists, path: $.name` |
| `matches` | Regex pattern match | `type: matches, path: $.email, pattern: ".*@.*"` |
| `latency` | Response time limit | `type: latency, maxMs: 1000` |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |
| 2 | Runtime error |
| 3 | Configuration error |
| 4 | Connection error |
| 5 | Timeout |
| 130 | Interrupted (Ctrl+C) |

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run MCP tests
  run: mcpspec test --ci --reporter json --output results.json
```

See [examples/ci/](./examples/ci/) for complete workflow files.

## Development

```bash
# Clone and install
git clone https://github.com/mcpspec/mcpspec.git
cd mcpspec
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run CLI locally
node packages/cli/dist/index.js test ./examples/collections/simple.yaml
```

## Architecture

MCPSpec is a monorepo with these packages:

| Package | Description |
|---------|-------------|
| `@mcpspec/shared` | Shared types, schemas, constants |
| `@mcpspec/core` | MCP client, test runner, assertions |
| `@mcpspec/cli` | CLI commands (test, inspect, init) |
| `@mcpspec/server` | Web UI backend (Phase 3) |
| `@mcpspec/ui` | Web UI frontend (Phase 3) |

## License

MIT
