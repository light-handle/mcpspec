import { describe, it, expect } from 'vitest';
import { WaterfallGenerator } from '../../src/performance/waterfall-generator.js';
import type { ProfileEntry } from '@mcpspec/shared';

describe('WaterfallGenerator', () => {
  const generator = new WaterfallGenerator();

  it('should return empty array for empty entries', () => {
    const result = generator.generate([]);
    expect(result).toEqual([]);
  });

  it('should transform profile entries to waterfall entries', () => {
    const entries: ProfileEntry[] = [
      { toolName: 'tool_a', startMs: 100, durationMs: 50, success: true },
      { toolName: 'tool_b', startMs: 120, durationMs: 30, success: true },
      { toolName: 'tool_c', startMs: 160, durationMs: 40, success: false, error: 'fail' },
    ];

    const result = generator.generate(entries);

    expect(result.length).toBe(3);
    expect(result[0].label).toBe('tool_a');
    expect(result[0].startMs).toBe(0); // normalized to 0
    expect(result[0].durationMs).toBe(50);
    expect(result[1].startMs).toBe(20); // 120 - 100
    expect(result[2].label).toBe('tool_c (ERR)');
  });

  it('should generate ASCII waterfall', () => {
    const entries: ProfileEntry[] = [
      { toolName: 'fast', startMs: 0, durationMs: 10, success: true },
      { toolName: 'slow', startMs: 5, durationMs: 90, success: true },
    ];

    const waterfall = generator.generate(entries);
    const ascii = generator.toAscii(waterfall, 60);

    expect(ascii).toContain('fast');
    expect(ascii).toContain('slow');
    expect(ascii.split('\n').length).toBe(2);
  });

  it('should handle empty waterfall for ASCII', () => {
    const ascii = generator.toAscii([], 60);
    expect(ascii).toBe('');
  });

  it('should include duration in ASCII output', () => {
    const entries: ProfileEntry[] = [
      { toolName: 'tool', startMs: 0, durationMs: 42.5, success: true },
    ];
    const waterfall = generator.generate(entries);
    const ascii = generator.toAscii(waterfall, 60);
    expect(ascii).toContain('42.5ms');
  });
});
