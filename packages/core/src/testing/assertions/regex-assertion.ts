import type { AssertionResult } from '@mcpspec/shared';
import { queryJsonPath } from '../../utils/jsonpath.js';

export function assertMatches(
  response: unknown,
  path: string,
  pattern: string,
): AssertionResult {
  const actual = queryJsonPath(response, path);
  const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);

  let passed = false;
  try {
    const regex = new RegExp(pattern);
    passed = regex.test(actualStr ?? '');
  } catch {
    return {
      type: 'matches',
      passed: false,
      message: `Invalid regex pattern: ${pattern}`,
      expected: pattern,
      actual: actualStr,
    };
  }

  return {
    type: 'matches',
    passed,
    message: passed
      ? `${path} matches pattern /${pattern}/`
      : `${path} does not match pattern /${pattern}/`,
    expected: pattern,
    actual: actualStr,
  };
}
