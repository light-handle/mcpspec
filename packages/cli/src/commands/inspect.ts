import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { EXIT_CODES } from '@mcpspec/shared';
import { MCPClient, MCPSpecError, formatError } from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

export const inspectCommand = new Command('inspect')
  .description('Interactive inspection of an MCP server')
  .argument('<server>', 'Server command (e.g., "npx @modelcontextprotocol/server-filesystem /tmp")')
  .action(async (serverCommand: string) => {
    let client: MCPClient | null = null;

    try {
      client = new MCPClient({ serverConfig: serverCommand });

      console.log(`${COLORS.cyan}Connecting to: ${COLORS.reset}${serverCommand}`);
      await client.connect();

      const info = client.getServerInfo();
      if (info) {
        console.log(
          `${COLORS.green}Connected to ${info.name ?? 'unknown'} v${info.version ?? '?'}${COLORS.reset}`,
        );
      } else {
        console.log(`${COLORS.green}Connected${COLORS.reset}`);
      }

      console.log(`\nType ${COLORS.bold}.help${COLORS.reset} for available commands\n`);

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${COLORS.cyan}mcpspec>${COLORS.reset} `,
      });

      rl.prompt();

      rl.on('line', async (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) {
          rl.prompt();
          return;
        }

        try {
          if (trimmed === '.exit' || trimmed === '.quit') {
            await client?.disconnect();
            rl.close();
            process.exit(EXIT_CODES.SUCCESS);
            return;
          }

          if (trimmed === '.help') {
            console.log(`
  ${COLORS.bold}Available commands:${COLORS.reset}
    .tools             List all available tools
    .resources         List all available resources
    .call <tool> <json>  Call a tool with JSON arguments
    .schema <tool>     Show input schema for a tool
    .info              Show server info
    .exit              Disconnect and exit
`);
            rl.prompt();
            return;
          }

          if (trimmed === '.tools') {
            const tools = await client!.listTools();
            if (tools.length === 0) {
              console.log(`${COLORS.gray}No tools available${COLORS.reset}`);
            } else {
              console.log(`\n${COLORS.bold}Tools (${tools.length}):${COLORS.reset}`);
              for (const tool of tools) {
                console.log(`  ${COLORS.green}${tool.name}${COLORS.reset}`);
                if (tool.description) {
                  console.log(`    ${COLORS.gray}${tool.description}${COLORS.reset}`);
                }
              }
              console.log('');
            }
            rl.prompt();
            return;
          }

          if (trimmed === '.resources') {
            const resources = await client!.listResources();
            if (resources.length === 0) {
              console.log(`${COLORS.gray}No resources available${COLORS.reset}`);
            } else {
              console.log(`\n${COLORS.bold}Resources (${resources.length}):${COLORS.reset}`);
              for (const resource of resources) {
                console.log(`  ${COLORS.green}${resource.uri}${COLORS.reset}`);
                if (resource.name) {
                  console.log(`    ${COLORS.gray}${resource.name}${COLORS.reset}`);
                }
              }
              console.log('');
            }
            rl.prompt();
            return;
          }

          if (trimmed === '.info') {
            const serverInfo = client!.getServerInfo();
            console.log(JSON.stringify(serverInfo, null, 2));
            rl.prompt();
            return;
          }

          if (trimmed.startsWith('.schema ')) {
            const toolName = trimmed.slice(8).trim();
            const tools = await client!.listTools();
            const tool = tools.find((t) => t.name === toolName);
            if (!tool) {
              console.log(`${COLORS.red}Tool "${toolName}" not found${COLORS.reset}`);
              console.log(
                `${COLORS.gray}Available: ${tools.map((t) => t.name).join(', ')}${COLORS.reset}`,
              );
            } else {
              console.log(JSON.stringify(tool.inputSchema, null, 2));
            }
            rl.prompt();
            return;
          }

          if (trimmed.startsWith('.call ')) {
            const rest = trimmed.slice(6).trim();
            const spaceIdx = rest.indexOf(' ');
            let toolName: string;
            let args: Record<string, unknown> = {};

            if (spaceIdx === -1) {
              toolName = rest;
            } else {
              toolName = rest.slice(0, spaceIdx);
              const jsonStr = rest.slice(spaceIdx + 1).trim();
              try {
                args = JSON.parse(jsonStr) as Record<string, unknown>;
              } catch {
                console.log(`${COLORS.red}Invalid JSON: ${jsonStr}${COLORS.reset}`);
                rl.prompt();
                return;
              }
            }

            console.log(`${COLORS.gray}Calling ${toolName}...${COLORS.reset}`);
            const result = await client!.callTool(toolName, args);
            console.log(JSON.stringify(result, null, 2));
            rl.prompt();
            return;
          }

          console.log(`${COLORS.yellow}Unknown command. Type .help for available commands.${COLORS.reset}`);
        } catch (err) {
          const formatted = formatError(err);
          console.log(`${COLORS.red}${formatted.title}: ${formatted.description}${COLORS.reset}`);
        }
        rl.prompt();
      });

      rl.on('close', async () => {
        await client?.disconnect();
        process.exit(EXIT_CODES.SUCCESS);
      });
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      await client?.disconnect();
      process.exit(formatted.exitCode);
    }
  });
