import type { AssertionResult } from '@mcpspec/shared';
import { jsonPathExists } from '../../utils/jsonpath.js';

export function assertExists(
  response: unknown,
  path: string,
): AssertionResult {
  const passed = jsonPathExists(response, path);
  return {
    type: 'exists',
    passed,
    message: passed ? `${path} exists` : `${path} does not exist`,
  };
}
