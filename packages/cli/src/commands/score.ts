import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const scoreCommand = new Command('score')
  .description('Calculate MCP Score for a server (Phase 5)')
  .argument('<server>', 'Server command or URL')
  .option('--badge <path>', 'Output badge SVG path')
  .action((_server: string, _options: Record<string, unknown>) => {
    console.error('MCP Score is not yet implemented. Coming in v1.0.0.');
    process.exit(EXIT_CODES.ERROR);
  });
