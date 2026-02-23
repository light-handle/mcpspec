import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { EXIT_CODES } from '@mcpspec/shared';
import type { Recording, RecordingStep } from '@mcpspec/shared';
import {
  MCPClient,
  RecordingStore,
  RecordingReplayer,
  RecordingDiffer,
  formatError,
} from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function formatInputSummary(input: Record<string, unknown>): string {
  const keys = Object.keys(input);
  if (keys.length === 0) return '';
  const parts = keys.map((k) => {
    const v = input[k];
    const val = typeof v === 'string' ? v : JSON.stringify(v);
    const truncated = val != null && val.length > 30 ? val.slice(0, 27) + '...' : val;
    return `${k}=${truncated}`;
  });
  return ` ${COLORS.gray}(${parts.join(', ')})${COLORS.reset}`;
}

function formatOutputSummary(output: unknown[]): string {
  if (!output || output.length === 0) return '';
  const first = output[0] as Record<string, unknown> | undefined;
  if (!first) return '';
  const text = first['text'] as string | undefined;
  if (!text) return '';
  const truncated = text.length > 50 ? text.slice(0, 47) + '...' : text;
  return ` ${COLORS.gray}→ ${truncated}${COLORS.reset}`;
}

export const recordCommand = new Command('record')
  .description('Record, replay, and manage inspector session recordings');

recordCommand
  .command('start')
  .description('Start a recording session (interactive REPL)')
  .argument('<server>', 'Server command (e.g., "npx @modelcontextprotocol/server-filesystem /tmp")')
  .action(async (serverCommand: string) => {
    let client: MCPClient | null = null;
    const store = new RecordingStore();
    const steps: RecordingStep[] = [];
    let toolList: Array<{ name: string; description?: string }> = [];

    try {
      client = new MCPClient({ serverConfig: serverCommand });
      console.log(`${COLORS.cyan}Connecting to: ${COLORS.reset}${serverCommand}`);
      await client.connect();

      const info = client.getServerInfo();
      const serverName = info?.name ?? 'unknown';
      console.log(`${COLORS.green}Connected to ${serverName}${COLORS.reset}`);

      const tools = await client.listTools();
      toolList = tools.map((t) => ({ name: t.name, description: t.description }));
      console.log(`${COLORS.gray}${tools.length} tools available${COLORS.reset}`);
      console.log(`\n${COLORS.bold}Recording mode.${COLORS.reset} Type ${COLORS.bold}.help${COLORS.reset} for commands.\n`);

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${COLORS.red}rec>${COLORS.reset} `,
      });

      rl.prompt();

      rl.on('line', async (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) { rl.prompt(); return; }

        try {
          if (trimmed === '.exit' || trimmed === '.quit') {
            if (steps.length > 0) {
              console.log(`${COLORS.yellow}Warning: ${steps.length} unsaved step(s). Use .save <name> first, or .exit to discard.${COLORS.reset}`);
              if (trimmed === '.exit') {
                await client?.disconnect();
                rl.close();
                process.exit(EXIT_CODES.SUCCESS);
              }
            } else {
              await client?.disconnect();
              rl.close();
              process.exit(EXIT_CODES.SUCCESS);
            }
            return;
          }

          if (trimmed === '.help') {
            console.log(`
  ${COLORS.bold}Recording commands:${COLORS.reset}
    .tools                  List available tools
    .call <tool> <json>     Call a tool and record the result
    .steps                  List recorded steps
    .save <name>            Save recording with given name
    .exit                   Disconnect and exit
`);
            rl.prompt();
            return;
          }

          if (trimmed === '.tools') {
            if (toolList.length === 0) {
              console.log(`${COLORS.gray}No tools available${COLORS.reset}`);
            } else {
              console.log(`\n${COLORS.bold}Tools (${toolList.length}):${COLORS.reset}`);
              for (const tool of toolList) {
                console.log(`  ${COLORS.green}${tool.name}${COLORS.reset}`);
                if (tool.description) console.log(`    ${COLORS.gray}${tool.description}${COLORS.reset}`);
              }
              console.log('');
            }
            rl.prompt();
            return;
          }

          if (trimmed === '.steps') {
            if (steps.length === 0) {
              console.log(`${COLORS.gray}No steps recorded yet${COLORS.reset}`);
            } else {
              console.log(`\n${COLORS.bold}Recorded steps (${steps.length}):${COLORS.reset}`);
              for (let i = 0; i < steps.length; i++) {
                const s = steps[i]!;
                const status = s.isError ? `${COLORS.red}ERROR${COLORS.reset}` : `${COLORS.green}OK${COLORS.reset}`;
                console.log(`  ${i + 1}. ${s.tool} ${COLORS.gray}${JSON.stringify(s.input)}${COLORS.reset} [${status}] ${COLORS.gray}${s.durationMs}ms${COLORS.reset}`);
              }
              console.log('');
            }
            rl.prompt();
            return;
          }

          if (trimmed.startsWith('.save ')) {
            const name = trimmed.slice(6).trim();
            if (!name) {
              console.log(`${COLORS.red}Usage: .save <name>${COLORS.reset}`);
              rl.prompt();
              return;
            }
            if (steps.length === 0) {
              console.log(`${COLORS.yellow}No steps to save. Use .call first.${COLORS.reset}`);
              rl.prompt();
              return;
            }

            const recording: Recording = {
              id: randomUUID(),
              name,
              serverName: info?.name,
              tools: toolList,
              steps: [...steps],
              createdAt: new Date().toISOString(),
            };

            const path = store.save(name, recording);
            console.log(`${COLORS.green}Saved recording "${name}" (${steps.length} steps) to ${path}${COLORS.reset}`);
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
            const start = performance.now();
            let output: unknown[] = [];
            let isError = false;

            try {
              const result = await client!.callTool(toolName, args);
              output = result.content as unknown[];
              isError = result.isError === true;
            } catch (err) {
              output = [{ type: 'text', text: err instanceof Error ? err.message : String(err) }];
              isError = true;
            }

            const durationMs = Math.round(performance.now() - start);
            steps.push({ tool: toolName, input: args, output, isError, durationMs });

            const statusLabel = isError ? `${COLORS.red}ERROR${COLORS.reset}` : `${COLORS.green}OK${COLORS.reset}`;
            console.log(`[${statusLabel}] ${COLORS.gray}${durationMs}ms${COLORS.reset} (step ${steps.length})`);
            console.log(JSON.stringify(output, null, 2));
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

recordCommand
  .command('list')
  .description('List saved recordings')
  .action(() => {
    const store = new RecordingStore();
    const recordings = store.list();

    if (recordings.length === 0) {
      console.log(`${COLORS.gray}No recordings found.${COLORS.reset}`);
      return;
    }

    console.log(`\n${COLORS.bold}Saved recordings (${recordings.length}):${COLORS.reset}`);
    for (const name of recordings) {
      const recording = store.load(name);
      if (recording) {
        console.log(`  ${COLORS.green}${name}${COLORS.reset} ${COLORS.gray}(${recording.steps.length} steps, ${recording.createdAt})${COLORS.reset}`);
      } else {
        console.log(`  ${COLORS.green}${name}${COLORS.reset}`);
      }
    }
    console.log('');
  });

recordCommand
  .command('replay')
  .description('Replay a recording against a server and show diff')
  .argument('<name>', 'Recording name')
  .argument('<server>', 'Server command')
  .action(async (name: string, serverCommand: string) => {
    const store = new RecordingStore();
    const recording = store.load(name);

    if (!recording) {
      console.error(`${COLORS.red}Recording "${name}" not found.${COLORS.reset}`);
      process.exit(EXIT_CODES.ERROR);
    }

    let client: MCPClient | null = null;
    try {
      client = new MCPClient({ serverConfig: serverCommand });
      console.log(`${COLORS.cyan}Connecting to: ${COLORS.reset}${serverCommand}`);
      await client.connect();
      console.log(`${COLORS.green}Connected. Replaying ${recording.steps.length} steps...${COLORS.reset}\n`);

      const replayer = new RecordingReplayer();
      const result = await replayer.replay(recording, client, {
        onStepStart: (i, step) => {
          const inputSummary = formatInputSummary(step.input);
          process.stdout.write(`  ${i + 1}/${recording.steps.length} ${step.tool}${inputSummary}... `);
        },
        onStepComplete: (_i, replayed) => {
          const outputSummary = formatOutputSummary(replayed.output);
          const status = replayed.isError
            ? `${COLORS.red}ERROR${COLORS.reset}`
            : `${COLORS.green}OK${COLORS.reset}`;
          console.log(`[${status}] ${COLORS.gray}${replayed.durationMs}ms${COLORS.reset}${outputSummary}`);
        },
      });

      const differ = new RecordingDiffer();
      const diff = differ.diff(recording, result.replayedSteps, result.replayedAt);

      console.log(`\n${COLORS.bold}Diff Summary:${COLORS.reset}`);
      console.log(`  ${COLORS.green}Matched:${COLORS.reset} ${diff.summary.matched}`);
      console.log(`  ${COLORS.yellow}Changed:${COLORS.reset} ${diff.summary.changed}`);
      console.log(`  ${COLORS.blue}Added:${COLORS.reset}   ${diff.summary.added}`);
      console.log(`  ${COLORS.red}Removed:${COLORS.reset} ${diff.summary.removed}`);

      if (diff.summary.changed > 0) {
        console.log(`\n${COLORS.bold}Changed steps:${COLORS.reset}`);
        for (const step of diff.steps) {
          if (step.type === 'changed') {
            console.log(`  Step ${step.index + 1} (${step.tool}): ${COLORS.yellow}${step.outputDiff}${COLORS.reset}`);
          }
        }
      }

      await client.disconnect();
      const exitCode = diff.summary.changed > 0 || diff.summary.removed > 0 ? EXIT_CODES.TEST_FAILURE : EXIT_CODES.SUCCESS;
      process.exit(exitCode);
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      await client?.disconnect();
      process.exit(formatted.exitCode);
    }
  });

recordCommand
  .command('delete')
  .description('Delete a saved recording')
  .argument('<name>', 'Recording name')
  .action((name: string) => {
    const store = new RecordingStore();
    if (store.delete(name)) {
      console.log(`${COLORS.green}Deleted recording "${name}".${COLORS.reset}`);
    } else {
      console.error(`${COLORS.red}Recording "${name}" not found.${COLORS.reset}`);
      process.exit(EXIT_CODES.ERROR);
    }
  });
