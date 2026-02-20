import type {
  TestDefinition,
  TestResult,
  AssertionResult,
  AssertionDefinition,
  SimpleExpectation,
} from '@mcpspec/shared';
import { DEFAULT_TIMEOUTS } from '@mcpspec/shared';
import type { MCPClientInterface, ToolCallResult } from '../client/mcp-client-interface.js';
import { assertSchema } from './assertions/schema-assertion.js';
import { assertEqual } from './assertions/equals-assertion.js';
import { assertContains } from './assertions/contains-assertion.js';
import { assertExists } from './assertions/exists-assertion.js';
import { assertMatches } from './assertions/regex-assertion.js';
import { assertType } from './assertions/type-assertion.js';
import { assertExpression } from './assertions/expression-assertion.js';
import { assertBinary } from './assertions/binary-assertion.js';
import { queryJsonPath } from '../utils/jsonpath.js';
import { resolveObjectVariables } from '../utils/variable-resolver.js';
import { MCPSpecError } from '../errors/mcpspec-error.js';
import type { RateLimiter } from '../rate-limiting/rate-limiter.js';
import { calculateBackoff, sleep } from '../rate-limiting/backoff.js';

export class TestExecutor {
  private variables: Record<string, unknown> = {};
  private rateLimiter: RateLimiter | undefined;

  constructor(initialVariables?: Record<string, unknown>, rateLimiter?: RateLimiter) {
    if (initialVariables) {
      this.variables = { ...initialVariables };
    }
    this.rateLimiter = rateLimiter;
  }

  async execute(test: TestDefinition, client: MCPClientInterface): Promise<TestResult> {
    const timeout = test.timeout ?? DEFAULT_TIMEOUTS.test;
    const retries = test.retries ?? 0;

    // Try with retries (only for thrown errors, not assertion failures)
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = calculateBackoff(attempt - 1);
        await sleep(delay);
      }

      try {
        return await this.executeWithTimeout(test, client, timeout);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Only retry on thrown errors (connection failures, etc.)
        if (attempt < retries) {
          continue;
        }
      }
    }

    // All retries exhausted
    return {
      testId: test.id ?? test.name,
      testName: test.name,
      status: 'error',
      duration: 0,
      assertions: [],
      error: lastError?.message ?? 'Unknown error',
    };
  }

  private executeWithTimeout(
    test: TestDefinition,
    client: MCPClientInterface,
    timeoutMs: number,
  ): Promise<TestResult> {
    return Promise.race([
      this.executeInternal(test, client),
      new Promise<TestResult>((_, reject) =>
        setTimeout(() => reject(new MCPSpecError('TIMEOUT', `Test "${test.name}" timed out after ${timeoutMs}ms`, {
          testName: test.name,
          timeout: timeoutMs,
        })), timeoutMs),
      ),
    ]);
  }

  private async executeInternal(test: TestDefinition, client: MCPClientInterface): Promise<TestResult> {
    const startTime = Date.now();
    const testId = test.id ?? test.name;
    const assertionResults: AssertionResult[] = [];

    try {
      const toolName = test.call ?? test.tool;
      if (!toolName) {
        throw new MCPSpecError('CONFIG_ERROR', `Test "${test.name}" has no tool/call defined`, {
          testName: test.name,
        });
      }

      const input = test.with ?? test.input ?? {};
      const resolvedInput = resolveObjectVariables(input, this.variables) as Record<string, unknown>;

      let result: ToolCallResult;
      try {
        const callFn = () => client.callTool(toolName, resolvedInput);
        result = this.rateLimiter
          ? await this.rateLimiter.schedule(callFn)
          : await callFn();
      } catch (err) {
        if (test.expectError) {
          return {
            testId,
            testName: test.name,
            status: 'passed',
            duration: Date.now() - startTime,
            assertions: [
              {
                type: 'schema',
                passed: true,
                message: 'Expected error occurred',
              },
            ],
          };
        }
        throw err;
      }

      if (test.expectError) {
        if (result.isError) {
          return {
            testId,
            testName: test.name,
            status: 'passed',
            duration: Date.now() - startTime,
            assertions: [
              {
                type: 'schema',
                passed: true,
                message: 'Expected error response received',
              },
            ],
          };
        }
        assertionResults.push({
          type: 'schema',
          passed: false,
          message: 'Expected error but got success',
        });
        return {
          testId,
          testName: test.name,
          status: 'failed',
          duration: Date.now() - startTime,
          assertions: assertionResults,
        };
      }

      // Build response object from content
      const response = this.buildResponse(result);

      // Process assertions (advanced format)
      if (test.assertions) {
        for (const assertion of test.assertions) {
          assertionResults.push(this.runAssertion(assertion, response, Date.now() - startTime));
        }
      }

      // Process expect (simple format)
      if (test.expect) {
        for (const expectation of test.expect) {
          assertionResults.push(this.runSimpleExpectation(expectation, response));
        }
      }

      // If no assertions defined, just check that we got a response
      if (!test.assertions && !test.expect) {
        assertionResults.push(assertSchema(response));
      }

      // Extract variables
      const extractedVariables: Record<string, unknown> = {};
      if (test.extract) {
        for (const extraction of test.extract) {
          const value = queryJsonPath(response, extraction.path);
          extractedVariables[extraction.name] = value;
          this.variables[extraction.name] = value;
        }
      }

      const allPassed = assertionResults.every((r) => r.passed);

      return {
        testId,
        testName: test.name,
        status: allPassed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        assertions: assertionResults,
        extractedVariables: Object.keys(extractedVariables).length > 0 ? extractedVariables : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        testId,
        testName: test.name,
        status: 'error',
        duration: Date.now() - startTime,
        assertions: assertionResults,
        error: message,
      };
    }
  }

  private buildResponse(result: ToolCallResult): unknown {
    const contents = result.content;
    if (!Array.isArray(contents) || contents.length === 0) {
      return {};
    }

    // If single text content, try to parse as JSON, otherwise return as object
    if (contents.length === 1) {
      const item = contents[0] as Record<string, unknown>;
      if (item['type'] === 'text' && typeof item['text'] === 'string') {
        try {
          return JSON.parse(item['text'] as string);
        } catch {
          return { content: item['text'], text: item['text'] };
        }
      }
      return item;
    }

    return { content: contents };
  }

  private runAssertion(
    assertion: AssertionDefinition,
    response: unknown,
    durationMs: number,
  ): AssertionResult {
    switch (assertion.type) {
      case 'schema':
        return assertSchema(response);
      case 'equals':
        return assertEqual(response, assertion.path ?? '$', assertion.value);
      case 'contains':
        return assertContains(response, assertion.path ?? '$', assertion.value);
      case 'exists':
        return assertExists(response, assertion.path ?? '$');
      case 'matches':
        return assertMatches(response, assertion.path ?? '$', assertion.pattern ?? '');
      case 'type':
        return assertType(response, assertion.path ?? '$', (assertion.expected as string) ?? 'object');
      case 'expression':
        return assertExpression(response, assertion.expr ?? '');
      case 'mimeType':
        return assertBinary(response, (assertion.expected as string) ?? '');
      case 'length': {
        const value = queryJsonPath(response, assertion.path ?? '$');
        const len = Array.isArray(value)
          ? value.length
          : typeof value === 'string'
            ? value.length
            : -1;
        if (len === -1) {
          return {
            type: 'length',
            passed: false,
            message: `Value at "${assertion.path}" is not an array or string`,
            actual: typeof value,
          };
        }
        const op = assertion.operator ?? 'eq';
        const target = typeof assertion.value === 'number' ? assertion.value : Number(assertion.value);
        let passed = false;
        switch (op) {
          case 'eq': passed = len === target; break;
          case 'gt': passed = len > target; break;
          case 'gte': passed = len >= target; break;
          case 'lt': passed = len < target; break;
          case 'lte': passed = len <= target; break;
          default: passed = len === target;
        }
        return {
          type: 'length',
          passed,
          message: passed
            ? `Length ${len} satisfies ${op} ${target}`
            : `Length ${len} does not satisfy ${op} ${target}`,
          expected: target,
          actual: len,
        };
      }
      case 'latency':
        return {
          type: 'latency',
          passed: durationMs <= (assertion.maxMs ?? 1000),
          message:
            durationMs <= (assertion.maxMs ?? 1000)
              ? `Response time ${durationMs}ms within ${assertion.maxMs ?? 1000}ms limit`
              : `Response time ${durationMs}ms exceeds ${assertion.maxMs ?? 1000}ms limit`,
          expected: assertion.maxMs,
          actual: durationMs,
        };
      default:
        return {
          type: assertion.type,
          passed: false,
          message: `Assertion type "${assertion.type}" not yet implemented`,
        };
    }
  }

  private runSimpleExpectation(
    expectation: SimpleExpectation,
    response: unknown,
  ): AssertionResult {
    if ('exists' in expectation) {
      return assertExists(response, expectation.exists);
    }
    if ('equals' in expectation) {
      const [path, value] = expectation.equals;
      return assertEqual(response, path, value);
    }
    if ('contains' in expectation) {
      const [path, value] = expectation.contains;
      return assertContains(response, path, value);
    }
    if ('matches' in expectation) {
      const [path, pattern] = expectation.matches;
      return assertMatches(response, path, pattern);
    }
    return {
      type: 'schema',
      passed: false,
      message: 'Unknown expectation type',
    };
  }

  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }
}
