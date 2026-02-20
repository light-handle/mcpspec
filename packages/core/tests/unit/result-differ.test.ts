import { describe, it, expect } from 'vitest';
import { ResultDiffer } from '../../src/testing/comparison/result-differ.js';
import type { TestRunResult } from '@mcpspec/shared';

function makeRunResult(tests: Array<{ name: string; status: 'passed' | 'failed' | 'error' }>): TestRunResult {
  return {
    id: 'run-' + Date.now(),
    collectionName: 'Suite',
    startedAt: new Date(),
    completedAt: new Date(),
    duration: 1000,
    results: tests.map((t) => ({
      testId: t.name,
      testName: t.name,
      status: t.status,
      duration: 100,
      assertions: [],
    })),
    summary: {
      total: tests.length,
      passed: tests.filter((t) => t.status === 'passed').length,
      failed: tests.filter((t) => t.status === 'failed').length,
      skipped: 0,
      errors: tests.filter((t) => t.status === 'error').length,
      duration: 1000,
    },
  };
}

describe('ResultDiffer', () => {
  const differ = new ResultDiffer();

  it('should detect regressions (was passing, now failing)', () => {
    const baseline = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'passed' },
    ]);
    const current = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'failed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.regressions.length).toBe(1);
    expect(diff.regressions[0]!.testName).toBe('test-2');
  });

  it('should detect fixes (was failing, now passing)', () => {
    const baseline = makeRunResult([
      { name: 'test-1', status: 'failed' },
    ]);
    const current = makeRunResult([
      { name: 'test-1', status: 'passed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.fixes.length).toBe(1);
    expect(diff.fixes[0]!.testName).toBe('test-1');
  });

  it('should detect new tests', () => {
    const baseline = makeRunResult([
      { name: 'test-1', status: 'passed' },
    ]);
    const current = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'passed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.newTests.length).toBe(1);
    expect(diff.newTests[0]!.testName).toBe('test-2');
  });

  it('should detect removed tests', () => {
    const baseline = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'passed' },
    ]);
    const current = makeRunResult([
      { name: 'test-1', status: 'passed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.removedTests.length).toBe(1);
    expect(diff.removedTests[0]!.testName).toBe('test-2');
  });

  it('should identify unchanged tests', () => {
    const baseline = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'failed' },
    ]);
    const current = makeRunResult([
      { name: 'test-1', status: 'passed' },
      { name: 'test-2', status: 'failed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.unchanged.length).toBe(2);
    expect(diff.regressions.length).toBe(0);
    expect(diff.fixes.length).toBe(0);
  });

  it('should provide correct summary counts', () => {
    const baseline = makeRunResult([
      { name: 'regress', status: 'passed' },
      { name: 'fix', status: 'failed' },
      { name: 'removed', status: 'passed' },
    ]);
    const current = makeRunResult([
      { name: 'regress', status: 'failed' },
      { name: 'fix', status: 'passed' },
      { name: 'new', status: 'passed' },
    ]);

    const diff = differ.diff(baseline, current);
    expect(diff.summary.regressions).toBe(1);
    expect(diff.summary.fixes).toBe(1);
    expect(diff.summary.newTests).toBe(1);
    expect(diff.summary.removedTests).toBe(1);
    expect(diff.summary.totalBefore).toBe(3);
    expect(diff.summary.totalAfter).toBe(3);
  });
});
