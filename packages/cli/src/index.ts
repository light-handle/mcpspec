import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testCommand } from './commands/test.js';
import { inspectCommand } from './commands/inspect.js';
import { initCommand } from './commands/init.js';
import { compareCommand } from './commands/compare.js';
import { baselineCommand } from './commands/baseline.js';
import { uiCommand } from './commands/ui.js';
import { auditCommand } from './commands/audit.js';
import { benchCommand } from './commands/bench.js';
import { docsCommand } from './commands/docs.js';
import { scoreCommand } from './commands/score.js';

const __cliDir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__cliDir, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('mcpspec')
  .description('The definitive MCP server testing platform')
  .version(pkg.version);

program.addCommand(testCommand);
program.addCommand(inspectCommand);
program.addCommand(initCommand);
program.addCommand(compareCommand);
program.addCommand(baselineCommand);
program.addCommand(uiCommand);
program.addCommand(auditCommand);
program.addCommand(benchCommand);
program.addCommand(docsCommand);
program.addCommand(scoreCommand);

program.parse(process.argv);
