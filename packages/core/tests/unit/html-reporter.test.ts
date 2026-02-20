import { describe, it, expect } from 'vitest';
import { HtmlReporter } from '../../src/testing/reporters/html-reporter.js';
import type { TestRunResult } from '@mcpspec/shared';

function makeRunResult(): TestRunResult {
  return {
    id: 'run-1',
    collectionName: 'HTML Test Suite',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: new Date('2026-01-01T00:00:02Z'),
    duration: 2000,
    results: [
      {
        testId: 't1',
        testName: 'passing test',
        status: 'passed',
        duration: 500,
        assertions: [{ type: 'schema', passed: true, message: 'Valid structure' }],
      },
      {
        testId: 't2',
        testName: 'failing test',
        status: 'failed',
        duration: 300,
        assertions: [{ type: 'equals', passed: false, message: 'Values differ' }],
      },
    ],
    summary: { total: 2, passed: 1, failed: 1, skipped: 0, errors: 0, duration: 2000 },
  };
}

describe('HtmlReporter', () => {
  it('should generate valid HTML with output path', () => {
    const reporter = new HtmlReporter('/tmp/report.html');
    reporter.onRunComplete(makeRunResult());

    const output = reporter.getOutput();
    expect(output).toBeDefined();
    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('HTML Test Suite');
    expect(output).toContain('passing test');
    expect(output).toContain('failing test');
  });

  it('should include summary cards', () => {
    const reporter = new HtmlReporter('/tmp/report.html');
    reporter.onRunComplete(makeRunResult());

    const output = reporter.getOutput()!;
    expect(output).toContain('Passed');
    expect(output).toContain('Failed');
    expect(output).toContain('Duration');
  });

  it('should show failed assertion messages', () => {
    const reporter = new HtmlReporter('/tmp/report.html');
    reporter.onRunComplete(makeRunResult());

    const output = reporter.getOutput()!;
    expect(output).toContain('Values differ');
  });

  it('should include inline CSS (self-contained)', () => {
    const reporter = new HtmlReporter('/tmp/report.html');
    reporter.onRunComplete(makeRunResult());

    const output = reporter.getOutput()!;
    expect(output).toContain('<style>');
    expect(output).toContain('</style>');
  });
});
