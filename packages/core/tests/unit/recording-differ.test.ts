import { describe, it, expect } from 'vitest';
import { RecordingDiffer } from '../../src/recording/recording-differ.js';
import type { Recording, RecordingStep } from '@mcpspec/shared';

function makeRecording(steps: RecordingStep[]): Recording {
  return {
    id: 'rec-1',
    name: 'test-recording',
    serverName: 'mock-server',
    tools: [],
    steps,
    createdAt: new Date().toISOString(),
  };
}

describe('RecordingDiffer', () => {
  const differ = new RecordingDiffer();
  const now = new Date().toISOString();

  it('should identify matched steps', () => {
    const steps: RecordingStep[] = [
      { tool: 'tool_a', input: { x: 1 }, output: [{ type: 'text', text: 'hello' }] },
    ];
    const recording = makeRecording(steps);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: { x: 1 }, output: [{ type: 'text', text: 'hello' }] },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.steps).toHaveLength(1);
    expect(diff.steps[0]!.type).toBe('matched');
    expect(diff.summary.matched).toBe(1);
  });

  it('should identify changed steps', () => {
    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'old' }] },
    ]);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'new' }] },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.steps[0]!.type).toBe('changed');
    expect(diff.steps[0]!.outputDiff).toContain('output content changed');
    expect(diff.summary.changed).toBe(1);
  });

  it('should identify added steps when replayed has more', () => {
    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [] },
    ]);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: {}, output: [] },
      { tool: 'tool_b', input: {}, output: [] },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.steps).toHaveLength(2);
    expect(diff.steps[1]!.type).toBe('added');
    expect(diff.summary.added).toBe(1);
  });

  it('should identify removed steps when replayed has fewer', () => {
    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [] },
      { tool: 'tool_b', input: {}, output: [] },
    ]);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: {}, output: [] },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.steps).toHaveLength(2);
    expect(diff.steps[1]!.type).toBe('removed');
    expect(diff.summary.removed).toBe(1);
  });

  it('should compute correct summary counts', () => {
    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'same' }] },
      { tool: 'tool_b', input: {}, output: [{ type: 'text', text: 'old' }] },
      { tool: 'tool_c', input: {}, output: [] },
    ]);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'same' }] },
      { tool: 'tool_b', input: {}, output: [{ type: 'text', text: 'new' }] },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.summary).toEqual({
      matched: 1,
      changed: 1,
      added: 0,
      removed: 1,
    });
  });

  it('should detect error state changes', () => {
    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'ok' }], isError: false },
    ]);
    const replayed: RecordingStep[] = [
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'ok' }], isError: true },
    ];

    const diff = differ.diff(recording, replayed, now);
    expect(diff.steps[0]!.type).toBe('changed');
    expect(diff.steps[0]!.outputDiff).toContain('error state');
  });
});
