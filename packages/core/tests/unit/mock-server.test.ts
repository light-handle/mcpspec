import { describe, it, expect, vi } from 'vitest';
import { MockMCPServer } from '../../src/mock/mock-server.js';
import type { Recording } from '@mcpspec/shared';

function makeRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-mock',
    name: 'mock-test',
    serverName: 'test-server',
    tools: [
      { name: 'greet', description: 'Greet someone' },
      { name: 'add', description: 'Add numbers' },
    ],
    steps: [
      { tool: 'greet', input: { name: 'world' }, output: [{ type: 'text', text: 'Hello, world!' }], durationMs: 50 },
      { tool: 'add', input: { a: 1, b: 2 }, output: [{ type: 'text', text: '3' }], durationMs: 10 },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MockMCPServer', () => {
  it('should initialize with correct stats', () => {
    const server = new MockMCPServer({
      recording: makeRecording(),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    const stats = server.getStats();
    expect(stats.toolCount).toBe(2);
    expect(stats.totalSteps).toBe(2);
    expect(stats.servedCount).toBe(0);
    expect(stats.remainingCount).toBe(2);
  });

  it('should use recording name when serverName is missing', () => {
    const server = new MockMCPServer({
      recording: makeRecording({ serverName: undefined }),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    // Server was created without throwing
    expect(server.getStats().toolCount).toBe(2);
  });

  it('should accept match mode config', () => {
    const server = new MockMCPServer({
      recording: makeRecording(),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(server.getStats().totalSteps).toBe(2);
  });

  it('should accept sequential mode config', () => {
    const server = new MockMCPServer({
      recording: makeRecording(),
      mode: 'sequential',
      latency: 0,
      onMissing: 'empty',
    });

    expect(server.getStats().totalSteps).toBe(2);
  });

  it('should accept original latency config', () => {
    const server = new MockMCPServer({
      recording: makeRecording(),
      mode: 'match',
      latency: 'original',
      onMissing: 'error',
    });

    expect(server.getStats().totalSteps).toBe(2);
  });

  it('should handle empty recording', () => {
    const server = new MockMCPServer({
      recording: makeRecording({ tools: [], steps: [] }),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    const stats = server.getStats();
    expect(stats.toolCount).toBe(0);
    expect(stats.totalSteps).toBe(0);
  });

  it('should handle recording with many steps for same tool', () => {
    const steps = Array.from({ length: 10 }, (_, i) => ({
      tool: 'repeat',
      input: { i },
      output: [{ type: 'text', text: `response-${i}` }],
      durationMs: 5,
    }));

    const server = new MockMCPServer({
      recording: makeRecording({ steps }),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(server.getStats().totalSteps).toBe(10);
  });

  it('should accept numeric latency config', () => {
    const server = new MockMCPServer({
      recording: makeRecording(),
      mode: 'match',
      latency: 100,
      onMissing: 'error',
    });

    expect(server.getStats().totalSteps).toBe(2);
  });
});
