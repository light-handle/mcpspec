import type { AssertionResult } from '@mcpspec/shared';
import { NotImplementedError } from '../../errors/mcpspec-error.js';

export function assertExpression(
  _response: unknown,
  _expr: string,
): AssertionResult {
  throw new NotImplementedError('Expression assertion (expr-eval)');
}
