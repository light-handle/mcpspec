import type { AssertionResult } from '@mcpspec/shared';

export function assertBinary(
  response: unknown,
  expected: string,
): AssertionResult {
  // Check for mimeType on the response directly
  let actual: string | undefined;

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    // Direct mimeType field
    if (typeof obj['mimeType'] === 'string') {
      actual = obj['mimeType'];
    }
    // Check content array items for mimeType
    else if (Array.isArray(obj['content'])) {
      for (const item of obj['content']) {
        if (item && typeof item === 'object' && typeof (item as Record<string, unknown>)['mimeType'] === 'string') {
          actual = (item as Record<string, unknown>)['mimeType'] as string;
          break;
        }
      }
    }
  }

  if (actual === undefined) {
    return {
      type: 'mimeType',
      passed: false,
      message: 'No mimeType found in response',
      expected,
      actual: 'undefined',
    };
  }

  const passed = actual === expected;
  return {
    type: 'mimeType',
    passed,
    message: passed
      ? `MIME type matches "${expected}"`
      : `Expected MIME type "${expected}", got "${actual}"`,
    expected,
    actual,
  };
}
