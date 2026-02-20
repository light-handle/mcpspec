import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';
import { BaselineStore, ResultDiffer } from '@mcpspec/core';

export const compareCommand = new Command('compare')
  .description('Compare test runs against a baseline')
  .argument('[run1]', 'First run (baseline name)')
  .argument('[run2]', 'Second run (baseline name)')
  .option('--baseline <name>', 'Compare latest run against named baseline')
  .action((run1: string | undefined, run2: string | undefined, options: { baseline?: string }) => {
    const store = new BaselineStore();
    const differ = new ResultDiffer();

    // Compare two named baselines
    if (run1 && run2) {
      const baseline = store.load(run1);
      const current = store.load(run2);

      if (!baseline) {
        console.error(`Baseline "${run1}" not found.`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }
      if (!current) {
        console.error(`Baseline "${run2}" not found.`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const diff = differ.diff(baseline, current, run1);
      printDiff(diff);
      process.exit(diff.summary.regressions > 0 ? EXIT_CODES.TEST_FAILURE : EXIT_CODES.SUCCESS);
    }

    // Compare against named baseline
    if (options.baseline) {
      const baselines = store.list();
      if (baselines.length === 0) {
        console.error('No baselines found. Run `mcpspec baseline save <name>` first.');
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const baseline = store.load(options.baseline);
      if (!baseline) {
        console.error(`Baseline "${options.baseline}" not found.`);
        console.error(`Available baselines: ${baselines.join(', ')}`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      // Find the most recent baseline that isn't the one we're comparing against
      const otherBaselines = baselines.filter((b) => b !== options.baseline);
      if (otherBaselines.length === 0) {
        console.error('Need at least two baselines to compare. Run tests and save another baseline.');
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const current = store.load(otherBaselines[otherBaselines.length - 1]!);
      if (!current) {
        console.error('Could not load comparison baseline.');
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const diff = differ.diff(baseline, current, options.baseline);
      printDiff(diff);
      process.exit(diff.summary.regressions > 0 ? EXIT_CODES.TEST_FAILURE : EXIT_CODES.SUCCESS);
    }

    console.error('Usage: mcpspec compare <run1> <run2> or mcpspec compare --baseline <name>');
    process.exit(EXIT_CODES.CONFIG_ERROR);
  });

function printDiff(diff: import('@mcpspec/core').RunDiff): void {
  console.log(`\nComparison against baseline "${diff.baselineName}":`);
  console.log(`  Tests before: ${diff.summary.totalBefore}`);
  console.log(`  Tests after:  ${diff.summary.totalAfter}`);
  console.log('');

  if (diff.regressions.length > 0) {
    console.log('  Regressions:');
    for (const r of diff.regressions) {
      console.log(`    \u2717 ${r.testName}: ${r.before?.status} -> ${r.after?.status}`);
    }
  }

  if (diff.fixes.length > 0) {
    console.log('  Fixes:');
    for (const r of diff.fixes) {
      console.log(`    \u2713 ${r.testName}: ${r.before?.status} -> ${r.after?.status}`);
    }
  }

  if (diff.newTests.length > 0) {
    console.log('  New tests:');
    for (const r of diff.newTests) {
      console.log(`    + ${r.testName}: ${r.after?.status}`);
    }
  }

  if (diff.removedTests.length > 0) {
    console.log('  Removed tests:');
    for (const r of diff.removedTests) {
      console.log(`    - ${r.testName}`);
    }
  }

  if (diff.regressions.length === 0 && diff.fixes.length === 0 && diff.newTests.length === 0 && diff.removedTests.length === 0) {
    console.log('  No changes detected.');
  }

  console.log('');
}
