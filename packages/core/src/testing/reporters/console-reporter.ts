import type { TestResult, TestRunResult } from '@mcpspec/shared';
import type { TestRunReporter } from '../test-runner.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

const ICONS = {
  pass: `${COLORS.green}\u2713${COLORS.reset}`,
  fail: `${COLORS.red}\u2717${COLORS.reset}`,
  error: `${COLORS.red}!${COLORS.reset}`,
  skip: `${COLORS.yellow}-${COLORS.reset}`,
};

export class ConsoleReporter implements TestRunReporter {
  private ci: boolean;

  constructor(options?: { ci?: boolean }) {
    this.ci = options?.ci ?? false;
  }

  onRunStart(collectionName: string, testCount: number): void {
    if (!this.ci) {
      console.log(
        `\n${COLORS.bold}${COLORS.cyan}MCPSpec${COLORS.reset} running ${COLORS.bold}${collectionName}${COLORS.reset} (${testCount} tests)\n`,
      );
    }
  }

  onTestStart(_testName: string): void {
    // No output on start for console reporter
  }

  onTestComplete(result: TestResult): void {
    const icon = this.getIcon(result.status);
    const duration = `${COLORS.gray}(${result.duration}ms)${COLORS.reset}`;

    console.log(`  ${icon} ${result.testName} ${duration}`);

    if (result.status === 'failed') {
      for (const assertion of result.assertions) {
        if (!assertion.passed) {
          console.log(`    ${COLORS.red}${assertion.message}${COLORS.reset}`);
        }
      }
    }

    if (result.status === 'error' && result.error) {
      console.log(`    ${COLORS.red}${result.error}${COLORS.reset}`);
    }
  }

  onRunComplete(result: TestRunResult): void {
    const { summary } = result;
    console.log('');

    const parts: string[] = [];
    if (summary.passed > 0) parts.push(`${COLORS.green}${summary.passed} passed${COLORS.reset}`);
    if (summary.failed > 0) parts.push(`${COLORS.red}${summary.failed} failed${COLORS.reset}`);
    if (summary.errors > 0) parts.push(`${COLORS.red}${summary.errors} errors${COLORS.reset}`);
    if (summary.skipped > 0) parts.push(`${COLORS.yellow}${summary.skipped} skipped${COLORS.reset}`);

    console.log(
      `  ${COLORS.bold}Tests:${COLORS.reset}  ${parts.join(', ')} (${summary.total} total)`,
    );
    console.log(
      `  ${COLORS.bold}Time:${COLORS.reset}   ${(summary.duration / 1000).toFixed(2)}s`,
    );
    console.log('');
  }

  private getIcon(status: string): string {
    switch (status) {
      case 'passed':
        return ICONS.pass;
      case 'failed':
        return ICONS.fail;
      case 'error':
        return ICONS.error;
      case 'skipped':
        return ICONS.skip;
      default:
        return ' ';
    }
  }
}
