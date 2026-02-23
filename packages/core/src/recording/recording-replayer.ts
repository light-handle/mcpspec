import type { Recording, RecordingStep } from '@mcpspec/shared';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';

export interface ReplayProgress {
  onStepStart?: (index: number, step: RecordingStep) => void;
  onStepComplete?: (index: number, replayed: RecordingStep) => void;
}

export interface ReplayResult {
  originalRecording: Recording;
  replayedSteps: RecordingStep[];
  replayedAt: string;
}

export class RecordingReplayer {
  async replay(
    recording: Recording,
    client: MCPClientInterface,
    progress?: ReplayProgress,
  ): Promise<ReplayResult> {
    const replayedSteps: RecordingStep[] = [];

    for (let i = 0; i < recording.steps.length; i++) {
      const step = recording.steps[i]!;
      progress?.onStepStart?.(i, step);

      const start = performance.now();
      let output: unknown[] = [];
      let isError = false;

      try {
        const result = await client.callTool(step.tool, step.input);
        output = result.content as unknown[];
        isError = result.isError === true;
      } catch (err) {
        output = [{ type: 'text', text: err instanceof Error ? err.message : String(err) }];
        isError = true;
      }

      const durationMs = Math.round(performance.now() - start);
      const replayed: RecordingStep = {
        tool: step.tool,
        input: step.input,
        output,
        isError,
        durationMs,
      };

      replayedSteps.push(replayed);
      progress?.onStepComplete?.(i, replayed);
    }

    return {
      originalRecording: recording,
      replayedSteps,
      replayedAt: new Date().toISOString(),
    };
  }
}
