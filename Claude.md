# MCPSpec - The Definitive MCP Server Testing Platform

> **Specification Version:** 2.1.0
> **Last Updated:** February 2026
> **Status:** v1.1.0 Released

## Table of Contents

1. [Project Vision](#project-vision)
2. [Glossary](#glossary)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Runtime Architecture](#runtime-architecture)
6. [Data Models](#data-models)
7. [CLI Commands](#cli-commands)
8. [API Specification](#api-specification)
9. [WebSocket Protocol](#websocket-protocol)
10. [Security Considerations](#security-considerations)
11. [Error Handling](#error-handling)
12. [Testing Strategy](#testing-strategy)
13. [UI Specifications](#ui-specifications)
14. [CI/CD Integration](#cicd-integration)
15. [Implementation Phases](#implementation-phases)
16. [Version Roadmap](#version-roadmap)
17. [Conventions](#conventions)
18. [Launch Checklist](#launch-checklist)

---

## Project Vision

MCPSpec is "Postman for MCP" — a comprehensive testing, debugging, and documentation platform for Model Context Protocol servers. It enables developers to test MCP servers interactively, create reusable test collections, generate documentation, run security audits, and measure performance.

### Target Users
- MCP server developers who need to test their implementations
- Teams integrating MCP servers into AI applications
- Security engineers auditing MCP server deployments
- Developer advocates creating MCP server documentation

### Key Differentiators
- Collections & Environments (like Postman)
- Auto-generated documentation from server introspection
- Security vulnerability scanning (with safety controls)
- Performance profiling with visual reports
- "MCP Score" quality rating system
- First-class CI/CD integration

### Design Principles
1. **Safety First** — Never cause harm to systems being tested
2. **Local First** — Works offline, no account required
3. **Progressive Complexity** — Simple things simple, complex things possible
4. **Developer Experience** — Fast feedback, clear errors, minimal config

---

## Glossary

| Term | Definition |
|------|------------|
| **Collection** | A YAML file containing test definitions, server configuration, and environments. One collection = one file. |
| **Test Case** | A single test within a collection. Tests a specific tool, resource, or capability. |
| **Test Run** | A single execution of a collection. Produces TestResults with a unique run ID. |
| **Server** | An MCP server process (stdio) or endpoint (SSE/HTTP) being tested. |
| **Environment** | A named set of variables (dev, staging, prod) that can be switched at runtime. |
| **Assertion** | A condition that must be true for a test to pass. |
| **Finding** | A security vulnerability discovered during an audit. |
| **MCP Score** | A 0-100 quality rating based on documentation, error handling, schema quality, performance, and security. |
| **Transport** | The communication method with MCP server: stdio, SSE, or streamable-http. |

---

## Technology Stack

### Core Technologies
- **Runtime:** Node.js 22+ (LTS)
- **Language:** TypeScript 5.4+ with strict mode
- **Package Manager:** pnpm 9+
- **Build Tool:** tsup for library, Vite for UI
- **Monorepo:** Turborepo for workspace management

### Backend/CLI
| Purpose | Library | Notes |
|---------|---------|-------|
| MCP SDK | @modelcontextprotocol/sdk | Wrapped behind interface for swappability |
| CLI Framework | Commander.js | Mature, well-documented |
| Schema Validation | Zod | Runtime + static typing |
| HTTP Client | undici | Node.js native, fast |
| Process Management | execa | Cross-platform process spawning |
| Configuration | cosmiconfig | JSON, YAML, JS, package.json support |
| Logging | pino | Structured JSON, fast |
| Testing | Vitest | Fast, ESM-native |
| Reports | Handlebars | Streaming-capable templates |
| Rate Limiting | bottleneck | Robust rate limiter |
| Expression Eval | expr-eval | Safe expression evaluation (no code execution) |
| YAML Parsing | js-yaml | With FAILSAFE_SCHEMA for security |

### Web UI
| Purpose | Library | Notes |
|---------|---------|-------|
| Framework | React 18+ | With TypeScript |
| Routing | TanStack Router | Type-safe routing |
| State | Zustand + TanStack Query | Simple + server state |
| UI Components | shadcn/ui | Radix + Tailwind |
| Styling | Tailwind CSS 3.4+ | Utility-first |
| Code Editor | react-simple-code-editor | Lightweight; Monaco lazy-loaded for advanced use |
| Syntax Highlighting | Prism.js | Lightweight |
| Charts | Recharts | React-native charts |
| Forms | React Hook Form + Zod | Validation included |
| WebSocket | Native WebSocket | With reconnection wrapper |

### Data Storage
| Purpose | Solution | Notes |
|---------|----------|-------|
| Local Database | sql.js (primary) | WebAssembly SQLite, works everywhere |
| Native SQLite | better-sqlite3 (optional) | Faster, but requires compilation |
| File Storage | Local filesystem | XDG on Unix, APPDATA on Windows |
| Export Formats | JSON, YAML, HTML, Markdown, JUnit XML | |

---

## Project Structure

```
mcpspec/
├── CLAUDE.md                    # This file - project specification
├── README.md                    # User-facing documentation
├── LICENSE                      # MIT License
├── package.json                 # Root package.json (workspace config)
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # Turborepo configuration
├── tsconfig.base.json           # Shared TypeScript config
├── .eslintrc.cjs                # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── .gitignore
│
├── packages/
│   ├── core/                    # Core MCP client and testing engine
│   │   ├── src/
│   │   │   ├── index.ts         # Public API exports
│   │   │   ├── client/
│   │   │   │   ├── mcp-client.ts           # Core MCP client wrapper
│   │   │   │   ├── mcp-client-interface.ts # Abstract interface
│   │   │   │   ├── transports/
│   │   │   │   │   ├── stdio.ts
│   │   │   │   │   ├── sse.ts
│   │   │   │   │   └── http.ts
│   │   │   │   ├── connection-manager.ts   # State machine
│   │   │   │   └── connection-pool.ts      # Pool for parallel tests
│   │   │   │
│   │   │   ├── process/
│   │   │   │   ├── process-manager.ts      # Spawn, monitor, cleanup
│   │   │   │   ├── process-registry.ts     # Track all processes
│   │   │   │   └── cleanup-handler.ts      # Graceful shutdown
│   │   │   │
│   │   │   ├── testing/
│   │   │   │   ├── test-runner.ts
│   │   │   │   ├── test-executor.ts
│   │   │   │   ├── test-scheduler.ts       # Parallel + dependencies
│   │   │   │   ├── assertions/
│   │   │   │   │   ├── schema-assertion.ts
│   │   │   │   │   ├── equals-assertion.ts
│   │   │   │   │   ├── contains-assertion.ts
│   │   │   │   │   ├── exists-assertion.ts
│   │   │   │   │   ├── regex-assertion.ts
│   │   │   │   │   ├── type-assertion.ts
│   │   │   │   │   ├── latency-assertion.ts
│   │   │   │   │   ├── binary-assertion.ts
│   │   │   │   │   └── expression-assertion.ts  # Safe expr-eval
│   │   │   │   ├── reporters/
│   │   │   │   │   ├── console-reporter.ts
│   │   │   │   │   ├── json-reporter.ts
│   │   │   │   │   ├── html-reporter.ts
│   │   │   │   │   ├── junit-reporter.ts
│   │   │   │   │   └── tap-reporter.ts
│   │   │   │   └── comparison/
│   │   │   │       ├── baseline-store.ts
│   │   │   │       └── result-differ.ts
│   │   │   │
│   │   │   ├── security/
│   │   │   │   ├── security-scanner.ts
│   │   │   │   ├── scan-config.ts          # Safety controls
│   │   │   │   ├── rules/
│   │   │   │   │   ├── path-traversal.ts   # Cross-platform
│   │   │   │   │   ├── input-validation.ts
│   │   │   │   │   ├── resource-exhaustion.ts
│   │   │   │   │   ├── auth-bypass.ts
│   │   │   │   │   ├── injection.ts
│   │   │   │   │   ├── information-disclosure.ts
│   │   │   │   │   ├── tool-poisoning.ts      # LLM prompt injection in tool descriptions
│   │   │   │   │   └── excessive-agency.ts    # Overly broad/destructive tools
│   │   │   │   └── payloads/
│   │   │   │       ├── safe-payloads.ts
│   │   │   │       └── platform-payloads.ts
│   │   │   │
│   │   │   ├── performance/
│   │   │   │   ├── profiler.ts
│   │   │   │   ├── benchmark-runner.ts
│   │   │   │   └── waterfall-generator.ts
│   │   │   │
│   │   │   ├── documentation/
│   │   │   │   ├── doc-generator.ts
│   │   │   │   ├── markdown-generator.ts
│   │   │   │   └── html-generator.ts
│   │   │   │
│   │   │   ├── recording/
│   │   │   │   ├── recording-store.ts          # Save/load recordings
│   │   │   │   ├── recording-replayer.ts       # Replay against server
│   │   │   │   └── recording-differ.ts         # Diff original vs replay
│   │   │   │
│   │   │   ├── scoring/
│   │   │   │   ├── mcp-score.ts
│   │   │   │   ├── criteria/
│   │   │   │   └── badge-generator.ts
│   │   │   │
│   │   │   ├── rate-limiting/
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   └── backoff.ts
│   │   │   │
│   │   │   ├── errors/
│   │   │   │   ├── error-codes.ts
│   │   │   │   ├── mcpspec-error.ts
│   │   │   │   ├── error-messages.ts       # User-friendly templates
│   │   │   │   └── error-formatter.ts
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── jsonpath.ts
│   │   │       ├── variable-resolver.ts
│   │   │       ├── secret-masker.ts
│   │   │       ├── yaml-loader.ts          # Safe YAML loading
│   │   │       ├── platform.ts             # Cross-platform utils
│   │   │       └── progress.ts
│   │   │
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── fixtures/
│   │           ├── mock-mcp-server/
│   │           ├── reference-server/
│   │           └── recorded-sessions/
│   │
│   ├── cli/
│   │   └── src/
│   │       ├── commands/
│   │       │   ├── init.ts                 # With wizard
│   │       │   ├── test.ts
│   │       │   ├── inspect.ts              # REPL
│   │       │   ├── audit.ts                # With confirmation
│   │       │   ├── docs.ts
│   │       │   ├── score.ts
│   │       │   ├── bench.ts
│   │       │   ├── compare.ts
│   │       │   ├── baseline.ts
│   │       │   ├── record.ts              # Recording & replay
│   │       │   └── ci-init.ts             # CI pipeline generator
│   │       ├── wizard/
│   │       │   └── onboarding.ts
│   │       └── utils/
│   │           └── exit-codes.ts
│   │
│   ├── server/
│   │   └── src/
│   │       ├── app.ts
│   │       ├── websocket.ts                # Real-time events
│   │       ├── routes/
│   │       └── middleware/
│   │           ├── localhost-only.ts       # Security
│   │           └── auth.ts
│   │
│   ├── ui/
│   │   └── src/
│   │       ├── routes/
│   │       ├── components/
│   │       ├── hooks/
│   │       │   └── use-websocket.ts        # With reconnection
│   │       └── stores/
│   │
│   └── shared/
│       └── src/
│           ├── types/
│           │   └── websocket.ts
│           ├── schemas/
│           └── constants/
│               └── exit-codes.ts
│
├── examples/
│   ├── collections/
│   │   ├── simple.yaml
│   │   └── with-environments.yaml
│   └── ci/
│       ├── github-actions.yml
│       └── gitlab-ci.yml
│
└── docs/
    ├── getting-started.md
    ├── collections.md
    ├── assertions.md
    ├── security-rules.md
    ├── ci-cd.md
    └── troubleshooting.md
```

---

## Runtime Architecture

### Process Manager

Handles spawning, monitoring, and cleanup of stdio-based MCP servers.

```typescript
interface ProcessManager {
  spawn(config: ProcessConfig): Promise<ManagedProcess>;
  shutdown(processId: string, gracePeriodMs?: number): Promise<void>;
  shutdownAll(): Promise<void>;
  isAlive(processId: string): boolean;
}

interface ProcessConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

// CRITICAL: Register cleanup handlers at startup
function registerCleanupHandlers(manager: ProcessManager): void {
  const cleanup = async () => {
    console.log('Cleaning up processes...');
    await manager.shutdownAll();
    process.exit(0);
  };
  
  process.on('exit', () => manager.shutdownAll());
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', async (err) => {
    console.error('Uncaught exception:', err);
    await manager.shutdownAll();
    process.exit(1);
  });
}
```

### Connection State Machine

```typescript
type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting'
  | 'error';

interface ConnectionConfig {
  maxReconnectAttempts: number;    // Default: 3
  reconnectBackoff: 'exponential'; // 1s, 2s, 4s, 8s...
  initialReconnectDelay: number;   // Default: 1000ms
  maxReconnectDelay: number;       // Default: 30000ms
}

// Valid transitions
const transitions: Record<ConnectionState, ConnectionState[]> = {
  'disconnected': ['connecting'],
  'connecting': ['connected', 'error', 'disconnected'],
  'connected': ['disconnecting', 'reconnecting', 'error'],
  'reconnecting': ['connected', 'error', 'disconnected'],
  'disconnecting': ['disconnected'],
  'error': ['connecting', 'disconnected'],
};
```

### Timeout Hierarchy

```typescript
interface TimeoutConfig {
  test: number;           // Total test timeout - default: 30000
  mcpCall: number;        // Single tool call - default: 25000
  transport: number;      // HTTP/stdio response - default: 20000
  assertion: number;      // Expression eval - default: 5000
  cleanup: number;        // Post-test cleanup - default: 5000
}

// IMPORTANT: Validate at startup
function validateTimeouts(config: TimeoutConfig): void {
  const innerMax = Math.max(config.mcpCall, config.transport, config.assertion, config.cleanup);
  if (innerMax >= config.test) {
    throw new ConfigError(
      `Inner timeouts (${innerMax}ms) must be < test timeout (${config.test}ms)`
    );
  }
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  maxCallsPerSecond: number;   // Default: 10
  maxConcurrent: number;       // Default: 5
  backoff: {
    initial: number;           // Default: 1000
    multiplier: number;        // Default: 2
    max: number;               // Default: 30000
  };
}
```

---

## Data Models

### Simple Collection Format (Recommended)

```yaml
name: My First Tests
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

### Advanced Collection Format

```yaml
schemaVersion: "1.0"
name: API Tests
description: Comprehensive tests

server:
  name: my-server
  transport: stdio
  command: npx
  args: ["my-mcp-server"]
  env:
    NODE_ENV: test
  timeouts:
    connect: 10000
    call: 30000

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
    name: Get user
    tags: [smoke, api]
    timeout: 5000
    retries: 2
    
    type: tool
    tool: get_user
    input:
      id: "{{userId}}"
    
    assertions:
      - type: schema
      - type: exists
        path: $.name
      - type: latency
        maxMs: 1000
    
    extract:
      - name: userName
        path: $.name
```

### Assertion Types

| Type | Purpose | Example |
|------|---------|---------|
| `schema` | Validate against JSON Schema | `{ type: schema }` |
| `equals` | Exact match | `{ type: equals, path: $.id, value: 123 }` |
| `contains` | Contains value | `{ type: contains, path: $.tags, value: "active" }` |
| `exists` | Path exists | `{ type: exists, path: $.email }` |
| `matches` | Regex match | `{ type: matches, path: $.email, pattern: ".*@.*" }` |
| `type` | Type check | `{ type: type, path: $.count, expected: number }` |
| `length` | Array/string length | `{ type: length, path: $.items, operator: gt, value: 0 }` |
| `latency` | Response time | `{ type: latency, maxMs: 1000 }` |
| `mimeType` | Content type | `{ type: mimeType, expected: "image/png" }` |
| `expression` | Safe expression | `{ type: expression, expr: "response.total > 0" }` |

### Expression Assertions (Safe, NOT arbitrary code)

```yaml
assertions:
  - type: expression
    expr: "response.items.length > 0 and response.total == response.items.length"
```

**Available:** `==`, `!=`, `>`, `<`, `and`, `or`, `not`, `in`, property access, array indexing.

**NOT available:** Function definitions, loops, file access, `require`.

---

## CLI Commands

### Exit Codes

```typescript
export const EXIT_CODES = {
  SUCCESS: 0,
  TEST_FAILURE: 1,
  ERROR: 2,
  CONFIG_ERROR: 3,
  CONNECTION_ERROR: 4,
  TIMEOUT: 5,
  SECURITY_FINDINGS: 6,
  VALIDATION_ERROR: 7,
  INTERRUPTED: 130,
};
```

### Command Reference

```bash
# Initialize project with wizard
mcpspec init [directory] --template <minimal|standard|full>

# Run tests
mcpspec test [collection]
  --env <environment>
  --tag <tag>                 # Filter by tag
  --parallel <n>              # Parallel execution
  --reporter <console|json|junit|html>
  --output <path>
  --ci                        # CI mode
  --baseline <name>           # Compare against baseline
  --watch                     # Re-run on changes

# Interactive inspection
mcpspec inspect <server>
# REPL: .tools, .call <tool> <json>, .schema <tool>, .exit

# Security audit (requires confirmation for active mode)
mcpspec audit <server>
  --mode <passive|active|aggressive>
  --acknowledge-risk          # Skip confirmation
  --fail-on <severity>

# Compare runs
mcpspec compare <run1> <run2>
mcpspec compare --baseline main

# Manage baselines
mcpspec baseline save <name>
mcpspec baseline list

# Generate documentation
mcpspec docs <server> --format <markdown|html> --output <dir>

# Calculate MCP Score
mcpspec score <server> --badge <path>

# Performance benchmark
mcpspec bench <server> --iterations 100

# Recording & replay
mcpspec record start <server>           # Record inspector session
mcpspec record list                     # List saved recordings
mcpspec record replay <name> <server>   # Replay and diff
mcpspec record delete <name>            # Delete recording

# Generate CI pipeline configuration
mcpspec ci-init
  --platform <type>          # github, gitlab, or shell (auto-detect)
  --collection <path>        # Path to collection file
  --server <command>         # Server command for audit/score/bench
  --checks <list>            # Comma-separated: test,audit,score,bench
  --fail-on <severity>       # Audit severity gate: low,medium,high,critical
  --min-score <n>            # Minimum MCP Score threshold (0-100)
  --force                    # Overwrite existing files
```

---

## WebSocket Protocol

### Connection
```
ws://localhost:6274/ws
```

### Message Format
```typescript
// Client → Server
{ type: 'subscribe', channel: 'run:abc123' }
{ type: 'unsubscribe', channel: 'run:abc123' }
{ type: 'ping' }

// Server → Client  
{ type: 'subscribed', channel: 'run:abc123' }
{ type: 'event', channel: 'run:abc123', event: 'test-completed', data: {...} }
{ type: 'pong' }
```

### Channels

| Channel | Events |
|---------|--------|
| `server:{id}` | `connected`, `disconnected`, `error` |
| `run:{id}` | `started`, `test-started`, `test-completed`, `completed` |
| `scan:{id}` | `started`, `finding`, `completed` |
| `benchmark:{id}` | `started`, `iteration`, `completed` |

### Reconnection

Client should implement exponential backoff: 1s, 2s, 4s, 8s... up to 30s max.

---

## Security Considerations

### Safe YAML Loading

```typescript
import yaml from 'js-yaml';

const LIMITS = {
  maxFileSize: 1024 * 1024,  // 1MB
  maxNestingDepth: 10,
  maxTests: 1000,
};

function loadYamlSafely(content: string): unknown {
  if (content.length > LIMITS.maxFileSize) {
    throw new Error('YAML file too large');
  }
  
  return yaml.load(content, {
    schema: yaml.FAILSAFE_SCHEMA,  // No custom types
  });
}
```

### Expression Evaluation (NOT arbitrary code)

Uses `expr-eval` library with limited operations:
- ✅ Comparisons, logical operators, math
- ✅ Property access, array indexing
- ❌ Function definitions, require, file access

### Secret Handling

```typescript
class SecretMasker {
  private secrets = new Set<string>();
  
  registerFromEnv(env: Record<string, string>): void {
    const secretPatterns = [/api[_-]?key/i, /password/i, /secret/i, /token/i];
    for (const [key, value] of Object.entries(env)) {
      if (secretPatterns.some(p => p.test(key)) && value.length > 3) {
        this.secrets.add(value);
      }
    }
  }
  
  mask(text: string): string {
    let masked = text;
    for (const secret of this.secrets) {
      masked = masked.replaceAll(secret, '***REDACTED***');
    }
    return masked;
  }
}
```

### Security Scanner Safety

```typescript
// Active mode requires explicit confirmation
if (config.mode !== 'passive' && !config.acknowledgeRisk) {
  console.log('⚠️  SECURITY SCAN WARNING');
  console.log('This sends potentially harmful payloads.');
  console.log('NEVER run against production systems!');
  
  const confirmed = await prompt('Is this a TEST environment? [y/N]');
  if (!confirmed) process.exit(1);
}
```

### Localhost-Only Default

Server binds to `127.0.0.1` by default. Remote access requires:
```bash
MCPSPEC_REMOTE_ACCESS=true
MCPSPEC_TOKEN=your-secure-token
```

---

## Error Handling

### User-Friendly Messages

```typescript
const ERROR_TEMPLATES = {
  CONNECTION_TIMEOUT: {
    title: 'Connection Timed Out',
    description: 'Could not connect within {{timeout}}ms.',
    suggestions: [
      'Verify the server is running',
      'Check the command/URL is correct',
      'Increase timeout with --timeout flag',
    ],
    docs: 'https://mcpspec.dev/docs/troubleshooting#connection-timeout',
  },
  
  TOOL_NOT_FOUND: {
    title: 'Tool Not Found',
    description: 'The tool "{{toolName}}" does not exist.',
    suggestions: [
      'Available tools: {{availableTools}}',
      'Run `mcpspec inspect {{serverId}}` to see all tools',
    ],
  },
};
```

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
      
      - name: Validate collections
        run: mcpspec collection validate ./collections/*.yaml
      
      - name: Run tests
        run: mcpspec test --ci --reporter junit --output results.xml
      
      - uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: results.xml
```

### Pre-commit Hook

```bash
#!/bin/bash
if git diff --cached --name-only | grep -q "collections/.*\.yaml$"; then
  mcpspec collection validate $(git diff --cached --name-only | grep "collections/.*\.yaml$")
fi
```

---

## Implementation Phases

### Timeline Overview

```
Week:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20
       ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
       │    v0.1.0     │    v0.2.0     │    v0.3.0     │    v0.4.0     │    v1.0.0     │
       │   MVP CLI     │   Full CLI    │   Basic UI    │  Sec + Perf   │   Complete    │
```

### Phase 1: MVP CLI (Weeks 1-4) → v0.1.0

**Deliverable:** Basic CLI that can test MCP servers

- Week 1: Foundation (monorepo, TypeScript, error handling, safe YAML)
- Week 2: Core client (stdio transport, process manager, state machine)
- Week 3: Test runner (sequential, 5 assertions, console/JSON reporters)
- Week 4: CLI commands (`test`, `inspect`), exit codes, examples

```bash
# v0.1.0 works:
mcpspec test ./collection.yaml
mcpspec inspect "npx @mcp/server /tmp"
```

### Phase 2: Full CLI (Weeks 5-8) → v0.2.0

**Deliverable:** Complete CLI with all features

- Week 5: SSE/HTTP transports, connection pool
- Week 6: Environments, variables, secrets, all assertions, expressions
- Week 7: Parallel execution, tags, rate limiting, retries, more reporters
- Week 8: Wizard, baselines, compare, watch mode, CI docs

```bash
# v0.2.0 works:
mcpspec init
mcpspec test --parallel 4 --tag @smoke --env prod
mcpspec compare --baseline main
```

### Phase 3: Basic UI (Weeks 9-12) → v0.3.0

**Deliverable:** Web UI for inspection and testing

- Week 9: Backend server (Hono, SQLite, REST API, auth)
- Week 10: WebSocket handler, real-time events
- Week 11: React UI (layout, server connection, tool inspector)
- Week 12: Collection editor, test runner UI, results view

```bash
# v0.3.0 works:
mcpspec ui  # Opens localhost:6274
```

### Phase 4: Security + Performance (Weeks 13-16) → v0.4.0

**Deliverable:** Security scanner and performance profiler

- Week 13: Security framework, confirmation prompts, payload management
- Week 14: All 6 security rules (cross-platform)
- Week 15: Performance profiler, benchmarks, charts
- Week 16: CLI commands, UI integration

```bash
# v0.4.0 works:
mcpspec audit my-server --acknowledge-risk
mcpspec bench my-server --iterations 100
```

### Phase 5: Complete (Weeks 17-20) → v1.0.0

**Deliverable:** Production-ready release

- Week 17: Doc generator, MCP Score, badges
- Week 18: UI polish, dark mode
- Week 19: Testing, optimization, bug fixes
- Week 20: Documentation, demo video, launch prep

---

## Version Roadmap

### v1.0.0 (Week 20)
Initial public release. Core features complete.

### v1.1.0 (Week 24) — COMPLETE
- **Tool Poisoning security rule** — Detects LLM prompt injection in tool descriptions: suspicious instructions, hidden Unicode, cross-tool references, embedded code
- **Excessive Agency security rule** — Detects overly broad/destructive tools: missing confirmation params, arbitrary code params, broad schemas, missing descriptions
- **Recording & Replay** — Record inspector sessions, save to `~/.mcpspec/recordings/`, replay against servers, diff results (matched/changed/added/removed)
- **Opinionated schema linting in MCP Score** — Schema quality now scores across 6 weighted criteria: structure (20%), property types (20%), property descriptions (20%), required fields (15%), constraints like enum/pattern/min/max (15%), and naming conventions (10%)
- New CLI command: `mcpspec record` (start/list/replay/delete)
- Server API: recordings CRUD + replay endpoint, save-recording from inspect sessions
- UI: Recordings page, Save Recording button on Inspector
- Security scanner now has 8 rules (was 6), passive mode has 5 rules (was 3)
- **CI Pipeline Generator** — `mcpspec ci-init` generates GitHub Actions, GitLab CI, or shell scripts with interactive wizard and flag-driven mode. Auto-detects platform. Supports test, audit, score, and bench checks with configurable severity gates and MCP Score thresholds.

### v1.1.5 (Week 26)
- **Server Process Monitor** — Real-time view of stdio server process health: stdout/stderr streams, memory/CPU usage, uptime, exit code on crash. Expose ProcessManager stats via server API/WebSocket. UI panel in Inspector.
- **Step-Through Test Execution** — Debug mode for collection runs: pause between test cases, inspect/modify variable state, continue/skip/abort. TestExecutor emits events and waits for "continue" signal via WebSocket. UI "Debug Run" button.
- **MCP Conformance Probe** — Automatically exercise MCP protocol edge cases (missing fields, wrong types, extra fields, empty arrays, null values, oversized payloads) and report server handling. Protocol compliance report, not security scan. New CLI command (`mcpspec probe`) + UI section.

### v1.2.0 (Week 28)
- Team workspaces
- SSO integration
- Audit logs
- Role-based access

### v1.3.0 (Week 32)
- Fuzzing mode
- Property-based testing
- Contract testing
- Mock server generation

### v2.0.0 (Week 40)
- MCPSpec Cloud (hosted version)
- GitHub App integration
- VS Code extension
- API access for automation

---

## Conventions

### Naming

| Context | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `test-runner.ts` |
| Classes | PascalCase | `TestRunner` |
| Functions | camelCase | `runTest` |
| Constants | SCREAMING_SNAKE | `MAX_TIMEOUT` |
| CLI args | kebab-case | `--server-id` |
| YAML keys | camelCase | `serverId` |
| Env vars | SCREAMING_SNAKE | `MCPSPEC_TOKEN` |

### Git Commits

```
<type>(<scope>): <description>

feat(cli): add watch mode
fix(core): handle timeout correctly
docs: add CI examples
```

---

## Launch Checklist

### Pre-Launch
- [ ] README with demos
- [ ] Getting started guide
- [ ] API reference
- [ ] CI/CD examples
- [ ] All tests passing
- [ ] Coverage targets met
- [ ] Demo video

### Launch Day
- [ ] Tag v1.0.0
- [ ] Publish to npm
- [ ] GitHub release
- [ ] Twitter thread
- [ ] Hacker News
- [ ] Reddit posts
- [ ] MCP Discord

### Post-Launch
- [ ] Monitor issues
- [ ] Quick bug fixes
- [ ] Collect testimonials
- [ ] Plan v1.1

---

*Specification v2.0.0 — Incorporates all fixes from adversarial review*
