import { describe, it, expect } from 'vitest';
import { assertBinary } from '../../src/testing/assertions/binary-assertion.js';

describe('assertBinary (mimeType)', () => {
  it('should pass when mimeType matches directly on response', () => {
    const result = assertBinary({ mimeType: 'image/png', data: '...' }, 'image/png');
    expect(result.passed).toBe(true);
    expect(result.type).toBe('mimeType');
  });

  it('should fail when mimeType does not match', () => {
    const result = assertBinary({ mimeType: 'text/plain' }, 'image/png');
    expect(result.passed).toBe(false);
    expect(result.actual).toBe('text/plain');
    expect(result.expected).toBe('image/png');
  });

  it('should find mimeType in content array items', () => {
    const result = assertBinary(
      { content: [{ type: 'image', mimeType: 'image/jpeg', data: '...' }] },
      'image/jpeg',
    );
    expect(result.passed).toBe(true);
  });

  it('should fail when no mimeType is found', () => {
    const result = assertBinary({ data: 'hello' }, 'image/png');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('No mimeType found');
  });

  it('should handle null response', () => {
    const result = assertBinary(null, 'image/png');
    expect(result.passed).toBe(false);
  });
});
