import type { TestRunReporter } from '@mcpspec/core';
import type { TestResult, TestRunResult } from '@mcpspec/shared';
import type { WebSocketHandler } from '../websocket.js';

export class WebSocketReporter implements TestRunReporter {
  constructor(
    private wsHandler: WebSocketHandler,
    private runId: string,
  ) {}

  onRunStart(collectionName: string, testCount: number): void {
    this.wsHandler.broadcast(`run:${this.runId}`, 'started', { collectionName, testCount });
  }

  onTestStart(testName: string): void {
    this.wsHandler.broadcast(`run:${this.runId}`, 'test-started', { testName });
  }

  onTestComplete(result: TestResult): void {
    this.wsHandler.broadcast(`run:${this.runId}`, 'test-completed', result);
  }

  onRunComplete(result: TestRunResult): void {
    this.wsHandler.broadcast(`run:${this.runId}`, 'completed', {
      summary: result.summary,
      duration: result.duration,
    });
  }
}
