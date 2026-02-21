import { describe, it, expect, vi } from 'vitest';
import { BenchmarkRunner } from '../../src/performance/benchmark-runner.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('BenchmarkRunner', () => {
  it('should run benchmark with iterations', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const runner = new BenchmarkRunner();
    const result = await runner.run(client, 'test_tool', { key: 'value' }, {
      iterations: 10,
      warmupIterations: 2,
      concurrency: 1,
      timeout: 5000,
    });

    expect(result.toolName).toBe('test_tool');
    expect(result.iterations).toBe(10);
    expect(result.errors).toBe(0);
    expect(result.stats.min).toBeGreaterThanOrEqual(0);
    expect(result.stats.max).toBeGreaterThanOrEqual(result.stats.min);
    expect(result.stats.mean).toBeGreaterThanOrEqual(0);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('should exclude warmup from results', async () => {
    let callCount = 0;
    const client = new MockMCPClient({
      callHandler: () => {
        callCount++;
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    });
    await client.connect();

    const runner = new BenchmarkRunner();
    await runner.run(client, 'test_tool', {}, {
      iterations: 5,
      warmupIterations: 3,
      concurrency: 1,
      timeout: 5000,
    });

    // Total calls = warmup + iterations
    expect(callCount).toBe(8);
  });

  it('should count errors', async () => {
    let callNum = 0;
    const client = new MockMCPClient({
      callHandler: () => {
        callNum++;
        if (callNum > 2) { // fail after warmup
          return { content: [{ type: 'text', text: 'error' }], isError: true };
        }
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    });
    await client.connect();

    const runner = new BenchmarkRunner();
    const result = await runner.run(client, 'test_tool', {}, {
      iterations: 5,
      warmupIterations: 2,
      concurrency: 1,
      timeout: 5000,
    });

    expect(result.errors).toBe(5);
  });

  it('should call progress callbacks', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const onWarmupStart = vi.fn();
    const onIterationComplete = vi.fn();
    const onComplete = vi.fn();

    const runner = new BenchmarkRunner();
    await runner.run(client, 'test_tool', {}, {
      iterations: 3,
      warmupIterations: 1,
      concurrency: 1,
      timeout: 5000,
    }, {
      onWarmupStart,
      onIterationComplete,
      onComplete,
    });

    expect(onWarmupStart).toHaveBeenCalledWith(1);
    expect(onIterationComplete).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should use default config when not specified', async () => {
    const client = new MockMCPClient();
    await client.connect();

    const runner = new BenchmarkRunner();
    // Just verify it runs without error with defaults
    const result = await runner.run(client, 'test_tool', {}, { iterations: 3 });
    expect(result.iterations).toBe(3);
  });
});
