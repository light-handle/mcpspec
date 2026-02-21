export interface PayloadSet {
  category: string;
  label: string;
  value: unknown;
  description: string;
}

export function getSafePayloads(): PayloadSet[] {
  return [
    // Empty values
    { category: 'empty', label: 'empty-string', value: '', description: 'Empty string input' },
    { category: 'empty', label: 'null-value', value: null, description: 'Null value input' },
    { category: 'empty', label: 'undefined-value', value: undefined, description: 'Undefined value input' },

    // Boundary values
    { category: 'boundary', label: 'zero', value: 0, description: 'Zero numeric input' },
    { category: 'boundary', label: 'negative', value: -1, description: 'Negative numeric input' },
    { category: 'boundary', label: 'max-int', value: Number.MAX_SAFE_INTEGER, description: 'Maximum safe integer' },
    { category: 'boundary', label: 'min-int', value: Number.MIN_SAFE_INTEGER, description: 'Minimum safe integer' },
    { category: 'boundary', label: 'float', value: 1.5, description: 'Float value where int expected' },

    // Long strings
    { category: 'long-string', label: 'long-256', value: 'A'.repeat(256), description: '256-char string' },
    { category: 'long-string', label: 'long-1024', value: 'B'.repeat(1024), description: '1024-char string' },

    // Special characters
    { category: 'special-chars', label: 'unicode', value: '\u0000\u001f\uffff', description: 'Unicode control characters' },
    { category: 'special-chars', label: 'newlines', value: 'line1\nline2\rline3', description: 'Newline characters' },
    { category: 'special-chars', label: 'tabs', value: '\t\t\t', description: 'Tab characters' },
    { category: 'special-chars', label: 'quotes', value: '"\'`', description: 'Quote characters' },
    { category: 'special-chars', label: 'backslash', value: '\\\\\\', description: 'Backslash characters' },

    // Type confusion
    { category: 'type-confusion', label: 'string-number', value: '123', description: 'Numeric string where number expected' },
    { category: 'type-confusion', label: 'string-boolean', value: 'true', description: 'Boolean string where boolean expected' },
    { category: 'type-confusion', label: 'array-value', value: [1, 2, 3], description: 'Array where scalar expected' },
    { category: 'type-confusion', label: 'object-value', value: { key: 'value' }, description: 'Object where scalar expected' },
    { category: 'type-confusion', label: 'boolean-value', value: true, description: 'Boolean where string expected' },
  ];
}
