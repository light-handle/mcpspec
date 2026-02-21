import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { EXIT_CODES } from '@mcpspec/shared';
import { MCPClient, MCPScoreCalculator, BadgeGenerator, formatError } from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
};

function scoreColor(score: number): string {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.yellow;
  return COLORS.red;
}

interface ScoreOptions {
  badge?: string;
}

export const scoreCommand = new Command('score')
  .description('Calculate MCP Score for a server')
  .argument('<server>', 'Server command or URL')
  .option('--badge <path>', 'Output badge SVG path')
  .action(async (serverCommand: string, options: ScoreOptions) => {
    let client: MCPClient | null = null;

    try {
      console.log(`\n${COLORS.cyan}  Connecting to:${COLORS.reset} ${serverCommand}`);
      client = new MCPClient({ serverConfig: serverCommand });
      await client.connect();

      const info = client.getServerInfo();
      console.log(`${COLORS.green}  Connected to ${info?.name ?? 'unknown'} v${info?.version ?? '?'}${COLORS.reset}\n`);

      const calculator = new MCPScoreCalculator();
      const score = await calculator.calculate(client, {
        onCategoryStart: (category) => {
          process.stdout.write(`${COLORS.gray}  Evaluating ${category}...${COLORS.reset}`);
        },
        onCategoryComplete: (_category, categoryScore) => {
          const color = scoreColor(categoryScore);
          console.log(` ${color}${categoryScore}/100${COLORS.reset}`);
        },
      });

      // Print results
      console.log(`\n${COLORS.bold}  MCP Score${COLORS.reset}`);
      console.log(`  ${'─'.repeat(40)}`);

      const categories = [
        { name: 'Documentation', score: score.categories.documentation },
        { name: 'Schema Quality', score: score.categories.schemaQuality },
        { name: 'Error Handling', score: score.categories.errorHandling },
        { name: 'Performance', score: score.categories.performance },
        { name: 'Security', score: score.categories.security },
      ];

      for (const cat of categories) {
        const color = scoreColor(cat.score);
        const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
        console.log(`  ${cat.name.padEnd(16)} ${bar} ${color}${cat.score}/100${COLORS.reset}`);
      }

      const overallColor = scoreColor(score.overall);
      console.log(`\n  ${COLORS.bold}Overall: ${overallColor}${score.overall}/100${COLORS.reset}\n`);

      if (options.badge) {
        const badgeGenerator = new BadgeGenerator();
        const svg = badgeGenerator.generate(score);
        writeFileSync(options.badge, svg, 'utf-8');
        console.log(`${COLORS.green}  Badge written to ${options.badge}${COLORS.reset}\n`);
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
