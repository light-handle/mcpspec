import { describe, it, expect } from 'vitest';
import { loadYamlSafely, YAML_LIMITS } from '../../src/utils/yaml-loader.js';
import { MCPSpecError } from '../../src/errors/mcpspec-error.js';

describe('loadYamlSafely', () => {
  it('should parse valid YAML', () => {
    const result = loadYamlSafely('name: test\nvalue: hello');
    expect(result).toEqual({ name: 'test', value: 'hello' });
  });

  it('should parse YAML arrays', () => {
    const result = loadYamlSafely('- one\n- two\n- three');
    expect(result).toEqual(['one', 'two', 'three']);
  });

  it('should parse nested YAML', () => {
    const yaml = `
server:
  command: npx
  args:
    - my-server
tests:
  - name: test1
    call: foo
`;
    const result = loadYamlSafely(yaml) as Record<string, unknown>;
    expect(result['server']).toBeDefined();
    expect(result['tests']).toBeDefined();
  });

  it('should treat all values as strings with FAILSAFE_SCHEMA', () => {
    const result = loadYamlSafely('count: 42\nactive: true') as Record<string, unknown>;
    // FAILSAFE_SCHEMA treats everything as strings
    expect(result['count']).toBe('42');
    expect(result['active']).toBe('true');
  });

  it('should throw YAML_TOO_LARGE for oversized content', () => {
    const huge = 'x'.repeat(YAML_LIMITS.maxFileSize + 1);
    expect(() => loadYamlSafely(huge)).toThrow(MCPSpecError);
    try {
      loadYamlSafely(huge);
    } catch (e) {
      expect((e as MCPSpecError).code).toBe('YAML_TOO_LARGE');
    }
  });

  it('should throw YAML_PARSE_ERROR for invalid YAML', () => {
    expect(() => loadYamlSafely('{{invalid: yaml}')).toThrow(MCPSpecError);
    try {
      loadYamlSafely('{{invalid: yaml}');
    } catch (e) {
      expect((e as MCPSpecError).code).toBe('YAML_PARSE_ERROR');
    }
  });

  it('should throw YAML_TOO_DEEP for deeply nested content', () => {
    // Build nesting deeper than limit
    let yaml = '';
    for (let i = 0; i <= YAML_LIMITS.maxNestingDepth + 2; i++) {
      yaml += '  '.repeat(i) + `level${i}:\n`;
    }
    yaml += '  '.repeat(YAML_LIMITS.maxNestingDepth + 3) + 'value: deep';
    expect(() => loadYamlSafely(yaml)).toThrow(MCPSpecError);
    try {
      loadYamlSafely(yaml);
    } catch (e) {
      expect((e as MCPSpecError).code).toBe('YAML_TOO_DEEP');
    }
  });

  it('should handle empty YAML', () => {
    const result = loadYamlSafely('');
    expect(result).toBeUndefined();
  });
});
