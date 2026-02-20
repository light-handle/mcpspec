import type { TestResult, TestRunResult } from '@mcpspec/shared';
import type { TestRunReporter } from '../test-runner.js';
import type { SecretMasker } from '../../utils/secret-masker.js';

export class TapReporter implements TestRunReporter {
  private testIndex = 0;
  private secretMasker: SecretMasker | undefined;

  setSecretMasker(masker: SecretMasker): void {
    this.secretMasker = masker;
  }

  onRunStart(_collectionName: string, testCount: number): void {
    console.log('TAP version 14');
    console.log(`1..${testCount}`);
  }

  onTestStart(_testName: string): void {}

  onTestComplete(result: TestResult): void {
    this.testIndex++;
    const status = result.status === 'passed' ? 'ok' : 'not ok';
    const directive = result.status === 'skipped' ? ' # SKIP' : '';

    console.log(`${status} ${this.testIndex} - ${result.testName}${directive}`);

    if (result.status === 'failed') {
      console.log('  ---');
      console.log('  severity: fail');
      const failedAssertions = result.assertions.filter((a) => !a.passed);
      if (failedAssertions.length > 0) {
        console.log('  failures:');
        for (const a of failedAssertions) {
          console.log(`    - message: "${this.mask(a.message)}"`);
          if (a.expected !== undefined) console.log(`      expected: ${JSON.stringify(a.expected)}`);
          if (a.actual !== undefined) console.log(`      actual: ${JSON.stringify(a.actual)}`);
        }
      }
      console.log(`  duration_ms: ${result.duration}`);
      console.log('  ...');
    }

    if (result.status === 'error') {
      console.log('  ---');
      console.log('  severity: error');
      console.log(`  message: "${this.mask(result.error ?? 'Unknown error')}"`);
      console.log(`  duration_ms: ${result.duration}`);
      console.log('  ...');
    }
  }

  onRunComplete(_result: TestRunResult): void {
    // TAP output is emitted per-test, nothing to do on completion
  }

  private mask(text: string): string {
    return this.secretMasker ? this.secretMasker.mask(text) : text;
  }
}
