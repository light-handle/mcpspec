import { Command } from 'commander';
import { writeFileSync, chmodSync } from 'node:fs';
import { EXIT_CODES } from '@mcpspec/shared';
import {
  RecordingStore,
  MockMCPServer,
  MockGenerator,
  formatError,
  type MatchMode,
  type OnMissingBehavior,
} from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

interface MockOptions {
  mode: string;
  latency: string;
  onMissing: string;
  generate?: string;
}

export const mockCommand = new Command('mock')
  .description('Start a mock MCP server from a saved recording')
  .argument('<recording>', 'Recording name (from mcpspec record)')
  .option('--mode <mode>', 'Matching strategy: match or sequential', 'match')
  .option('--latency <ms>', 'Response delay: 0, milliseconds, or "original"', '0')
  .option('--on-missing <behavior>', 'Unrecorded tool behavior: error or empty', 'error')
  .option('--generate <path>', 'Generate standalone .js file instead of starting server')
  .action(async (recordingName: string, options: MockOptions) => {
    try {
      // Validate options
      const mode = options.mode as MatchMode;
      if (mode !== 'match' && mode !== 'sequential') {
        console.error(`${COLORS.red}Error: --mode must be "match" or "sequential"${COLORS.reset}`);
        process.exit(EXIT_CODES.VALIDATION_ERROR);
      }

      const onMissing = options.onMissing as OnMissingBehavior;
      if (onMissing !== 'error' && onMissing !== 'empty') {
        console.error(`${COLORS.red}Error: --on-missing must be "error" or "empty"${COLORS.reset}`);
        process.exit(EXIT_CODES.VALIDATION_ERROR);
      }

      const latency: number | 'original' = options.latency === 'original'
        ? 'original'
        : parseInt(options.latency, 10);

      if (typeof latency === 'number' && isNaN(latency)) {
        console.error(`${COLORS.red}Error: --latency must be a number or "original"${COLORS.reset}`);
        process.exit(EXIT_CODES.VALIDATION_ERROR);
      }

      // Load recording
      const store = new RecordingStore();
      const recording = store.load(recordingName);

      if (!recording) {
        console.error(`${COLORS.red}Error: Recording "${recordingName}" not found${COLORS.reset}`);
        console.error(`${COLORS.dim}  Available recordings: ${store.list().join(', ') || '(none)'}${COLORS.reset}`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      // Generate mode: write standalone file and exit
      if (options.generate) {
        const generator = new MockGenerator();
        const code = generator.generate({ recording, mode, latency, onMissing });
        writeFileSync(options.generate, code, 'utf-8');
        try {
          chmodSync(options.generate, 0o755);
        } catch {
          // chmod may fail on Windows, not critical
        }
        console.error(`${COLORS.green}Generated mock server: ${options.generate}${COLORS.reset}`);
        console.error(`${COLORS.dim}  Run: node ${options.generate}${COLORS.reset}`);
        console.error(`${COLORS.dim}  Requires: @modelcontextprotocol/sdk${COLORS.reset}`);
        process.exit(EXIT_CODES.SUCCESS);
      }

      // Server mode: start mock MCP server on stdio
      // All human-readable output goes to stderr (stdout is the MCP protocol channel)
      console.error(`${COLORS.cyan}MCPSpec Mock Server${COLORS.reset}`);
      console.error(`${COLORS.dim}  Recording: ${recording.name}${COLORS.reset}`);
      console.error(`${COLORS.dim}  Tools: ${recording.tools.map((t) => t.name).join(', ')}${COLORS.reset}`);
      console.error(`${COLORS.dim}  Steps: ${recording.steps.length}${COLORS.reset}`);
      console.error(`${COLORS.dim}  Mode: ${mode} | Latency: ${latency}ms | On missing: ${onMissing}${COLORS.reset}`);
      console.error('');

      const server = new MockMCPServer({ recording, mode, latency, onMissing });
      await server.start();
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      process.exit(formatted.exitCode);
    }
  });
