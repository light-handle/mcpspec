import type { Recording, RecordingStep, RecordingStepDiff, RecordingDiff } from '@mcpspec/shared';

export class RecordingDiffer {
  diff(recording: Recording, replayedSteps: RecordingStep[], replayedAt: string): RecordingDiff {
    const steps: RecordingStepDiff[] = [];
    const maxLen = Math.max(recording.steps.length, replayedSteps.length);

    for (let i = 0; i < maxLen; i++) {
      const original = recording.steps[i];
      const replayed = replayedSteps[i];

      if (original && replayed) {
        const outputMatch = JSON.stringify(original.output) === JSON.stringify(replayed.output);
        const errorMatch = (original.isError ?? false) === (replayed.isError ?? false);
        const isMatched = outputMatch && errorMatch;

        steps.push({
          index: i,
          tool: original.tool,
          type: isMatched ? 'matched' : 'changed',
          original,
          replayed,
          outputDiff: isMatched ? undefined : this.describeChange(original, replayed),
        });
      } else if (original && !replayed) {
        steps.push({
          index: i,
          tool: original.tool,
          type: 'removed',
          original,
        });
      } else if (!original && replayed) {
        steps.push({
          index: i,
          tool: replayed.tool,
          type: 'added',
          replayed,
        });
      }
    }

    const summary = {
      matched: steps.filter((s) => s.type === 'matched').length,
      changed: steps.filter((s) => s.type === 'changed').length,
      added: steps.filter((s) => s.type === 'added').length,
      removed: steps.filter((s) => s.type === 'removed').length,
    };

    return {
      recordingId: recording.id,
      recordingName: recording.name,
      replayedAt,
      steps,
      summary,
    };
  }

  private describeChange(original: RecordingStep, replayed: RecordingStep): string {
    const parts: string[] = [];
    if ((original.isError ?? false) !== (replayed.isError ?? false)) {
      parts.push(`error state: ${original.isError ?? false} → ${replayed.isError ?? false}`);
    }
    if (JSON.stringify(original.output) !== JSON.stringify(replayed.output)) {
      parts.push('output content changed');
    }
    return parts.join('; ');
  }
}
