import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const docsCommand = new Command('docs')
  .description('Generate documentation from an MCP server (Phase 5)')
  .argument('<server>', 'Server command or URL')
  .option('--format <format>', 'Output format: markdown, html', 'markdown')
  .option('--output <dir>', 'Output directory')
  .action((_server: string, _options: Record<string, unknown>) => {
    console.error('Documentation generation is not yet implemented. Coming in v1.0.0.');
    process.exit(EXIT_CODES.ERROR);
  });
