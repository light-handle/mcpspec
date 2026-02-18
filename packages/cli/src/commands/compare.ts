import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const compareCommand = new Command('compare')
  .description('Compare test runs (Phase 2)')
  .argument('[run1]', 'First run ID')
  .argument('[run2]', 'Second run ID')
  .option('--baseline <name>', 'Compare against named baseline')
  .action((_run1: string | undefined, _run2: string | undefined, _options: Record<string, unknown>) => {
    console.error('Compare is not yet implemented. Coming in v0.2.0.');
    process.exit(EXIT_CODES.ERROR);
  });
