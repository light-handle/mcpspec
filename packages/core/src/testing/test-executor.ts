import type {
  TestDefinition,
  TestResult,
  AssertionResult,
  AssertionDefinition,
  SimpleExpectation,
} from '@mcpspec/shared';
import type { MCPClientInterface, ToolCallResult } from '../client/mcp-client-interface.js';
import { assertSchema } from './assertions/schema-assertion.js';
import { assertEqual } from './assertions/equals-assertion.js';
import { assertContains } from './assertions/contains-assertion.js';
import { assertExists } from './assertions/exists-assertion.js';
import { assertMatches } from './assertions/regex-assertion.js';
import { queryJsonPath } from '../utils/jsonpath.js';
import { resolveObjectVariables } from '../utils/variable-resolver.js';
import { MCPSpecError } from '../errors/mcpspec-error.js';

export class TestExecutor {
  private variables: Record<string, unknown> = {};

  constructor(initialVariables?: Record<string, unknown>) {
    if (initialVariables) {
      this.variables = { ...initialVariables };
    }
  }

  async execute(test: TestDefinition, client: MCPClientInterface): Promise<TestResult> {
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
        result = await client.callTool(toolName, resolvedInput);
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
