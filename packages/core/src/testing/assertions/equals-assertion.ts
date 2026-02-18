import type { AssertionResult } from '@mcpspec/shared';
import { queryJsonPath } from '../../utils/jsonpath.js';

export function assertEqual(
  response: unknown,
  path: string,
  expected: unknown,
): AssertionResult {
  const actual = queryJsonPath(response, path);
  // Use JSON.stringify for deep comparison
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  return {
    type: 'equals',
    passed,
    message: passed
      ? `${path} equals expected value`
      : `${path} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    expected,
    actual,
  };
}
