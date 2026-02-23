import { describe, it, expect, vi } from 'vitest';
import { RecordingReplayer } from '../../src/recording/recording-replayer.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';
import type { Recording } from '@mcpspec/shared';

function makeRecording(steps: Recording['steps'] = []): Recording {
  return {
    id: 'rec-1',
    name: 'test-recording',
    serverName: 'mock-server',
    tools: [{ name: 'tool_a' }, { name: 'tool_b' }],
    steps,
    createdAt: new Date().toISOString(),
  };
}

describe('RecordingReplayer', () => {
  const replayer = new RecordingReplayer();

  it('should replay steps in order', async () => {
    const callOrder: string[] = [];
    const client = new MockMCPClient({
      tools: [
        { name: 'tool_a', inputSchema: { type: 'object', properties: {} } },
        { name: 'tool_b', inputSchema: { type: 'object', properties: {} } },
      ],
      callHandler: async (name: string) => {
        callOrder.push(name);
        return { content: [{ type: 'text', text: `result-${name}` }] };
      },
    });
    await client.connect();

    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [{ type: 'text', text: 'old-a' }] },
      { tool: 'tool_b', input: {}, output: [{ type: 'text', text: 'old-b' }] },
    ]);

    const result = await replayer.replay(recording, client);
    expect(callOrder).toEqual(['tool_a', 'tool_b']);
    expect(result.replayedSteps).toHaveLength(2);
    expect(result.replayedSteps[0]!.tool).toBe('tool_a');
    expect(result.replayedSteps[1]!.tool).toBe('tool_b');
  });

  it('should capture errors during replay', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'fail_tool', inputSchema: { type: 'object', properties: {} } }],
      callHandler: async () => {
        throw new Error('Tool crashed');
      },
    });
    await client.connect();

    const recording = makeRecording([
      { tool: 'fail_tool', input: {}, output: [{ type: 'text', text: 'ok' }] },
    ]);

    const result = await replayer.replay(recording, client);
    expect(result.replayedSteps).toHaveLength(1);
    expect(result.replayedSteps[0]!.isError).toBe(true);
  });

  it('should invoke progress callbacks', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool_a', inputSchema: { type: 'object', properties: {} } }],
    });
    await client.connect();

    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [] },
    ]);

    const onStepStart = vi.fn();
    const onStepComplete = vi.fn();

    await replayer.replay(recording, client, { onStepStart, onStepComplete });
    expect(onStepStart).toHaveBeenCalledTimes(1);
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    expect(onStepStart).toHaveBeenCalledWith(0, expect.objectContaining({ tool: 'tool_a' }));
  });

  it('should handle empty recordings', async () => {
    const client = new MockMCPClient({ tools: [] });
    await client.connect();

    const recording = makeRecording([]);
    const result = await replayer.replay(recording, client);
    expect(result.replayedSteps).toHaveLength(0);
    expect(result.replayedAt).toBeTruthy();
  });

  it('should record duration for each step', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool_a', inputSchema: { type: 'object', properties: {} } }],
    });
    await client.connect();

    const recording = makeRecording([
      { tool: 'tool_a', input: {}, output: [] },
    ]);

    const result = await replayer.replay(recording, client);
    expect(result.replayedSteps[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });
});
