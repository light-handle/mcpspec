import { performance } from 'node:perf_hooks';
import type { BenchmarkConfig, BenchmarkResult } from '@mcpspec/shared';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';
import { computeStats } from './profiler.js';

export interface BenchmarkProgress {
  onWarmupStart?: (iterations: number) => void;
  onIterationComplete?: (iteration: number, total: number, durationMs: number) => void;
  onComplete?: (result: BenchmarkResult) => void;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 100,
  warmupIterations: 5,
  concurrency: 1,
  timeout: 30000,
};

export class BenchmarkRunner {
  async run(
    client: MCPClientInterface,
    toolName: string,
    args: Record<string, unknown>,
    config: Partial<BenchmarkConfig> = {},
    progress?: BenchmarkProgress,
  ): Promise<BenchmarkResult> {
    const cfg: BenchmarkConfig = { ...DEFAULT_CONFIG, ...config };
    const startedAt = new Date();

    // Warmup phase
    if (cfg.warmupIterations > 0) {
      progress?.onWarmupStart?.(cfg.warmupIterations);
      for (let i = 0; i < cfg.warmupIterations; i++) {
        await this.runSingleIteration(client, toolName, args, cfg.timeout);
      }
    }

    // Measured phase
    const durations: number[] = [];
    let errors = 0;

    for (let i = 0; i < cfg.iterations; i++) {
      const result = await this.runSingleIteration(client, toolName, args, cfg.timeout);
      if (result.success) {
        durations.push(result.durationMs);
      } else {
        errors++;
      }
      progress?.onIterationComplete?.(i + 1, cfg.iterations, result.durationMs);
    }

    durations.sort((a, b) => a - b);
    const stats = computeStats(durations);
    const completedAt = new Date();

    const benchResult: BenchmarkResult = {
      toolName,
      iterations: cfg.iterations,
      stats,
      errors,
      startedAt,
      completedAt,
    };

    progress?.onComplete?.(benchResult);
    return benchResult;
  }

  private async runSingleIteration(
    client: MCPClientInterface,
    toolName: string,
    args: Record<string, unknown>,
    timeout: number,
  ): Promise<{ success: boolean; durationMs: number }> {
    const start = performance.now();

    try {
      const result = await Promise.race([
        client.callTool(toolName, args),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
      ]);
      const durationMs = performance.now() - start;

      if (result === null) {
        return { success: false, durationMs };
      }

      return { success: !result.isError, durationMs };
    } catch {
      const durationMs = performance.now() - start;
      return { success: false, durationMs };
    }
  }
}
