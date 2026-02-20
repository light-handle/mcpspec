import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXIT_CODES } from '@mcpspec/shared';
import { BaselineStore } from '@mcpspec/core';
import type { TestRunResult } from '@mcpspec/shared';

export const baselineCommand = new Command('baseline')
  .description('Manage test baselines')
  .addCommand(
    new Command('save')
      .description('Save a test run result as a named baseline')
      .argument('<name>', 'Baseline name')
      .argument('[results-file]', 'Path to JSON results file')
      .action((name: string, resultsFile?: string) => {
        const store = new BaselineStore();

        if (!resultsFile) {
          console.error('Usage: mcpspec baseline save <name> <results-file.json>');
          console.error('  Run tests with --reporter json --output results.json first.');
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        try {
          const fullPath = resolve(resultsFile);
          const content = readFileSync(fullPath, 'utf-8');
          const raw = JSON.parse(content);

          const result: TestRunResult = {
            ...raw,
            startedAt: new Date(raw.startedAt),
            completedAt: new Date(raw.completedAt),
          };

          const savedPath = store.save(name, result);
          console.log(`Baseline "${name}" saved to ${savedPath}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Failed to save baseline: ${message}`);
          process.exit(EXIT_CODES.ERROR);
        }
      }),
  )
  .addCommand(
    new Command('list')
      .description('List saved baselines')
      .action(() => {
        const store = new BaselineStore();
        const baselines = store.list();

        if (baselines.length === 0) {
          console.log('No baselines saved.');
          console.log('Run `mcpspec baseline save <name> <results.json>` to create one.');
          return;
        }

        console.log('Saved baselines:');
        for (const name of baselines) {
          console.log(`  - ${name}`);
        }
      }),
  );
