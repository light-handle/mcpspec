import { Command } from 'commander';
import { testCommand } from './commands/test.js';
import { inspectCommand } from './commands/inspect.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('mcpspec')
  .description('The definitive MCP server testing platform')
  .version('0.1.0');

program.addCommand(testCommand);
program.addCommand(inspectCommand);
program.addCommand(initCommand);

program.parse(process.argv);
