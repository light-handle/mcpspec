import { Command } from 'commander';
import { readFileSync, writeFileSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import { EXIT_CODES } from '@mcpspec/shared';
import {
  loadYamlSafely,
  TestRunner,
  ConsoleReporter,
  JsonReporter,
  JunitReporter,
  HtmlReporter,
  TapReporter,
  MCPSpecError,
  formatError,
} from '@mcpspec/core';
import { collectionSchema } from '@mcpspec/shared';
import type { CollectionDefinition } from '@mcpspec/shared';

function coerceCollection(raw: unknown): CollectionDefinition {
  if (!raw || typeof raw !== 'object') {
    throw new MCPSpecError('COLLECTION_PARSE_ERROR', 'Collection file is empty or invalid', {});
  }

  const obj = raw as Record<string, unknown>;

  // Convert FAILSAFE_SCHEMA string values to proper types
  const coerced: Record<string, unknown> = { ...obj };

  // Coerce tests array
  if (Array.isArray(obj['tests'])) {
    coerced['tests'] = (obj['tests'] as Record<string, unknown>[]).map((test) => {
      const t: Record<string, unknown> = { ...test };

      // Coerce expectError from string to boolean
      if (t['expectError'] === 'true') t['expectError'] = true;
      if (t['expectError'] === 'false') t['expectError'] = false;

      // Coerce timeout from string to number
      if (typeof t['timeout'] === 'string') t['timeout'] = parseInt(t['timeout'] as string, 10);
      if (typeof t['retries'] === 'string') t['retries'] = parseInt(t['retries'] as string, 10);

      // Coerce assertions
      if (Array.isArray(t['assertions'])) {
        t['assertions'] = (t['assertions'] as Record<string, unknown>[]).map((a) => {
          const assertion: Record<string, unknown> = { ...a };
          if (typeof assertion['maxMs'] === 'string')
            assertion['maxMs'] = parseInt(assertion['maxMs'] as string, 10);
          if (typeof assertion['value'] === 'string' && assertion['type'] === 'length')
            assertion['value'] = parseInt(assertion['value'] as string, 10);
          return assertion;
        });
      }

      // Coerce expect array (simple format)
      if (Array.isArray(t['expect'])) {
        t['expect'] = (t['expect'] as Record<string, unknown>[]).map((e) => {
          return e;
        });
      }

      return t;
    });
  }

  return coerced as unknown as CollectionDefinition;
}

interface TestCommandOptions {
  env?: string;
  reporter: string;
  output?: string;
  ci: boolean;
  tag?: string[];
  parallel?: string;
  baseline?: string;
  watch: boolean;
}

export const testCommand = new Command('test')
  .description('Run tests from a collection file')
  .argument('[collection]', 'Path to collection YAML file', 'mcpspec.yaml')
  .option('--env <environment>', 'Environment to use')
  .option('--reporter <type>', 'Reporter type: console, json, junit, html, tap', 'console')
  .option('--output <path>', 'Output file path for results')
  .option('--ci', 'CI mode (no colors, structured output)', false)
  .option('--tag <tags...>', 'Filter tests by tag')
  .option('--parallel <n>', 'Number of parallel test executions')
  .option('--baseline <name>', 'Compare results against named baseline')
  .option('--watch', 'Re-run tests on file changes', false)
  .action(async (collectionPath: string, options: TestCommandOptions) => {
    if (options.watch) {
      await runWatch(collectionPath, options);
    } else {
      const exitCode = await runOnce(collectionPath, options);
      process.exit(exitCode);
    }
  });

async function runOnce(collectionPath: string, options: TestCommandOptions): Promise<number> {
  try {
    const fullPath = resolve(collectionPath);
    let content: string;
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch {
      const formatted = formatError(
        new MCPSpecError('COLLECTION_PARSE_ERROR', `Cannot read file: ${fullPath}`, {
          filePath: fullPath,
        }),
      );
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      return EXIT_CODES.CONFIG_ERROR;
    }

    const raw = loadYamlSafely(content);
    const collection = coerceCollection(raw);

    // Validate with Zod (lenient - we already coerced)
    try {
      collectionSchema.parse(collection);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const formatted = formatError(
        new MCPSpecError('COLLECTION_VALIDATION_ERROR', message, {
          details: message,
          filePath: fullPath,
        }),
      );
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      return EXIT_CODES.CONFIG_ERROR;
    }

    const reporter = createReporter(options);

    const runner = new TestRunner();
    const parallelism = options.parallel ? parseInt(options.parallel, 10) : 1;

    const result = await runner.run(collection, {
      environment: options.env,
      reporter,
      parallelism,
      tags: options.tag,
    });

    // Write output file if specified
    if (options.output) {
      const output = getReporterOutput(reporter, options.reporter);
      if (output) {
        writeFileSync(resolve(options.output), output, 'utf-8');
      }
    }

    // Compare against baseline if requested
    if (options.baseline) {
      const { BaselineStore, ResultDiffer } = await import('@mcpspec/core');
      const store = new BaselineStore();
      const baseline = store.load(options.baseline);
      if (baseline) {
        const differ = new ResultDiffer();
        const diff = differ.diff(baseline, result, options.baseline);
        console.log(`\n  Baseline comparison against "${options.baseline}":`);
        if (diff.summary.regressions > 0) {
          console.log(`    Regressions: ${diff.summary.regressions}`);
          for (const r of diff.regressions) {
            console.log(`      - ${r.testName}: ${r.before?.status} -> ${r.after?.status}`);
          }
        }
        if (diff.summary.fixes > 0) {
          console.log(`    Fixes: ${diff.summary.fixes}`);
        }
        if (diff.summary.newTests > 0) {
          console.log(`    New tests: ${diff.summary.newTests}`);
        }
        if (diff.summary.removedTests > 0) {
          console.log(`    Removed tests: ${diff.summary.removedTests}`);
        }
        if (diff.summary.regressions === 0 && diff.summary.fixes === 0) {
          console.log('    No changes detected.');
        }
        console.log('');
      } else {
        console.log(`\n  Baseline "${options.baseline}" not found. Run \`mcpspec baseline save ${options.baseline}\` first.\n`);
      }
    }

    await runner.cleanup();

    // Exit with appropriate code
    if (result.summary.failed > 0 || result.summary.errors > 0) {
      return EXIT_CODES.TEST_FAILURE;
    }
    return EXIT_CODES.SUCCESS;
  } catch (err) {
    const formatted = formatError(err);
    console.error(`\n  ${formatted.title}: ${formatted.description}`);
    formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
    return formatted.exitCode;
  }
}

function createReporter(options: TestCommandOptions) {
  switch (options.reporter) {
    case 'json':
      return new JsonReporter(options.output);
    case 'junit':
      return new JunitReporter(options.output);
    case 'html':
      return new HtmlReporter(options.output);
    case 'tap':
      return new TapReporter();
    default:
      return new ConsoleReporter({ ci: options.ci });
  }
}

function getReporterOutput(reporter: unknown, type: string): string | undefined {
  if (type === 'json') return (reporter as { getOutput(): string | undefined }).getOutput();
  if (type === 'junit') return (reporter as { getOutput(): string | undefined }).getOutput();
  if (type === 'html') return (reporter as { getOutput(): string | undefined }).getOutput();
  return undefined;
}

async function runWatch(collectionPath: string, options: TestCommandOptions): Promise<void> {
  const fullPath = resolve(collectionPath);
  let running = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    if (running) return;
    running = true;
    console.log('\n--- Running tests ---\n');
    await runOnce(collectionPath, options);
    running = false;
  };

  // Initial run
  await run();

  console.log(`\nWatching ${fullPath} for changes... (Ctrl+C to stop)\n`);

  watch(fullPath, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      run();
    }, 300);
  });

  // Keep process alive
  await new Promise<never>(() => {});
}
