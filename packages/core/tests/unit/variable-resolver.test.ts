import { describe, it, expect } from 'vitest';
import { resolveVariables, resolveObjectVariables } from '../../src/utils/variable-resolver.js';

describe('resolveVariables', () => {
  it('should resolve simple variables', () => {
    expect(resolveVariables('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('should resolve multiple variables', () => {
    expect(
      resolveVariables('{{greeting}} {{name}}!', { greeting: 'Hi', name: 'Bob' }),
    ).toBe('Hi Bob!');
  });

  it('should leave unresolved variables as-is', () => {
    expect(resolveVariables('Hello {{name}}!', {})).toBe('Hello {{name}}!');
  });

  it('should resolve nested paths', () => {
    expect(
      resolveVariables('{{user.name}}', { user: { name: 'Alice' } }),
    ).toBe('Alice');
  });

  it('should handle no variables in template', () => {
    expect(resolveVariables('plain text', { name: 'test' })).toBe('plain text');
  });

  it('should convert non-string values to strings', () => {
    expect(resolveVariables('count: {{count}}', { count: 42 })).toBe('count: 42');
  });
});

describe('resolveObjectVariables', () => {
  it('should resolve variables in nested objects', () => {
    const obj = {
      name: '{{name}}',
      nested: {
        value: '{{value}}',
      },
    };
    const result = resolveObjectVariables(obj, { name: 'test', value: 'hello' });
    expect(result).toEqual({
      name: 'test',
      nested: { value: 'hello' },
    });
  });

  it('should resolve variables in arrays', () => {
    const arr = ['{{a}}', '{{b}}', 'static'];
    const result = resolveObjectVariables(arr, { a: 'x', b: 'y' });
    expect(result).toEqual(['x', 'y', 'static']);
  });

  it('should pass through non-string values', () => {
    expect(resolveObjectVariables(42, {})).toBe(42);
    expect(resolveObjectVariables(null, {})).toBeNull();
    expect(resolveObjectVariables(true, {})).toBe(true);
  });
});
