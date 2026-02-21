import { describe, it, expect } from 'vitest';
import { Profiler, computeStats } from '../../src/performance/profiler.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('computeStats', () => {
  it('should return zeros for empty array', () => {
    const stats = computeStats([]);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.median).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.p99).toBe(0);
    expect(stats.stddev).toBe(0);
  });

  it('should compute correct stats for known values', () => {
    // 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = computeStats(sorted);

    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
    expect(stats.mean).toBe(5.5);
    expect(stats.median).toBe(5.5); // even count: (5+6)/2
    expect(stats.p95).toBe(10);
    expect(stats.p99).toBe(10);
    expect(stats.stddev).toBeCloseTo(2.8723, 3);
  });

  it('should handle single value', () => {
    const stats = computeStats([42]);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.stddev).toBe(0);
  });

  it('should compute median for odd count', () => {
    const stats = computeStats([1, 2, 3, 4, 5]);
    expect(stats.median).toBe(3);
  });
});

describe('Profiler', () => {
  it('should record profile entries', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const profiler = new Profiler();
    const entry = await profiler.profileCall(client, 'test_tool', { key: 'value' });

    expect(entry.toolName).toBe('test_tool');
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.success).toBe(true);
    expect(entry.error).toBeUndefined();
  });

  it('should track errors', async () => {
    const client = new MockMCPClient({
      callHandler: () => { throw new Error('boom'); },
    });
    await client.connect();

    const profiler = new Profiler();
    const entry = await profiler.profileCall(client, 'failing_tool', {});

    expect(entry.success).toBe(false);
    expect(entry.error).toBe('boom');
  });

  it('should track isError responses', async () => {
    const client = new MockMCPClient({
      callHandler: () => ({ content: [{ type: 'text', text: 'error' }], isError: true }),
    });
    await client.connect();

    const profiler = new Profiler();
    const entry = await profiler.profileCall(client, 'error_tool', {});

    expect(entry.success).toBe(false);
  });

  it('should compute stats from entries', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const profiler = new Profiler();
    await profiler.profileCall(client, 'tool_a', {});
    await profiler.profileCall(client, 'tool_a', {});
    await profiler.profileCall(client, 'tool_b', {});

    const allStats = profiler.getStats();
    expect(allStats.min).toBeGreaterThanOrEqual(0);

    const toolAStats = profiler.getStats('tool_a');
    expect(toolAStats.min).toBeGreaterThanOrEqual(0);

    expect(profiler.getEntries().length).toBe(3);
  });

  it('should clear entries', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const profiler = new Profiler();
    await profiler.profileCall(client, 'tool', {});
    expect(profiler.getEntries().length).toBe(1);

    profiler.clear();
    expect(profiler.getEntries().length).toBe(0);
  });
});
