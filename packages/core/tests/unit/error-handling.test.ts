import { describe, it, expect } from 'vitest';
import { MCPSpecError, NotImplementedError } from '../../src/errors/mcpspec-error.js';
import { formatError } from '../../src/errors/error-formatter.js';
import { EXIT_CODES } from '@mcpspec/shared';

describe('MCPSpecError', () => {
  it('should create error with code and message', () => {
    const error = new MCPSpecError('CONNECTION_TIMEOUT', 'Timed out');
    expect(error.code).toBe('CONNECTION_TIMEOUT');
    expect(error.message).toBe('Timed out');
    expect(error.exitCode).toBe(EXIT_CODES.CONNECTION_ERROR);
    expect(error.name).toBe('MCPSpecError');
  });

  it('should include context', () => {
    const error = new MCPSpecError('TOOL_NOT_FOUND', 'Not found', {
      toolName: 'my_tool',
    });
    expect(error.context['toolName']).toBe('my_tool');
  });

  it('should be instanceof Error', () => {
    const error = new MCPSpecError('UNKNOWN_ERROR', 'test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPSpecError);
  });
});

describe('NotImplementedError', () => {
  it('should create with feature name', () => {
    const error = new NotImplementedError('SSE transport');
    expect(error.code).toBe('NOT_IMPLEMENTED');
    expect(error.message).toContain('SSE transport');
    expect(error.name).toBe('NotImplementedError');
  });
});

describe('formatError', () => {
  it('should format MCPSpecError with template', () => {
    const error = new MCPSpecError('CONNECTION_TIMEOUT', 'Timed out', {
      timeout: 5000,
    });
    const formatted = formatError(error);
    expect(formatted.title).toBe('Connection Timed Out');
    expect(formatted.description).toContain('5000');
    expect(formatted.suggestions.length).toBeGreaterThan(0);
    expect(formatted.code).toBe('CONNECTION_TIMEOUT');
  });

  it('should format MCPSpecError without template', () => {
    const error = new MCPSpecError('RATE_LIMITED', 'Too many requests');
    const formatted = formatError(error);
    expect(formatted.title).toBe('RATE_LIMITED');
    expect(formatted.description).toBe('Too many requests');
  });

  it('should format generic Error', () => {
    const error = new Error('Something broke');
    const formatted = formatError(error);
    expect(formatted.title).toBe('Unexpected Error');
    expect(formatted.description).toBe('Something broke');
  });

  it('should format unknown values', () => {
    const formatted = formatError('string error');
    expect(formatted.description).toBe('string error');
    expect(formatted.code).toBe('UNKNOWN_ERROR');
  });
});
