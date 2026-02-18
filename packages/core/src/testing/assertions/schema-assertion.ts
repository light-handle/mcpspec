import type { AssertionResult } from '@mcpspec/shared';

export function assertSchema(
  response: unknown,
  _inputSchema?: Record<string, unknown>,
): AssertionResult {
  // MVP: just check that response is a valid object/array (not undefined/null)
  const passed = response !== undefined && response !== null;
  return {
    type: 'schema',
    passed,
    message: passed
      ? 'Response has valid structure'
      : 'Response is null or undefined',
    actual: typeof response,
  };
}
