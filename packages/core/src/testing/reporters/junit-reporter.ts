import type { TestResult, TestRunResult } from '@mcpspec/shared';
import type { TestRunReporter } from '../test-runner.js';
import type { SecretMasker } from '../../utils/secret-masker.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class JunitReporter implements TestRunReporter {
  private output: string | undefined;
  private secretMasker: SecretMasker | undefined;

  constructor(private readonly outputPath?: string) {}

  setSecretMasker(masker: SecretMasker): void {
    this.secretMasker = masker;
  }

  onRunStart(_collectionName: string, _testCount: number): void {}
  onTestStart(_testName: string): void {}
  onTestComplete(_result: TestResult): void {}

  onRunComplete(result: TestRunResult): void {
    const { summary, results, collectionName, duration } = result;

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      `<testsuites tests="${summary.total}" failures="${summary.failed}" errors="${summary.errors}" time="${(duration / 1000).toFixed(3)}">`,
    );
    lines.push(
      `  <testsuite name="${escapeXml(collectionName)}" tests="${summary.total}" failures="${summary.failed}" errors="${summary.errors}" skipped="${summary.skipped}" time="${(duration / 1000).toFixed(3)}">`,
    );

    for (const test of results) {
      const testTime = (test.duration / 1000).toFixed(3);
      lines.push(
        `    <testcase name="${escapeXml(test.testName)}" classname="${escapeXml(collectionName)}" time="${testTime}">`,
      );

      if (test.status === 'failed') {
        const failedAssertions = test.assertions.filter((a) => !a.passed);
        const message = failedAssertions.map((a) => a.message).join('; ');
        lines.push(
          `      <failure message="${escapeXml(this.mask(message))}">${escapeXml(this.mask(message))}</failure>`,
        );
      }

      if (test.status === 'error') {
        const errorMessage = test.error ?? 'Unknown error';
        lines.push(
          `      <error message="${escapeXml(this.mask(errorMessage))}">${escapeXml(this.mask(errorMessage))}</error>`,
        );
      }

      if (test.status === 'skipped') {
        lines.push('      <skipped/>');
      }

      lines.push('    </testcase>');
    }

    lines.push('  </testsuite>');
    lines.push('</testsuites>');

    const xml = lines.join('\n');

    if (this.outputPath) {
      this.output = xml;
    } else {
      console.log(xml);
    }
  }

  getOutput(): string | undefined {
    return this.output;
  }

  private mask(text: string): string {
    return this.secretMasker ? this.secretMasker.mask(text) : text;
  }
}
