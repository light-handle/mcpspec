import { Command } from 'commander';
import { testCommand } from './commands/test.js';
import { inspectCommand } from './commands/inspect.js';
import { initCommand } from './commands/init.js';
import { compareCommand } from './commands/compare.js';
import { baselineCommand } from './commands/baseline.js';
import { uiCommand } from './commands/ui.js';

const program = new Command();

program
  .name('mcpspec')
  .description('The definitive MCP server testing platform')
  .version('0.3.0');

program.addCommand(testCommand);
program.addCommand(inspectCommand);
program.addCommand(initCommand);
program.addCommand(compareCommand);
program.addCommand(baselineCommand);
program.addCommand(uiCommand);

program.parse(process.argv);
