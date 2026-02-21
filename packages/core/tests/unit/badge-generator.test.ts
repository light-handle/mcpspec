import { describe, it, expect } from 'vitest';
import { BadgeGenerator } from '../../src/scoring/badge-generator.js';
import type { MCPScore } from '@mcpspec/shared';

function makeScore(overall: number): MCPScore {
  return {
    overall,
    categories: {
      documentation: overall,
      schemaQuality: overall,
      errorHandling: overall,
      performance: overall,
      security: overall,
    },
  };
}

describe('BadgeGenerator', () => {
  const generator = new BadgeGenerator();

  it('returns SVG string containing <svg', () => {
    const svg = generator.generate(makeScore(85));
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains score number in text', () => {
    const svg = generator.generate(makeScore(73));
    expect(svg).toContain('73/100');
  });

  it('contains MCP Score label', () => {
    const svg = generator.generate(makeScore(50));
    expect(svg).toContain('MCP Score');
  });

  it('uses green color for score >= 80', () => {
    expect(generator.getColor(80)).toBe('#4c1');
    expect(generator.getColor(100)).toBe('#4c1');
    expect(generator.getColor(95)).toBe('#4c1');
  });

  it('uses yellow color for score 60-79', () => {
    expect(generator.getColor(60)).toBe('#dfb317');
    expect(generator.getColor(79)).toBe('#dfb317');
    expect(generator.getColor(70)).toBe('#dfb317');
  });

  it('uses red color for score < 60', () => {
    expect(generator.getColor(59)).toBe('#e05d44');
    expect(generator.getColor(0)).toBe('#e05d44');
    expect(generator.getColor(30)).toBe('#e05d44');
  });

  it('includes correct color in SVG for high score', () => {
    const svg = generator.generate(makeScore(90));
    expect(svg).toContain('#4c1');
  });

  it('includes correct color in SVG for low score', () => {
    const svg = generator.generate(makeScore(30));
    expect(svg).toContain('#e05d44');
  });
});
