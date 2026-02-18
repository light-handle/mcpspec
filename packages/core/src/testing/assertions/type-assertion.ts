import type { AssertionResult } from '@mcpspec/shared';
import { NotImplementedError } from '../../errors/mcpspec-error.js';

export function assertType(
  _response: unknown,
  _path: string,
  _expected: string,
): AssertionResult {
  throw new NotImplementedError('Type assertion');
}
