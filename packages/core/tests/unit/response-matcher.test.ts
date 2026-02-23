import { describe, it, expect } from 'vitest';
import { ResponseMatcher } from '../../src/mock/response-matcher.js';
import type { RecordingStep } from '@mcpspec/shared';

function step(tool: string, input: Record<string, unknown> = {}, output: unknown[] = [{ type: 'text', text: `result-${tool}` }], durationMs = 50): RecordingStep {
  return { tool, input, output, durationMs };
}

describe('ResponseMatcher', () => {
  describe('match mode', () => {
    it('should return exact input match', () => {
      const matcher = new ResponseMatcher(
        [
          step('read_file', { path: '/a' }, [{ type: 'text', text: 'content-a' }]),
          step('read_file', { path: '/b' }, [{ type: 'text', text: 'content-b' }]),
        ],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('read_file', { path: '/b' });
      expect(result).not.toBeNull();
      expect(result!.output).toEqual([{ type: 'text', text: 'content-b' }]);
    });

    it('should handle different key ordering in input', () => {
      const matcher = new ResponseMatcher(
        [step('tool', { a: 1, b: 2 }, [{ type: 'text', text: 'ok' }])],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('tool', { b: 2, a: 1 });
      expect(result).not.toBeNull();
      expect(result!.output).toEqual([{ type: 'text', text: 'ok' }]);
    });

    it('should handle different key ordering in nested objects', () => {
      const matcher = new ResponseMatcher(
        [step('tool', { config: { z: 1, y: 2 }, name: 'test' }, [{ type: 'text', text: 'nested-ok' }])],
        { mode: 'match', onMissing: 'error' },
      );

      // Same data, different key order at both levels
      const result = matcher.match('tool', { name: 'test', config: { y: 2, z: 1 } });
      expect(result).not.toBeNull();
      expect(result!.output).toEqual([{ type: 'text', text: 'nested-ok' }]);
    });

    it('should handle deeply nested objects with different key ordering', () => {
      const matcher = new ResponseMatcher(
        [step('tool', { a: { b: { d: 4, c: 3 }, e: 5 } }, [{ type: 'text', text: 'deep-ok' }])],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('tool', { a: { e: 5, b: { c: 3, d: 4 } } });
      expect(result).not.toBeNull();
      expect(result!.output).toEqual([{ type: 'text', text: 'deep-ok' }]);
    });

    it('should handle arrays in nested objects', () => {
      const matcher = new ResponseMatcher(
        [step('tool', { items: [1, 2, 3], meta: { count: 3 } }, [{ type: 'text', text: 'array-ok' }])],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('tool', { meta: { count: 3 }, items: [1, 2, 3] });
      expect(result).not.toBeNull();
      expect(result!.output).toEqual([{ type: 'text', text: 'array-ok' }]);
    });

    it('should not match different nested values', () => {
      const matcher = new ResponseMatcher(
        [step('tool', { config: { x: 1 } }, [{ type: 'text', text: 'only-match' }])],
        { mode: 'match', onMissing: 'error' },
      );

      // Different nested value — should NOT exact-match, falls back to queue
      const result = matcher.match('tool', { config: { x: 999 } });
      // Falls back to queue order (same tool), so still returns the step
      expect(result).not.toBeNull();
      // But now the queue is empty
      expect(matcher.match('tool', { config: { x: 1 } })).toBeNull();
    });

    it('should fall back to queue order when no exact match', () => {
      const matcher = new ResponseMatcher(
        [
          step('greet', { name: 'Alice' }, [{ type: 'text', text: 'Hi Alice' }]),
          step('greet', { name: 'Bob' }, [{ type: 'text', text: 'Hi Bob' }]),
        ],
        { mode: 'match', onMissing: 'error' },
      );

      // Input doesn't match any recorded step exactly
      const result = matcher.match('greet', { name: 'Charlie' });
      expect(result).not.toBeNull();
      // Falls back to first in queue
      expect(result!.output).toEqual([{ type: 'text', text: 'Hi Alice' }]);
    });

    it('should return null for unknown tool', () => {
      const matcher = new ResponseMatcher(
        [step('known_tool')],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should exhaust queue and return null', () => {
      const matcher = new ResponseMatcher(
        [step('tool_a', {}, [{ type: 'text', text: 'once' }])],
        { mode: 'match', onMissing: 'error' },
      );

      const first = matcher.match('tool_a', {});
      expect(first).not.toBeNull();

      const second = matcher.match('tool_a', {});
      expect(second).toBeNull();
    });

    it('should handle multiple same-tool calls consuming queue', () => {
      const matcher = new ResponseMatcher(
        [
          step('tool', {}, [{ type: 'text', text: 'r1' }]),
          step('tool', {}, [{ type: 'text', text: 'r2' }]),
          step('tool', {}, [{ type: 'text', text: 'r3' }]),
        ],
        { mode: 'match', onMissing: 'error' },
      );

      expect(matcher.match('tool', {})!.output).toEqual([{ type: 'text', text: 'r1' }]);
      expect(matcher.match('tool', {})!.output).toEqual([{ type: 'text', text: 'r2' }]);
      expect(matcher.match('tool', {})!.output).toEqual([{ type: 'text', text: 'r3' }]);
      expect(matcher.match('tool', {})).toBeNull();
    });

    it('should preserve isError from step', () => {
      const s: RecordingStep = { tool: 'fail', input: {}, output: [{ type: 'text', text: 'err' }], isError: true, durationMs: 10 };
      const matcher = new ResponseMatcher([s], { mode: 'match', onMissing: 'error' });

      const result = matcher.match('fail', {});
      expect(result!.isError).toBe(true);
    });

    it('should preserve durationMs from step', () => {
      const matcher = new ResponseMatcher(
        [step('tool', {}, [], 123)],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('tool', {});
      expect(result!.durationMs).toBe(123);
    });
  });

  describe('sequential mode', () => {
    it('should serve responses in recorded order', () => {
      const matcher = new ResponseMatcher(
        [
          step('tool_a', {}, [{ type: 'text', text: 'first' }]),
          step('tool_b', {}, [{ type: 'text', text: 'second' }]),
        ],
        { mode: 'sequential', onMissing: 'error' },
      );

      const r1 = matcher.match('anything', {});
      expect(r1!.output).toEqual([{ type: 'text', text: 'first' }]);

      const r2 = matcher.match('anything', {});
      expect(r2!.output).toEqual([{ type: 'text', text: 'second' }]);
    });

    it('should ignore tool name and input', () => {
      const matcher = new ResponseMatcher(
        [step('tool_a', { x: 1 }, [{ type: 'text', text: 'response' }])],
        { mode: 'sequential', onMissing: 'error' },
      );

      const result = matcher.match('completely_different', { y: 999 });
      expect(result!.output).toEqual([{ type: 'text', text: 'response' }]);
    });

    it('should return null when exhausted', () => {
      const matcher = new ResponseMatcher(
        [step('tool')],
        { mode: 'sequential', onMissing: 'error' },
      );

      matcher.match('tool', {});
      expect(matcher.match('tool', {})).toBeNull();
    });
  });

  describe('stats', () => {
    it('should track served and remaining counts', () => {
      const matcher = new ResponseMatcher(
        [step('a'), step('b'), step('c')],
        { mode: 'sequential', onMissing: 'error' },
      );

      expect(matcher.getStats()).toEqual({ totalSteps: 3, servedCount: 0, remainingCount: 3 });

      matcher.match('a', {});
      expect(matcher.getStats()).toEqual({ totalSteps: 3, servedCount: 1, remainingCount: 2 });

      matcher.match('b', {});
      matcher.match('c', {});
      expect(matcher.getStats()).toEqual({ totalSteps: 3, servedCount: 3, remainingCount: 0 });
    });
  });

  describe('edge cases', () => {
    it('should handle empty steps', () => {
      const matcher = new ResponseMatcher([], { mode: 'match', onMissing: 'error' });
      expect(matcher.match('anything', {})).toBeNull();
      expect(matcher.getStats()).toEqual({ totalSteps: 0, servedCount: 0, remainingCount: 0 });
    });

    it('should handle single step', () => {
      const matcher = new ResponseMatcher(
        [step('only_tool')],
        { mode: 'match', onMissing: 'error' },
      );

      const result = matcher.match('only_tool', {});
      expect(result).not.toBeNull();
      expect(matcher.match('only_tool', {})).toBeNull();
    });

    it('should default isError to false when undefined', () => {
      const s: RecordingStep = { tool: 'tool', input: {}, output: [] };
      const matcher = new ResponseMatcher([s], { mode: 'match', onMissing: 'error' });
      const result = matcher.match('tool', {});
      expect(result!.isError).toBe(false);
    });

    it('should default durationMs to 0 when undefined', () => {
      const s: RecordingStep = { tool: 'tool', input: {}, output: [] };
      const matcher = new ResponseMatcher([s], { mode: 'match', onMissing: 'error' });
      const result = matcher.match('tool', {});
      expect(result!.durationMs).toBe(0);
    });
  });
});
