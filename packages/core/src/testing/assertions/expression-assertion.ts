import type { AssertionResult } from '@mcpspec/shared';
import { Parser } from 'expr-eval';

export function assertExpression(
  response: unknown,
  expr: string,
): AssertionResult {
  try {
    const parser = new Parser();
    const result = parser.evaluate(expr, { response });

    const passed = Boolean(result);
    return {
      type: 'expression',
      passed,
      message: passed
        ? `Expression "${expr}" evaluated to true`
        : `Expression "${expr}" evaluated to false`,
      expected: true,
      actual: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      type: 'expression',
      passed: false,
      message: `Expression evaluation error: ${message}`,
      expected: true,
      actual: message,
    };
  }
}
