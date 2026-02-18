import { NotImplementedError } from '@mcpspec/core';

export function localhostOnly(): never {
  throw new NotImplementedError('Localhost-only middleware (Phase 3)');
}
