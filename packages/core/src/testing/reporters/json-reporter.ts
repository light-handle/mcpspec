import type { TestResult, TestRunResult } from '@mcpspec/shared';
import type { TestRunReporter } from '../test-runner.js';

export class JsonReporter implements TestRunReporter {
  private output: string | undefined;

  constructor(private readonly outputPath?: string) {}

  onRunStart(_collectionName: string, _testCount: number): void {
    // No output on start
  }

  onTestStart(_testName: string): void {
    // No output on test start
  }

  onTestComplete(_result: TestResult): void {
    // Collect all results, output at end
  }

  onRunComplete(result: TestRunResult): void {
    const json = JSON.stringify(
      {
        id: result.id,
        collectionName: result.collectionName,
        startedAt: result.startedAt.toISOString(),
        completedAt: result.completedAt.toISOString(),
        duration: result.duration,
        summary: result.summary,
        results: result.results,
      },
      null,
      2,
    );

    if (this.outputPath) {
      // Will be handled by the CLI command
      this.output = json;
    } else {
      console.log(json);
    }
  }

  getOutput(): string | undefined {
    return this.output;
  }
}
