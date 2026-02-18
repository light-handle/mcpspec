import { describe, it, expect } from 'vitest';
import { queryJsonPath, jsonPathExists } from '../../src/utils/jsonpath.js';

describe('queryJsonPath', () => {
  const data = {
    name: 'test',
    nested: {
      value: 42,
      deep: {
        item: 'found',
      },
    },
    items: [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ],
    tags: ['a', 'b', 'c'],
  };

  it('should return root with $', () => {
    expect(queryJsonPath(data, '$')).toEqual(data);
  });

  it('should access top-level properties', () => {
    expect(queryJsonPath(data, '$.name')).toBe('test');
  });

  it('should access nested properties', () => {
    expect(queryJsonPath(data, '$.nested.value')).toBe(42);
    expect(queryJsonPath(data, '$.nested.deep.item')).toBe('found');
  });

  it('should access array elements', () => {
    expect(queryJsonPath(data, '$.tags[0]')).toBe('a');
    expect(queryJsonPath(data, '$.tags[2]')).toBe('c');
  });

  it('should access array element properties', () => {
    expect(queryJsonPath(data, '$.items[0].name')).toBe('first');
    expect(queryJsonPath(data, '$.items[1].id')).toBe(2);
  });

  it('should return undefined for non-existent paths', () => {
    expect(queryJsonPath(data, '$.nonexistent')).toBeUndefined();
    expect(queryJsonPath(data, '$.nested.nonexistent')).toBeUndefined();
  });

  it('should return undefined for out-of-bounds array access', () => {
    expect(queryJsonPath(data, '$.tags[99]')).toBeUndefined();
  });

  it('should throw for invalid path format', () => {
    expect(() => queryJsonPath(data, 'no-dollar')).toThrow('must start with $');
  });
});

describe('jsonPathExists', () => {
  it('should return true for existing paths', () => {
    expect(jsonPathExists({ a: 1 }, '$.a')).toBe(true);
  });

  it('should return false for non-existing paths', () => {
    expect(jsonPathExists({ a: 1 }, '$.b')).toBe(false);
  });

  it('should return true for null values (they exist)', () => {
    expect(jsonPathExists({ a: null }, '$.a')).toBe(true);
  });
});
