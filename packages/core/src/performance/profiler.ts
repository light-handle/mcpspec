import { performance } from 'node:perf_hooks';
import type { BenchmarkStats, ProfileEntry } from '@mcpspec/shared';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';

export function computeStats(sortedDurations: number[]): BenchmarkStats {
  if (sortedDurations.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stddev: 0 };
  }

  const n = sortedDurations.length;
  const min = sortedDurations[0]!;
  const max = sortedDurations[n - 1]!;
  const sum = sortedDurations.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median = n % 2 === 0
    ? (sortedDurations[n / 2 - 1]! + sortedDurations[n / 2]!) / 2
    : sortedDurations[Math.floor(n / 2)]!;

  const p95 = sortedDurations[Math.ceil(n * 0.95) - 1]!;
  const p99 = sortedDurations[Math.ceil(n * 0.99) - 1]!;

  const variance = sortedDurations.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return { min, max, mean, median, p95, p99, stddev };
}

export class Profiler {
  private entries: ProfileEntry[] = [];

  async profileCall(
    client: MCPClientInterface,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ProfileEntry> {
    const startMs = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await client.callTool(toolName, args);
      if (result.isError) {
        success = false;
        error = JSON.stringify(result.content).slice(0, 200);
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const durationMs = performance.now() - startMs;

    const entry: ProfileEntry = {
      toolName,
      startMs,
      durationMs,
      success,
      error,
    };

    this.entries.push(entry);
    return entry;
  }

  getEntries(): ProfileEntry[] {
    return [...this.entries];
  }

  getStats(toolName?: string): BenchmarkStats {
    const filtered = toolName
      ? this.entries.filter((e) => e.toolName === toolName && e.success)
      : this.entries.filter((e) => e.success);

    const durations = filtered.map((e) => e.durationMs).sort((a, b) => a - b);
    return computeStats(durations);
  }

  clear(): void {
    this.entries = [];
  }
}
