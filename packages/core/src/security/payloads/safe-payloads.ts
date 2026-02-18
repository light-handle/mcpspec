import { NotImplementedError } from '../../errors/mcpspec-error.js';

export function getSafePayloads(): never {
  throw new NotImplementedError('Safe payloads');
}
