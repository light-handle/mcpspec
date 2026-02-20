import type { TestRunResult, TestResult } from '@mcpspec/shared';

export interface TestDiff {
  testName: string;
  type: 'regression' | 'fix' | 'new' | 'removed' | 'unchanged';
  before?: TestResult;
  after?: TestResult;
}

export interface RunDiff {
  baselineName: string;
  currentRunId: string;
  regressions: TestDiff[];
  fixes: TestDiff[];
  newTests: TestDiff[];
  removedTests: TestDiff[];
  unchanged: TestDiff[];
  summary: {
    totalBefore: number;
    totalAfter: number;
    regressions: number;
    fixes: number;
    newTests: number;
    removedTests: number;
  };
}

export class ResultDiffer {
  diff(baseline: TestRunResult, current: TestRunResult, baselineName: string = 'baseline'): RunDiff {
    const baselineMap = new Map<string, TestResult>();
    for (const r of baseline.results) {
      baselineMap.set(r.testName, r);
    }

    const currentMap = new Map<string, TestResult>();
    for (const r of current.results) {
      currentMap.set(r.testName, r);
    }

    const regressions: TestDiff[] = [];
    const fixes: TestDiff[] = [];
    const newTests: TestDiff[] = [];
    const removedTests: TestDiff[] = [];
    const unchanged: TestDiff[] = [];

    // Check current tests against baseline
    for (const [name, currentResult] of currentMap) {
      const baselineResult = baselineMap.get(name);

      if (!baselineResult) {
        newTests.push({ testName: name, type: 'new', after: currentResult });
        continue;
      }

      const wasPassing = baselineResult.status === 'passed';
      const isPassing = currentResult.status === 'passed';

      if (wasPassing && !isPassing) {
        regressions.push({ testName: name, type: 'regression', before: baselineResult, after: currentResult });
      } else if (!wasPassing && isPassing) {
        fixes.push({ testName: name, type: 'fix', before: baselineResult, after: currentResult });
      } else {
        unchanged.push({ testName: name, type: 'unchanged', before: baselineResult, after: currentResult });
      }
    }

    // Check for removed tests
    for (const [name, baselineResult] of baselineMap) {
      if (!currentMap.has(name)) {
        removedTests.push({ testName: name, type: 'removed', before: baselineResult });
      }
    }

    return {
      baselineName,
      currentRunId: current.id,
      regressions,
      fixes,
      newTests,
      removedTests,
      unchanged,
      summary: {
        totalBefore: baseline.results.length,
        totalAfter: current.results.length,
        regressions: regressions.length,
        fixes: fixes.length,
        newTests: newTests.length,
        removedTests: removedTests.length,
      },
    };
  }
}
