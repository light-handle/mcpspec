import type { AssertionResult } from '@mcpspec/shared';
import { NotImplementedError } from '../../errors/mcpspec-error.js';

export function assertBinary(
  _response: unknown,
  _expected: string,
): AssertionResult {
  throw new NotImplementedError('Binary assertion');
}
