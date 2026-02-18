import { NotImplementedError } from '@mcpspec/core';

export function authMiddleware(): never {
  throw new NotImplementedError('Auth middleware (Phase 3)');
}
