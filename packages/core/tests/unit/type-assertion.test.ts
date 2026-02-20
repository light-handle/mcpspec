import { describe, it, expect } from 'vitest';
import { assertType } from '../../src/testing/assertions/type-assertion.js';

describe('assertType', () => {
  it('should pass when value matches expected type "string"', () => {
    const result = assertType({ name: 'hello' }, '$.name', 'string');
    expect(result.passed).toBe(true);
    expect(result.type).toBe('type');
  });

  it('should pass when value matches expected type "number"', () => {
    const result = assertType({ count: 42 }, '$.count', 'number');
    expect(result.passed).toBe(true);
  });

  it('should pass when value matches expected type "boolean"', () => {
    const result = assertType({ active: true }, '$.active', 'boolean');
    expect(result.passed).toBe(true);
  });

  it('should pass when value matches expected type "object"', () => {
    const result = assertType({ data: { nested: true } }, '$.data', 'object');
    expect(result.passed).toBe(true);
  });

  it('should pass when value matches expected type "array"', () => {
    const result = assertType({ items: [1, 2, 3] }, '$.items', 'array');
    expect(result.passed).toBe(true);
  });

  it('should pass when value matches expected type "null"', () => {
    const result = assertType({ value: null }, '$.value', 'null');
    expect(result.passed).toBe(true);
  });

  it('should fail when type does not match', () => {
    const result = assertType({ name: 'hello' }, '$.name', 'number');
    expect(result.passed).toBe(false);
    expect(result.actual).toBe('string');
    expect(result.expected).toBe('number');
  });

  it('should fail when path does not exist', () => {
    const result = assertType({ name: 'hello' }, '$.missing', 'string');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('does not exist');
  });

  it('should distinguish array from object', () => {
    const result = assertType({ items: [1, 2] }, '$.items', 'object');
    expect(result.passed).toBe(false);
    expect(result.actual).toBe('array');
  });
});
