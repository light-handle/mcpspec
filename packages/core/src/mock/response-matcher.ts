import type { RecordingStep } from '@mcpspec/shared';

/**
 * Recursively sorts object keys at all nesting levels for deterministic comparison.
 * JSON.stringify's replacer array only whitelists keys (and drops unlisted nested keys),
 * so we need a custom implementation for deep key-order-independent comparison.
 */
function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + stableStringify(val);
  });
  return '{' + parts.join(',') + '}';
}

export type MatchMode = 'match' | 'sequential';
export type OnMissingBehavior = 'error' | 'empty';

export interface ResponseMatcherConfig {
  mode: MatchMode;
  onMissing: OnMissingBehavior;
}

export interface MatchResult {
  output: unknown[];
  isError: boolean;
  durationMs: number;
}

export interface MatcherStats {
  totalSteps: number;
  servedCount: number;
  remainingCount: number;
}

/**
 * Matches incoming tool calls to recorded responses.
 *
 * - `match` mode: tries exact input match first, then falls back to next queued response for that tool.
 * - `sequential` mode: serves responses in recorded order regardless of tool name/input.
 */
export class ResponseMatcher {
  private readonly config: ResponseMatcherConfig;
  private readonly steps: RecordingStep[];
  private servedCount = 0;

  // match mode: per-tool queues
  private toolQueues: Map<string, RecordingStep[]> = new Map();

  // sequential mode: single cursor
  private sequentialCursor = 0;

  constructor(steps: RecordingStep[], config: ResponseMatcherConfig) {
    this.steps = steps;
    this.config = config;

    if (config.mode === 'match') {
      for (const step of steps) {
        const queue = this.toolQueues.get(step.tool);
        if (queue) {
          queue.push(step);
        } else {
          this.toolQueues.set(step.tool, [step]);
        }
      }
    }
  }

  match(toolName: string, input: Record<string, unknown>): MatchResult | null {
    if (this.config.mode === 'sequential') {
      return this.matchSequential();
    }
    return this.matchByTool(toolName, input);
  }

  getStats(): MatcherStats {
    return {
      totalSteps: this.steps.length,
      servedCount: this.servedCount,
      remainingCount: this.steps.length - this.servedCount,
    };
  }

  private matchSequential(): MatchResult | null {
    if (this.sequentialCursor >= this.steps.length) {
      return null;
    }
    const step = this.steps[this.sequentialCursor]!;
    this.sequentialCursor++;
    this.servedCount++;
    return this.stepToResult(step);
  }

  private matchByTool(toolName: string, input: Record<string, unknown>): MatchResult | null {
    const queue = this.toolQueues.get(toolName);
    if (!queue || queue.length === 0) {
      return null;
    }

    // Try exact input match first
    const inputKey = this.normalizeInput(input);
    const exactIndex = queue.findIndex((s) => this.normalizeInput(s.input) === inputKey);

    if (exactIndex !== -1) {
      const step = queue.splice(exactIndex, 1)[0]!;
      this.servedCount++;
      return this.stepToResult(step);
    }

    // Fallback: serve next queued response for this tool
    const step = queue.shift()!;
    this.servedCount++;
    return this.stepToResult(step);
  }

  private normalizeInput(input: Record<string, unknown>): string {
    return stableStringify(input);
  }

  private stepToResult(step: RecordingStep): MatchResult {
    return {
      output: step.output,
      isError: step.isError === true,
      durationMs: step.durationMs ?? 0,
    };
  }
}
