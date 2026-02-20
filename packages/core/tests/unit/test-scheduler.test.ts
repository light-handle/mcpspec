import { describe, it, expect, vi } from 'vitest';
import { TestScheduler } from '../../src/testing/test-scheduler.js';
import type { TestDefinition } from '@mcpspec/shared';
import type { MCPClientInterface } from '../../src/client/mcp-client-interface.js';

function makeClient(): MCPClientInterface {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    listTools: vi.fn().mockResolvedValue([]),
    listResources: vi.fn().mockResolvedValue([]),
    callTool: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"result": "ok"}' }],
    }),
    readResource: vi.fn().mockResolvedValue({ contents: [] }),
    getServerInfo: vi.fn().mockReturnValue({ name: 'mock', version: '1.0' }),
  };
}

function makeTests(): TestDefinition[] {
  return [
    { name: 'Test A', call: 'tool_a', tags: ['smoke', 'api'] },
    { name: 'Test B', call: 'tool_b', tags: ['api'] },
    { name: 'Test C', call: 'tool_c', tags: ['smoke'] },
    { name: 'Test D', call: 'tool_d' },
  ];
}

describe('TestScheduler', () => {
  it('should run all tests sequentially with parallelism=1', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, { parallelism: 1 });

    expect(results.length).toBe(4);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('should filter tests by tag', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, {
      parallelism: 1,
      tags: ['smoke'],
    });

    const passed = results.filter((r) => r.status === 'passed');
    const skipped = results.filter((r) => r.status === 'skipped');

    expect(passed.length).toBe(2); // Test A and Test C have 'smoke'
    expect(skipped.length).toBe(2); // Test B and Test D don't
  });

  it('should strip @ prefix from tags during matching', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, {
      parallelism: 1,
      tags: ['@smoke'],
    });

    const passed = results.filter((r) => r.status === 'passed');
    expect(passed.length).toBe(2);
  });

  it('should run tests in parallel with parallelism>1', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, { parallelism: 4 });

    expect(results.length).toBe(4);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('should preserve result ordering with parallel execution', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, { parallelism: 2 });

    expect(results[0]!.testName).toBe('Test A');
    expect(results[1]!.testName).toBe('Test B');
    expect(results[2]!.testName).toBe('Test C');
    expect(results[3]!.testName).toBe('Test D');
  });

  it('should call reporter callbacks', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const reporter = {
      onRunStart: vi.fn(),
      onTestStart: vi.fn(),
      onTestComplete: vi.fn(),
      onRunComplete: vi.fn(),
    };

    await scheduler.schedule(makeTests(), client, {
      parallelism: 1,
      reporter,
    });

    expect(reporter.onTestStart).toHaveBeenCalledTimes(4);
    expect(reporter.onTestComplete).toHaveBeenCalledTimes(4);
  });

  it('should return all skipped when no tests match tags', async () => {
    const scheduler = new TestScheduler();
    const client = makeClient();
    const tests = makeTests();

    const results = await scheduler.schedule(tests, client, {
      parallelism: 1,
      tags: ['nonexistent'],
    });

    expect(results.every((r) => r.status === 'skipped')).toBe(true);
  });
});
