import { describe, it, expect } from 'vitest';
import { assertSchema } from '../../src/testing/assertions/schema-assertion.js';

describe('assertSchema', () => {
  it('should pass for valid object response', () => {
    const result = assertSchema({ id: 1, name: 'test' });
    expect(result.passed).toBe(true);
    expect(result.type).toBe('schema');
  });

  it('should pass for valid array response', () => {
    const result = assertSchema([1, 2, 3]);
    expect(result.passed).toBe(true);
  });

  it('should fail for null response', () => {
    const result = assertSchema(null);
    expect(result.passed).toBe(false);
  });

  it('should fail for undefined response', () => {
    const result = assertSchema(undefined);
    expect(result.passed).toBe(false);
  });

  it('should fail for non-object response', () => {
    const result = assertSchema('just a string');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not an object or array');
  });

  it('should validate required fields when schema is provided', () => {
    const schema = {
      properties: { id: {}, name: {} },
      required: ['id', 'name'],
    };
    const result = assertSchema({ id: 1, name: 'test' }, schema);
    expect(result.passed).toBe(true);
  });

  it('should fail when required fields are missing', () => {
    const schema = {
      properties: { id: {}, name: {} },
      required: ['id', 'name'],
    };
    const result = assertSchema({ id: 1 }, schema);
    expect(result.passed).toBe(false);
    expect(result.message).toContain('name');
  });

  it('should pass when no required fields specified in schema', () => {
    const schema = {
      properties: { id: {}, name: {} },
    };
    const result = assertSchema({ id: 1 }, schema);
    expect(result.passed).toBe(true);
  });
});
