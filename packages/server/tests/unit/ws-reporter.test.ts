import { describe, it, expect, vi } from 'vitest';
import { WebSocketReporter } from '../../src/reporters/ws-reporter.js';
import type { WebSocketHandler } from '../../src/websocket.js';

function createMockWsHandler() {
  return {
    broadcast: vi.fn(),
  } as unknown as WebSocketHandler;
}

describe('WebSocketReporter', () => {
  it('should broadcast run start', () => {
    const ws = createMockWsHandler();
    const reporter = new WebSocketReporter(ws, 'run-123');

    reporter.onRunStart('My Collection', 5);

    expect(ws.broadcast).toHaveBeenCalledWith('run:run-123', 'started', {
      collectionName: 'My Collection',
      testCount: 5,
    });
  });

  it('should broadcast test start', () => {
    const ws = createMockWsHandler();
    const reporter = new WebSocketReporter(ws, 'run-456');

    reporter.onTestStart('Test A');

    expect(ws.broadcast).toHaveBeenCalledWith('run:run-456', 'test-started', {
      testName: 'Test A',
    });
  });

  it('should broadcast test complete', () => {
    const ws = createMockWsHandler();
    const reporter = new WebSocketReporter(ws, 'run-789');

    const result = {
      testId: 't1',
      testName: 'Test 1',
      status: 'passed' as const,
      duration: 100,
      assertions: [],
    };

    reporter.onTestComplete(result);

    expect(ws.broadcast).toHaveBeenCalledWith('run:run-789', 'test-completed', result);
  });

  it('should broadcast run complete with summary', () => {
    const ws = createMockWsHandler();
    const reporter = new WebSocketReporter(ws, 'run-abc');

    const runResult = {
      id: 'run-abc',
      collectionName: 'Test',
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 500,
      results: [],
      summary: { total: 2, passed: 2, failed: 0, skipped: 0, errors: 0, duration: 500 },
    };

    reporter.onRunComplete(runResult);

    expect(ws.broadcast).toHaveBeenCalledWith('run:run-abc', 'completed', {
      summary: runResult.summary,
      duration: 500,
    });
  });
});
