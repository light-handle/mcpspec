import type { TestDefinition, TestResult } from '@mcpspec/shared';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';
import { TestExecutor } from './test-executor.js';
import type { RateLimiter } from '../rate-limiting/rate-limiter.js';
import type { TestRunReporter } from './test-runner.js';

export interface SchedulerOptions {
  parallelism: number;
  tags?: string[];
  reporter?: TestRunReporter;
  rateLimiter?: RateLimiter;
  initialVariables?: Record<string, unknown>;
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((t) => (t.startsWith('@') ? t.slice(1) : t));
}

function matchesTags(test: TestDefinition, filterTags: string[]): boolean {
  if (filterTags.length === 0) return true;
  if (!test.tags || test.tags.length === 0) return false;
  const normalized = normalizeTags(test.tags);
  const normalizedFilter = normalizeTags(filterTags);
  return normalizedFilter.some((ft) => normalized.includes(ft));
}

export class TestScheduler {
  async schedule(
    tests: TestDefinition[],
    client: MCPClientInterface,
    options: SchedulerOptions,
  ): Promise<TestResult[]> {
    const { parallelism, tags, reporter, rateLimiter, initialVariables } = options;

    // Filter tests by tags
    const filteredTests = tags && tags.length > 0
      ? tests.filter((t) => matchesTags(t, tags))
      : tests;

    // Mark skipped tests
    const skippedTests = tags && tags.length > 0
      ? tests.filter((t) => !matchesTags(t, tags))
      : [];

    const skippedResults: TestResult[] = skippedTests.map((t) => ({
      testId: t.id ?? t.name,
      testName: t.name,
      status: 'skipped' as const,
      duration: 0,
      assertions: [],
    }));

    if (filteredTests.length === 0) {
      return skippedResults;
    }

    // Sequential execution
    if (parallelism <= 1) {
      const executor = new TestExecutor(initialVariables, rateLimiter);
      const results: TestResult[] = [];

      for (const test of filteredTests) {
        reporter?.onTestStart(test.name);
        const result = await executor.execute(test, client);
        results.push(result);
        reporter?.onTestComplete(result);
      }

      return [...results, ...skippedResults];
    }

    // Parallel execution with semaphore
    // Each task gets its own TestExecutor to avoid shared variable state corruption
    let running = 0;
    const results: TestResult[] = new Array(filteredTests.length);
    const waitQueue: Array<() => void> = [];

    function acquire(): Promise<void> {
      if (running < parallelism) {
        running++;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        waitQueue.push(resolve);
      });
    }

    function release(): void {
      running--;
      const next = waitQueue.shift();
      if (next) {
        running++;
        next();
      }
    }

    const tasks = filteredTests.map((test, i) => {
      return (async () => {
        await acquire();
        try {
          const executor = new TestExecutor(initialVariables, rateLimiter);
          reporter?.onTestStart(test.name);
          const result = await executor.execute(test, client);
          results[i] = result;
          reporter?.onTestComplete(result);
        } finally {
          release();
        }
      })();
    });

    await Promise.allSettled(tasks);

    // Fill any missing results (shouldn't happen, but safety)
    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        results[i] = {
          testId: filteredTests[i]!.id ?? filteredTests[i]!.name,
          testName: filteredTests[i]!.name,
          status: 'error',
          duration: 0,
          assertions: [],
          error: 'Test execution failed unexpectedly',
        };
      }
    }

    return [...results, ...skippedResults];
  }
}
