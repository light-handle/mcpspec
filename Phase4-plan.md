# Phase 4: Security Scanning + Performance Benchmarking

## Context

Phase 4 (v0.4.0) implements security auditing and performance benchmarking for MCP servers. Currently all 10 files in `packages/core/src/security/` and `packages/core/src/performance/` throw `NotImplementedError`, and the CLI commands (`audit`, `bench`) print "Coming in v0.4.0". This phase makes them functional.

## Implementation Plan

### Step 1: Shared Types

**Modify** `packages/shared/src/types/index.ts` — add:
- `SecurityScanConfig` — mode, rules list, severity threshold, acknowledgeRisk, timeout, maxProbesPerTool
- `SecurityScanResult` — id, serverName, mode, timestamps, findings, summary
- `SecurityScanSummary` — totalFindings, bySeverity, byRule counts
- `BenchmarkConfig` — iterations, warmupIterations, concurrency, timeout
- `BenchmarkResult` — toolName, iterations, stats, errors, timestamps
- `BenchmarkStats` — min, max, mean, median, p95, p99, stddev
- `ProfileEntry` — toolName, startMs, durationMs, success, error
- `WaterfallEntry` — label, startMs, durationMs

### Step 2: ScanConfig

**Rewrite** `packages/core/src/security/scan-config.ts`
- Immutable config class with defaults (mode=passive, timeout=10s, maxProbes=50)
- Auto-filters rules by mode (passive excludes resource-exhaustion, auth-bypass, injection)
- `requiresConfirmation()` — true for active/aggressive without acknowledgeRisk
- `meetsThreshold(severity)` — severity ordering filter

### Step 3: Payloads

**Rewrite** `packages/core/src/security/payloads/safe-payloads.ts`
- Passive-mode observation payloads: empty values, boundary values, long strings, special chars, type confusion
- Returns `PayloadSet[]` with category, label, value, description

**Rewrite** `packages/core/src/security/payloads/platform-payloads.ts`
- Active/aggressive payloads: path traversal (Unix + Windows), command injection, SQL injection, template injection, resource exhaustion (aggressive only)
- Platform-filtered via `getPlatformInfo()`
- Each entry tagged with `minMode` and `platforms`

### Step 4: Security Rule Interface

**Create** `packages/core/src/security/rule-interface.ts`
```typescript
export interface SecurityRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]>;
}
```

### Step 5: Six Security Rules

All implement `SecurityRule`. Each rule:
- Identifies applicable tools by inspecting `inputSchema` property names/types
- Probes with payloads appropriate to the scan mode
- Wraps calls in timeout via `Promise.race`
- Returns `SecurityFinding[]` with severity, evidence, remediation

| File | Rule | Modes | What it tests |
|------|------|-------|---------------|
| `rules/path-traversal.ts` | Path traversal | passive/active/aggressive | `../` patterns on path/file params; detects content reads + path disclosure |
| `rules/input-validation.ts` | Input validation | passive/active/aggressive | Missing required fields, wrong types, empty values; detects missing validation |
| `rules/resource-exhaustion.ts` | Resource exhaustion | active/aggressive | Large strings, deep nesting, many keys; detects slow/crash responses |
| `rules/auth-bypass.ts` | Auth bypass | active/aggressive | Calls admin-like tools with empty args; detects unrestricted access |
| `rules/injection.ts` | Injection | active/aggressive | SQL/command/template injection payloads; detects echoed output or SQL errors |
| `rules/information-disclosure.ts` | Info disclosure | passive/active/aggressive | Triggers errors, checks for stack traces, internal paths, config values |

### Step 6: SecurityScanner Orchestrator

**Rewrite** `packages/core/src/security/security-scanner.ts`
- Registers all 6 built-in rules
- `scan(client, config, progress?)` — discovers tools, runs enabled rules sequentially, aggregates findings
- Catches individual rule failures (reports as info-severity finding)
- Sorts findings by severity (critical first)
- Progress callbacks: `onRuleStart`, `onRuleComplete`, `onFinding`

### Step 7: Performance Module

**Rewrite** `packages/core/src/performance/profiler.ts`
- `profileCall(client, toolName, args)` — wraps callTool with `performance.now()` timing
- `getStats(toolName?)` — min/max/mean/median/p95/p99/stddev
- Export `computeStats(sortedDurations)` — pure function, reused by BenchmarkRunner

**Rewrite** `packages/core/src/performance/benchmark-runner.ts`
- `run(client, toolName, args, config, progress?)` — warmup phase then measured iterations
- Timeout per call via `Promise.race`
- Progress callbacks: `onWarmupStart`, `onIterationComplete`, `onComplete`

**Rewrite** `packages/core/src/performance/waterfall-generator.ts`
- `generate(entries)` — ProfileEntry[] → WaterfallEntry[]
- `toAscii(entries, width)` — text-based waterfall visualization

### Step 8: Core Exports

**Modify** `packages/core/src/index.ts` — export SecurityScanner, ScanConfig, all 6 rules, payloads, Profiler, computeStats, BenchmarkRunner, WaterfallGenerator

### Step 9: CLI Commands

**Rewrite** `packages/cli/src/commands/audit.ts`
- Connect to server, create ScanConfig from CLI flags
- `--mode passive|active|aggressive`, `--acknowledge-risk`, `--fail-on <severity>`, `--rules <rules...>`
- Confirmation prompt for active/aggressive (using `confirm` from `@inquirer/prompts`, already a dependency)
- Print findings with severity-colored output
- Exit code 6 (SECURITY_FINDINGS) if findings match `--fail-on`

**Rewrite** `packages/cli/src/commands/bench.ts`
- Connect to server, discover tools
- `--iterations <n>`, `--tool <name>`, `--args <json>`, `--timeout <ms>`
- Run BenchmarkRunner with progress display
- Print stats table

### Step 10: Unit Tests

**Create** `packages/core/tests/fixtures/mock-mcp-client.ts` — reusable `MockMCPClient` implementing `MCPClientInterface` with configurable tool list and call handler

**Create test files** (all in `packages/core/tests/unit/`):
- `scan-config.test.ts` — defaults, mode filtering, confirmation logic, threshold
- `safe-payloads.test.ts` — returns payloads, categories present
- `platform-payloads.test.ts` — platform filtering, categories
- `security-scanner.test.ts` — orchestration, finding sorting, rule failure handling, progress callbacks
- `path-traversal.test.ts` — path param detection, finding generation
- `input-validation.test.ts` — missing fields, wrong types
- `injection.test.ts` — detects echoed injection, rejects clean responses
- `information-disclosure.test.ts` — stack trace detection, path disclosure
- `profiler.test.ts` — timing, stats computation, computeStats with known values
- `benchmark-runner.test.ts` — warmup exclusion, error counting, progress
- `waterfall-generator.test.ts` — entry transformation, ASCII output

### Step 11: Error Codes

**Modify** `packages/core/src/errors/error-codes.ts` — add `SECURITY_SCAN_ERROR` to `ErrorCode` union and `ERROR_CODE_MAP`

## File Summary

| Action | Count | Files |
|--------|-------|-------|
| Rewrite stubs | 10 | scan-config, security-scanner, 6 rules, 2 payload files |
| Rewrite stubs | 3 | profiler, benchmark-runner, waterfall-generator |
| Rewrite stubs | 2 | CLI audit.ts, bench.ts |
| Create new | 1 | rule-interface.ts |
| Create new | 1 | mock-mcp-client.ts fixture |
| Create new | 11 | test files |
| Modify | 3 | shared/types/index.ts, core/index.ts, error-codes.ts |

**Total**: 15 rewrites + 13 new files + 3 modifications = ~31 files

## Build Order

1. Shared types → ScanConfig → Payloads → Rule interface
2. 6 security rules (can be parallelized)
3. SecurityScanner orchestrator
4. Profiler → BenchmarkRunner → WaterfallGenerator
5. Core exports + error codes
6. CLI audit + bench commands
7. Mock client + all unit tests
8. `pnpm build && pnpm test`

## Verification

1. `pnpm build` — all 5 packages compile
2. `pnpm test` — 166 existing + ~60 new tests pass
3. `node packages/cli/dist/index.js audit --help` — shows options
4. `node packages/cli/dist/index.js bench --help` — shows options
5. `node packages/cli/dist/index.js audit "npx @modelcontextprotocol/server-filesystem /tmp"` — runs passive scan, prints findings
6. `node packages/cli/dist/index.js bench "npx @modelcontextprotocol/server-filesystem /tmp" --iterations 10 --tool list_directory --args '{"path":"/tmp"}'` — runs benchmark, prints stats
