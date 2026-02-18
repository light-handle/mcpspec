import type { AssertionResult } from '@mcpspec/shared';

export function assertLatency(durationMs: number, maxMs: number): AssertionResult {
  const passed = durationMs <= maxMs;
  return {
    type: 'latency',
    passed,
    message: passed
      ? `Response time ${durationMs}ms within ${maxMs}ms limit`
      : `Response time ${durationMs}ms exceeds ${maxMs}ms limit`,
    expected: maxMs,
    actual: durationMs,
  };
}
