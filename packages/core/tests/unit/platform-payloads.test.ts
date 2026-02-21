import { describe, it, expect } from 'vitest';
import { getPlatformPayloads, getPayloadsForMode } from '../../src/security/payloads/platform-payloads.js';

describe('getPlatformPayloads', () => {
  it('should return an array of payloads', () => {
    const payloads = getPlatformPayloads();
    expect(payloads.length).toBeGreaterThan(0);
  });

  it('should filter by current platform', () => {
    const payloads = getPlatformPayloads();
    const currentPlatform = process.platform;
    for (const payload of payloads) {
      // Each payload should either have empty platforms (all) or include current platform
      expect(
        payload.platforms.length === 0 || payload.platforms.includes(currentPlatform as NodeJS.Platform),
      ).toBe(true);
    }
  });

  it('should have expected categories', () => {
    const payloads = getPlatformPayloads();
    const categories = new Set(payloads.map((p) => p.category));
    expect(categories.has('path-traversal')).toBe(true);
  });
});

describe('getPayloadsForMode', () => {
  it('should return fewer payloads for passive mode', () => {
    const passive = getPayloadsForMode('passive');
    const active = getPayloadsForMode('active');
    expect(passive.length).toBeLessThanOrEqual(active.length);
  });

  it('should return more or equal payloads for aggressive mode', () => {
    const active = getPayloadsForMode('active');
    const aggressive = getPayloadsForMode('aggressive');
    expect(aggressive.length).toBeGreaterThanOrEqual(active.length);
  });

  it('should have minMode of passive or less for passive payloads', () => {
    const passive = getPayloadsForMode('passive');
    for (const payload of passive) {
      expect(payload.minMode).toBe('passive');
    }
  });

  it('should include active payloads in active mode', () => {
    const active = getPayloadsForMode('active');
    const hasActivePayloads = active.some((p) => p.minMode === 'active');
    expect(hasActivePayloads).toBe(true);
  });
});
