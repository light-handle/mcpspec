import type { AssertionResult } from '@mcpspec/shared';
import { jsonPathExists } from '../../utils/jsonpath.js';

export function assertSchema(
  response: unknown,
  inputSchema?: Record<string, unknown>,
): AssertionResult {
  // Check that response is a valid object/array (not undefined/null)
  if (response === undefined || response === null) {
    return {
      type: 'schema',
      passed: false,
      message: 'Response is null or undefined',
      actual: typeof response,
    };
  }

  if (typeof response !== 'object') {
    return {
      type: 'schema',
      passed: false,
      message: `Response is not an object or array, got ${typeof response}`,
      actual: typeof response,
    };
  }

  // If a schema with properties is provided, validate required fields exist
  if (inputSchema && typeof inputSchema['properties'] === 'object' && inputSchema['properties'] !== null) {
    const properties = inputSchema['properties'] as Record<string, unknown>;
    const required = Array.isArray(inputSchema['required']) ? inputSchema['required'] as string[] : [];

    const missingFields: string[] = [];
    for (const field of required) {
      if (!jsonPathExists(response, `$.${field}`)) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        type: 'schema',
        passed: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        expected: Object.keys(properties),
        actual: Object.keys(response as Record<string, unknown>),
      };
    }
  }

  return {
    type: 'schema',
    passed: true,
    message: 'Response has valid structure',
    actual: typeof response,
  };
}
