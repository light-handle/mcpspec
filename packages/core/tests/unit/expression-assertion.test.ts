import { describe, it, expect } from 'vitest';
import { assertExpression } from '../../src/testing/assertions/expression-assertion.js';

describe('assertExpression', () => {
  it('should pass when expression evaluates to true', () => {
    const result = assertExpression({ total: 10, count: 5 }, 'response.total > response.count');
    expect(result.passed).toBe(true);
    expect(result.type).toBe('expression');
  });

  it('should fail when expression evaluates to false', () => {
    const result = assertExpression({ total: 3 }, 'response.total > 10');
    expect(result.passed).toBe(false);
  });

  it('should handle equality comparisons', () => {
    const result = assertExpression({ status: 200 }, 'response.status == 200');
    expect(result.passed).toBe(true);
  });

  it('should handle logical AND', () => {
    const result = assertExpression({ a: 1, b: 2 }, 'response.a == 1 and response.b == 2');
    expect(result.passed).toBe(true);
  });

  it('should handle logical OR', () => {
    const result = assertExpression({ a: 5 }, 'response.a == 1 or response.a == 5');
    expect(result.passed).toBe(true);
  });

  it('should return failed assertion on eval error (not throw)', () => {
    const result = assertExpression({}, 'invalid syntax !!!');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Expression evaluation error');
  });

  it('should handle nested property access', () => {
    const result = assertExpression({ data: { value: 42 } }, 'response.data.value == 42');
    expect(result.passed).toBe(true);
  });
});
