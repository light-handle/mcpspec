import type { AssertionResult } from '@mcpspec/shared';
import { queryJsonPath } from '../../utils/jsonpath.js';

export function assertContains(
  response: unknown,
  path: string,
  value: unknown,
): AssertionResult {
  const actual = queryJsonPath(response, path);

  let passed = false;
  if (Array.isArray(actual)) {
    passed = actual.some((item) => JSON.stringify(item) === JSON.stringify(value));
  } else if (typeof actual === 'string' && typeof value === 'string') {
    passed = actual.includes(value);
  }

  return {
    type: 'contains',
    passed,
    message: passed
      ? `${path} contains ${JSON.stringify(value)}`
      : `${path} does not contain ${JSON.stringify(value)}`,
    expected: value,
    actual,
  };
}
