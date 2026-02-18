import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const baselineCommand = new Command('baseline')
  .description('Manage test baselines (Phase 2)')
  .addCommand(
    new Command('save')
      .argument('<name>', 'Baseline name')
      .action((_name: string) => {
        console.error('Baseline save is not yet implemented. Coming in v0.2.0.');
        process.exit(EXIT_CODES.ERROR);
      }),
  )
  .addCommand(
    new Command('list').action(() => {
      console.error('Baseline list is not yet implemented. Coming in v0.2.0.');
      process.exit(EXIT_CODES.ERROR);
    }),
  );
