// Error handling
export { MCPSpecError, NotImplementedError } from './errors/mcpspec-error.js';
export type { ErrorCode } from './errors/error-codes.js';
export { ERROR_CODE_MAP } from './errors/error-codes.js';
export { ERROR_TEMPLATES } from './errors/error-messages.js';
export { formatError } from './errors/error-formatter.js';

// Utilities
export { loadYamlSafely, YAML_LIMITS } from './utils/yaml-loader.js';
export { SecretMasker } from './utils/secret-masker.js';
export { resolveVariables } from './utils/variable-resolver.js';
export { queryJsonPath } from './utils/jsonpath.js';
export { getPlatformInfo } from './utils/platform.js';

// Process management
export { ProcessManagerImpl } from './process/process-manager.js';
export { ProcessRegistry } from './process/process-registry.js';
export { registerCleanupHandlers } from './process/cleanup-handler.js';

// Client
export type { MCPClientInterface } from './client/mcp-client-interface.js';
export { MCPClient } from './client/mcp-client.js';
export { ConnectionManager } from './client/connection-manager.js';
export { LoggingTransport } from './client/logging-transport.js';
export type { OnProtocolMessage } from './client/logging-transport.js';

// Testing
export { TestRunner } from './testing/test-runner.js';
export type { TestRunReporter } from './testing/test-runner.js';
export { TestExecutor } from './testing/test-executor.js';
export { TestScheduler } from './testing/test-scheduler.js';

// Reporters
export { ConsoleReporter } from './testing/reporters/console-reporter.js';
export { JsonReporter } from './testing/reporters/json-reporter.js';
export { JunitReporter } from './testing/reporters/junit-reporter.js';
export { HtmlReporter } from './testing/reporters/html-reporter.js';
export { TapReporter } from './testing/reporters/tap-reporter.js';

// Comparison
export { BaselineStore } from './testing/comparison/baseline-store.js';
export { ResultDiffer } from './testing/comparison/result-differ.js';
export type { RunDiff, TestDiff } from './testing/comparison/result-differ.js';

// Rate limiting
export { RateLimiter } from './rate-limiting/rate-limiter.js';

// Security
export { ScanConfig, DANGEROUS_TOOL_PATTERNS } from './security/scan-config.js';
export type { SecurityRule } from './security/rule-interface.js';
export { SecurityScanner } from './security/security-scanner.js';
export type { ScanProgress, DryRunResult } from './security/security-scanner.js';
export { PathTraversalRule } from './security/rules/path-traversal.js';
export { InputValidationRule } from './security/rules/input-validation.js';
export { ResourceExhaustionRule } from './security/rules/resource-exhaustion.js';
export { AuthBypassRule } from './security/rules/auth-bypass.js';
export { InjectionRule } from './security/rules/injection.js';
export { InformationDisclosureRule } from './security/rules/information-disclosure.js';
export { ToolPoisoningRule } from './security/rules/tool-poisoning.js';
export { ExcessiveAgencyRule } from './security/rules/excessive-agency.js';
export { getSafePayloads } from './security/payloads/safe-payloads.js';
export type { PayloadSet } from './security/payloads/safe-payloads.js';
export { getPlatformPayloads, getPayloadsForMode } from './security/payloads/platform-payloads.js';
export type { PlatformPayload } from './security/payloads/platform-payloads.js';

// Performance
export { Profiler, computeStats } from './performance/profiler.js';
export { BenchmarkRunner } from './performance/benchmark-runner.js';
export type { BenchmarkProgress } from './performance/benchmark-runner.js';
export { WaterfallGenerator } from './performance/waterfall-generator.js';

// Documentation
export { DocGenerator } from './documentation/doc-generator.js';
export type { DocGeneratorOptions, ServerDocData } from './documentation/doc-generator.js';
export { MarkdownGenerator } from './documentation/markdown-generator.js';
export { HtmlDocGenerator } from './documentation/html-generator.js';

// Scoring
export { MCPScoreCalculator } from './scoring/mcp-score.js';
export type { ScoreProgress } from './scoring/mcp-score.js';
export { BadgeGenerator } from './scoring/badge-generator.js';

// Recording
export { RecordingStore } from './recording/recording-store.js';
export { RecordingReplayer } from './recording/recording-replayer.js';
export type { ReplayProgress, ReplayResult } from './recording/recording-replayer.js';
export { RecordingDiffer } from './recording/recording-differ.js';

// Mock
export { MockMCPServer } from './mock/mock-server.js';
export type { MockServerConfig, MockServerStats } from './mock/mock-server.js';
export { ResponseMatcher } from './mock/response-matcher.js';
export type { MatchMode, OnMissingBehavior, ResponseMatcherConfig, MatchResult, MatcherStats } from './mock/response-matcher.js';
export { MockGenerator } from './mock/mock-generator.js';
export type { MockGeneratorOptions } from './mock/mock-generator.js';
