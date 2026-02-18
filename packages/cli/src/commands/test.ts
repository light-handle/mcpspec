import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXIT_CODES } from '@mcpspec/shared';
import {
  loadYamlSafely,
  TestRunner,
  ConsoleReporter,
  JsonReporter,
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

export const testCommand = new Command('test')
  .description('Run tests from a collection file')
  .argument('[collection]', 'Path to collection YAML file', 'mcpspec.yaml')
  .option('--env <environment>', 'Environment to use')
  .option('--reporter <type>', 'Reporter type: console, json', 'console')
  .option('--output <path>', 'Output file path for results')
  .option('--ci', 'CI mode (no colors, structured output)', false)
  .action(async (collectionPath: string, options: {
    env?: string;
    reporter: string;
    output?: string;
    ci: boolean;
  }) => {
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
        process.exit(EXIT_CODES.CONFIG_ERROR);
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
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const reporter =
        options.reporter === 'json'
          ? new JsonReporter(options.output)
          : new ConsoleReporter({ ci: options.ci });

      const runner = new TestRunner();
      const result = await runner.run(collection, {
        environment: options.env,
        reporter,
      });

      // Write output file if specified
      if (options.output && options.reporter === 'json') {
        const jsonReporter = reporter as JsonReporter;
        const output = jsonReporter.getOutput();
        if (output) {
          writeFileSync(resolve(options.output), output, 'utf-8');
        }
      }

      await runner.cleanup();

      // Exit with appropriate code
      if (result.summary.failed > 0 || result.summary.errors > 0) {
        process.exit(EXIT_CODES.TEST_FAILURE);
      }
      process.exit(EXIT_CODES.SUCCESS);
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      process.exit(formatted.exitCode);
    }
  });
