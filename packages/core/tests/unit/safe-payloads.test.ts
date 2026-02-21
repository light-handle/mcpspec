import { describe, it, expect } from 'vitest';
import { getSafePayloads } from '../../src/security/payloads/safe-payloads.js';

describe('getSafePayloads', () => {
  it('should return an array of payloads', () => {
    const payloads = getSafePayloads();
    expect(payloads.length).toBeGreaterThan(0);
  });

  it('should have expected categories', () => {
    const payloads = getSafePayloads();
    const categories = new Set(payloads.map((p) => p.category));
    expect(categories.has('empty')).toBe(true);
    expect(categories.has('boundary')).toBe(true);
    expect(categories.has('long-string')).toBe(true);
    expect(categories.has('special-chars')).toBe(true);
    expect(categories.has('type-confusion')).toBe(true);
  });

  it('should have label, value, and description on each payload', () => {
    const payloads = getSafePayloads();
    for (const payload of payloads) {
      expect(payload.label).toBeDefined();
      expect(payload.description).toBeDefined();
      expect(payload).toHaveProperty('value');
    }
  });

  it('should include boundary values', () => {
    const payloads = getSafePayloads();
    const boundary = payloads.filter((p) => p.category === 'boundary');
    expect(boundary.length).toBeGreaterThanOrEqual(4);
    const labels = boundary.map((p) => p.label);
    expect(labels).toContain('zero');
    expect(labels).toContain('negative');
  });

  it('should include type confusion values', () => {
    const payloads = getSafePayloads();
    const confusion = payloads.filter((p) => p.category === 'type-confusion');
    expect(confusion.length).toBeGreaterThanOrEqual(3);
  });
});
