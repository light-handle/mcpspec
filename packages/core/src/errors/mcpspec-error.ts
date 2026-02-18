import type { ErrorCode } from './error-codes.js';
import { ERROR_CODE_MAP } from './error-codes.js';

export class MCPSpecError extends Error {
  public readonly code: ErrorCode;
  public readonly exitCode: number;
  public readonly context: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MCPSpecError';
    this.code = code;
    this.exitCode = ERROR_CODE_MAP[code];
    this.context = context;
  }
}

export class NotImplementedError extends MCPSpecError {
  constructor(feature: string) {
    super('NOT_IMPLEMENTED', `${feature} is not yet implemented. Coming in a future release.`, {
      feature,
    });
    this.name = 'NotImplementedError';
  }
}
