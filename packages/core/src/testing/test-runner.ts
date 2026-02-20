import type {
  CollectionDefinition,
  TestRunResult,
  TestResult,
  TestSummary,
  ServerConfig,
  RateLimitConfig,
} from '@mcpspec/shared';
import { MCPClient } from '../client/mcp-client.js';
import { TestScheduler } from './test-scheduler.js';
import { ProcessManagerImpl } from '../process/process-manager.js';
import { registerCleanupHandlers } from '../process/cleanup-handler.js';
import { RateLimiter } from '../rate-limiting/rate-limiter.js';
import { SecretMasker } from '../utils/secret-masker.js';
import { MCPSpecError } from '../errors/mcpspec-error.js';
import { randomUUID } from 'node:crypto';

export interface TestRunnerOptions {
  environment?: string;
  reporter?: TestRunReporter;
  parallelism?: number;
  tags?: string[];
  rateLimitConfig?: Partial<RateLimitConfig>;
}

export interface TestRunReporter {
  onRunStart(collectionName: string, testCount: number): void;
  onTestStart(testName: string): void;
  onTestComplete(result: TestResult): void;
  onRunComplete(result: TestRunResult): void;
  setSecretMasker?(masker: SecretMasker): void;
}

export class TestRunner {
  private processManager: ProcessManagerImpl;

  constructor() {
    this.processManager = new ProcessManagerImpl();
    registerCleanupHandlers(this.processManager);
  }

  async run(collection: CollectionDefinition, options?: TestRunnerOptions): Promise<TestRunResult> {
    const runId = randomUUID();
    const startedAt = new Date();
    const reporter = options?.reporter;
    const parallelism = options?.parallelism ?? 1;
    const tags = options?.tags;

    // Create secret masker and register server env secrets
    const secretMasker = new SecretMasker();
    const serverConfig = this.resolveServerConfig(collection.server);
    if (serverConfig.env) {
      secretMasker.registerFromEnv(serverConfig.env);
    }
    if (reporter && typeof (reporter as { setSecretMasker?: unknown }).setSecretMasker === 'function') {
      (reporter as { setSecretMasker: (m: SecretMasker) => void }).setSecretMasker(secretMasker);
    }

    reporter?.onRunStart(collection.name, collection.tests.length);

    // Resolve environment variables
    let envVariables: Record<string, unknown> = {};
    if (options?.environment && collection.environments) {
      const env = collection.environments[options.environment];
      if (!env) {
        throw new MCPSpecError('CONFIG_ERROR', `Environment "${options.environment}" not found`, {
          available: Object.keys(collection.environments),
        });
      }
      envVariables = env.variables;
    } else if (collection.defaultEnvironment && collection.environments) {
      const env = collection.environments[collection.defaultEnvironment];
      if (env) {
        envVariables = env.variables;
      }
    }

    // Connect to server
    const client = new MCPClient({
      serverConfig,
      processManager: this.processManager,
    });

    let results: TestResult[];

    try {
      await client.connect();

      // Create rate limiter if configured
      const rateLimiter = options?.rateLimitConfig
        ? new RateLimiter(options.rateLimitConfig)
        : undefined;

      // Use TestScheduler for both sequential and parallel
      const scheduler = new TestScheduler();
      results = await scheduler.schedule(collection.tests, client, {
        parallelism,
        tags,
        reporter,
        rateLimiter,
        initialVariables: envVariables as Record<string, unknown>,
      });

      if (rateLimiter) {
        await rateLimiter.stop();
      }
    } finally {
      await client.disconnect();
    }

    const completedAt = new Date();
    const summary = this.computeSummary(results, completedAt.getTime() - startedAt.getTime());

    const runResult: TestRunResult = {
      id: runId,
      collectionName: collection.name,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      results,
      summary,
    };

    reporter?.onRunComplete(runResult);
    return runResult;
  }

  private resolveServerConfig(server: string | ServerConfig): ServerConfig {
    if (typeof server === 'string') {
      const parts = server.split(/\s+/);
      const command = parts[0];
      if (!command) {
        throw new MCPSpecError('CONFIG_ERROR', 'Empty server command', {});
      }
      return {
        transport: 'stdio',
        command,
        args: parts.slice(1),
      };
    }
    return server;
  }

  private computeSummary(results: TestResult[], duration: number): TestSummary {
    return {
      total: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      duration,
    };
  }

  async cleanup(): Promise<void> {
    await this.processManager.shutdownAll();
  }
}
