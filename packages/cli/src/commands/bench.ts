import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const benchCommand = new Command('bench')
  .description('Run performance benchmark (Phase 4)')
  .argument('<server>', 'Server command or URL')
  .option('--iterations <n>', 'Number of iterations', '100')
  .action((_server: string, _options: Record<string, unknown>) => {
    console.error('Benchmarking is not yet implemented. Coming in v0.4.0.');
    process.exit(EXIT_CODES.ERROR);
  });
