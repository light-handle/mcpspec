import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';

export const auditCommand = new Command('audit')
  .description('Run security audit on an MCP server (Phase 4)')
  .argument('<server>', 'Server command or URL')
  .option('--mode <mode>', 'Scan mode: passive, active, aggressive', 'passive')
  .option('--acknowledge-risk', 'Skip confirmation prompt')
  .option('--fail-on <severity>', 'Fail on severity: info, low, medium, high, critical')
  .action((_server: string, _options: Record<string, unknown>) => {
    console.error('Security audit is not yet implemented. Coming in v0.4.0.');
    process.exit(EXIT_CODES.ERROR);
  });
