import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JunitReporter } from '../../src/testing/reporters/junit-reporter.js';
import type { TestRunResult } from '@mcpspec/shared';

function makeRunResult(overrides?: Partial<TestRunResult>): TestRunResult {
  return {
    id: 'run-1',
    collectionName: 'Test Suite',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: new Date('2026-01-01T00:00:01Z'),
    duration: 1000,
    results: [
      {
        testId: 't1',
        testName: 'passing test',
        status: 'passed',
        duration: 500,
        assertions: [{ type: 'schema', passed: true, message: 'OK' }],
      },
      {
        testId: 't2',
        testName: 'failing test',
        status: 'failed',
        duration: 300,
        assertions: [{ type: 'equals', passed: false, message: 'Expected 1, got 2' }],
      },
    ],
    summary: { total: 2, passed: 1, failed: 1, skipped: 0, errors: 0, duration: 1000 },
    ...overrides,
  };
}

describe('JunitReporter', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should generate valid JUnit XML', () => {
    const reporter = new JunitReporter();
    const result = makeRunResult();
    reporter.onRunComplete(result);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain('<?xml version="1.0"');
    expect(output).toContain('<testsuites');
    expect(output).toContain('<testsuite');
    expect(output).toContain('passing test');
    expect(output).toContain('<failure');
  });

  it('should store output when outputPath is provided', () => {
    const reporter = new JunitReporter('/tmp/results.xml');
    reporter.onRunComplete(makeRunResult());

    const output = reporter.getOutput();
    expect(output).toBeDefined();
    expect(output).toContain('<?xml version="1.0"');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should escape XML special characters', () => {
    const reporter = new JunitReporter('/tmp/results.xml');
    const result = makeRunResult({
      collectionName: 'Test & Suite <"quotes">',
    });
    reporter.onRunComplete(result);

    const output = reporter.getOutput()!;
    expect(output).toContain('&amp;');
    expect(output).toContain('&lt;');
    expect(output).toContain('&quot;');
  });

  it('should include error elements for errored tests', () => {
    const reporter = new JunitReporter('/tmp/results.xml');
    const result = makeRunResult({
      results: [
        {
          testId: 't1',
          testName: 'errored test',
          status: 'error',
          duration: 100,
          assertions: [],
          error: 'Connection failed',
        },
      ],
      summary: { total: 1, passed: 0, failed: 0, skipped: 0, errors: 1, duration: 100 },
    });
    reporter.onRunComplete(result);

    const output = reporter.getOutput()!;
    expect(output).toContain('<error');
    expect(output).toContain('Connection failed');
  });
});
