import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TapReporter } from '../../src/testing/reporters/tap-reporter.js';

describe('TapReporter', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should output TAP version and plan on run start', () => {
    const reporter = new TapReporter();
    reporter.onRunStart('Tests', 3);

    expect(consoleSpy).toHaveBeenCalledWith('TAP version 14');
    expect(consoleSpy).toHaveBeenCalledWith('1..3');
  });

  it('should output "ok" for passing tests', () => {
    const reporter = new TapReporter();
    reporter.onRunStart('Tests', 1);
    reporter.onTestComplete({
      testId: 't1',
      testName: 'my passing test',
      status: 'passed',
      duration: 100,
      assertions: [{ type: 'schema', passed: true, message: 'OK' }],
    });

    expect(consoleSpy).toHaveBeenCalledWith('ok 1 - my passing test');
  });

  it('should output "not ok" for failing tests with YAML diagnostics', () => {
    const reporter = new TapReporter();
    reporter.onRunStart('Tests', 1);
    reporter.onTestComplete({
      testId: 't1',
      testName: 'my failing test',
      status: 'failed',
      duration: 200,
      assertions: [{ type: 'equals', passed: false, message: 'Expected 1, got 2', expected: 1, actual: 2 }],
    });

    expect(consoleSpy).toHaveBeenCalledWith('not ok 1 - my failing test');
    expect(consoleSpy).toHaveBeenCalledWith('  ---');
    expect(consoleSpy).toHaveBeenCalledWith('  ...');
  });

  it('should output SKIP directive for skipped tests', () => {
    const reporter = new TapReporter();
    reporter.onRunStart('Tests', 1);
    reporter.onTestComplete({
      testId: 't1',
      testName: 'skipped test',
      status: 'skipped',
      duration: 0,
      assertions: [],
    });

    expect(consoleSpy).toHaveBeenCalledWith('not ok 1 - skipped test # SKIP');
  });

  it('should output error diagnostics for errored tests', () => {
    const reporter = new TapReporter();
    reporter.onRunStart('Tests', 1);
    reporter.onTestComplete({
      testId: 't1',
      testName: 'errored test',
      status: 'error',
      duration: 50,
      assertions: [],
      error: 'Connection refused',
    });

    expect(consoleSpy).toHaveBeenCalledWith('not ok 1 - errored test');
    expect(consoleSpy).toHaveBeenCalledWith('  severity: error');
  });
});
