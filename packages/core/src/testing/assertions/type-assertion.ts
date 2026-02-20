import type { AssertionResult } from '@mcpspec/shared';
import { queryJsonPath } from '../../utils/jsonpath.js';

export function assertType(
  response: unknown,
  path: string,
  expected: string,
): AssertionResult {
  const value = queryJsonPath(response, path);

  let actualType: string;
  if (value === null) {
    actualType = 'null';
  } else if (Array.isArray(value)) {
    actualType = 'array';
  } else {
    actualType = typeof value;
  }

  if (value === undefined) {
    return {
      type: 'type',
      passed: false,
      message: `Path "${path}" does not exist`,
      expected,
      actual: 'undefined',
    };
  }

  const passed = actualType === expected;
  return {
    type: 'type',
    passed,
    message: passed
      ? `Value at "${path}" is type "${expected}"`
      : `Expected type "${expected}" at "${path}", got "${actualType}"`,
    expected,
    actual: actualType,
  };
}
