# @mcpspec/shared

Internal shared package for [MCPSpec](https://www.npmjs.com/package/mcpspec). Provides TypeScript types, Zod validation schemas, and constants used across all MCPSpec packages.

> **You probably want the [`mcpspec`](https://www.npmjs.com/package/mcpspec) CLI package instead.** This package is a dependency of the other MCPSpec packages and is not intended for direct use.

## Exports

### TypeScript Types

- `ConnectionState`, `ConnectionConfig` — Connection state machine
- `ProcessConfig`, `ManagedProcess` — Process management
- `TimeoutConfig`, `DEFAULT_TIMEOUTS` — Timeout configuration
- `RateLimitConfig`, `DEFAULT_RATE_LIMIT` — Rate limiting
- `TransportType`, `ServerConfig` — Server transport configuration
- `CollectionDefinition`, `TestDefinition`, `EnvironmentDefinition` — Collection format
- `AssertionDefinition`, `AssertionType`, `SimpleExpectation`, `ExtractionDefinition` — Assertions
- `TestRunResult`, `TestResult`, `AssertionResult`, `TestSummary` — Test results
- `ReporterType` — Reporter selection
- `SecurityScanMode`, `SeverityLevel`, `SecurityFinding`, `SecurityScanConfig`, `SecurityScanResult` — Security scanning
- `BenchmarkConfig`, `BenchmarkResult`, `BenchmarkStats` — Performance benchmarking
- `ProfileEntry`, `WaterfallEntry` — Profiling
- `MCPScore` — Quality scoring
- `WSClientMessage`, `WSServerMessage` — WebSocket protocol
- `ErrorTemplate` — Error formatting
- `SavedServerConnection`, `SavedCollection`, `TestRunRecord` — API types
- `ApiResponse`, `ApiListResponse`, `ApiError` — API response wrappers

### Zod Schemas

- `collectionSchema` — Full collection validation
- `serverConfigSchema` — Server configuration
- `testDefinitionSchema` — Test case definition
- `assertionDefinitionSchema` — Assertion definition
- `simpleExpectationSchema` — Simple expect syntax
- `environmentSchema` — Environment variables
- `timeoutConfigSchema` — Timeout settings
- `rateLimitConfigSchema` — Rate limit settings
- `createServerSchema`, `updateServerSchema` — Server API payloads
- `createCollectionSchema`, `updateCollectionSchema` — Collection API payloads
- `triggerRunSchema`, `inspectConnectSchema`, `inspectCallSchema` — Action schemas
- `auditStartSchema`, `benchmarkStartSchema`, `docsGenerateSchema`, `scoreCalculateSchema` — Feature schemas

### Constants

- `EXIT_CODES` — CLI exit codes (SUCCESS, TEST_FAILURE, ERROR, CONFIG_ERROR, etc.)
- `ExitCode` — Exit code type

## License

MIT
