import { NotImplementedError } from '../../errors/mcpspec-error.js';

export function getPlatformPayloads(): never {
  throw new NotImplementedError('Platform payloads');
}
