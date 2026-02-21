import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';
import { MCPClient, DocGenerator, formatError } from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface DocsOptions {
  format: string;
  output?: string;
}

export const docsCommand = new Command('docs')
  .description('Generate documentation from an MCP server')
  .argument('<server>', 'Server command or URL')
  .option('--format <format>', 'Output format: markdown, html', 'markdown')
  .option('--output <dir>', 'Output directory')
  .action(async (serverCommand: string, options: DocsOptions) => {
    let client: MCPClient | null = null;

    try {
      console.log(`\n${COLORS.cyan}  Connecting to:${COLORS.reset} ${serverCommand}`);
      client = new MCPClient({ serverConfig: serverCommand });
      await client.connect();

      const info = client.getServerInfo();
      console.log(`${COLORS.green}  Connected to ${info?.name ?? 'unknown'} v${info?.version ?? '?'}${COLORS.reset}\n`);

      const format = options.format === 'html' ? 'html' : 'markdown' as const;
      const generator = new DocGenerator();
      const content = await generator.generate(client, {
        format,
        outputDir: options.output,
      });

      if (options.output) {
        const filename = format === 'html' ? 'index.html' : 'README.md';
        console.log(`${COLORS.green}  Documentation written to ${options.output}/${filename}${COLORS.reset}\n`);
      } else {
        console.log(content);
      }

      await client.disconnect();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      await client?.disconnect();
      process.exit(formatted.exitCode);
    }
  });
