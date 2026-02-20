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
