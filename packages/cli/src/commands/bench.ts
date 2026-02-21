import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';
import {
  MCPClient,
  BenchmarkRunner,
  formatError,
} from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  yellow: '\x1b[33m',
};

interface BenchOptions {
  iterations: string;
  tool?: string;
  args?: string;
  timeout?: string;
  warmup?: string;
}

export const benchCommand = new Command('bench')
  .description('Run performance benchmark on an MCP server')
  .argument('<server>', 'Server command or URL')
  .option('--iterations <n>', 'Number of iterations', '100')
  .option('--tool <name>', 'Tool to benchmark (defaults to first available)')
  .option('--args <json>', 'JSON arguments for the tool call', '{}')
  .option('--timeout <ms>', 'Timeout per call in milliseconds', '30000')
  .option('--warmup <n>', 'Number of warmup iterations', '5')
  .action(async (serverCommand: string, options: BenchOptions) => {
    let client: MCPClient | null = null;

    try {
      // Connect to server
      console.log(`\n${COLORS.cyan}  Connecting to:${COLORS.reset} ${serverCommand}`);
      client = new MCPClient({ serverConfig: serverCommand });
      await client.connect();

      const info = client.getServerInfo();
      console.log(`${COLORS.green}  Connected to ${info?.name ?? 'unknown'} v${info?.version ?? '?'}${COLORS.reset}\n`);

      // Discover tools
      const tools = await client.listTools();
      if (tools.length === 0) {
        console.error('  No tools available on this server.');
        await client.disconnect();
        process.exit(EXIT_CODES.ERROR);
      }

      // Select tool
      let toolName = options.tool;
      if (!toolName) {
        toolName = tools[0].name;
        console.log(`${COLORS.gray}  No --tool specified, using: ${toolName}${COLORS.reset}`);
      } else {
        const found = tools.find((t) => t.name === toolName);
        if (!found) {
          console.error(`  Tool "${toolName}" not found. Available: ${tools.map((t) => t.name).join(', ')}`);
          await client.disconnect();
          process.exit(EXIT_CODES.ERROR);
        }
      }

      // Parse args
      let args: Record<string, unknown> = {};
      if (options.args) {
        try {
          args = JSON.parse(options.args) as Record<string, unknown>;
        } catch {
          console.error(`  Invalid JSON for --args: ${options.args}`);
          await client.disconnect();
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }
      }

      const iterations = parseInt(options.iterations, 10);
      const warmup = parseInt(options.warmup ?? '5', 10);
      const timeout = parseInt(options.timeout ?? '30000', 10);

      console.log(`${COLORS.bold}  Benchmarking: ${toolName}${COLORS.reset}`);
      console.log(`  Iterations: ${iterations} | Warmup: ${warmup} | Timeout: ${timeout}ms\n`);

      // Run benchmark
      const runner = new BenchmarkRunner();
      const result = await runner.run(client, toolName, args, {
        iterations,
        warmupIterations: warmup,
        concurrency: 1,
        timeout,
      }, {
        onWarmupStart: (n) => {
          console.log(`${COLORS.gray}  Warming up (${n} iterations)...${COLORS.reset}`);
        },
        onIterationComplete: (i, total) => {
          if (i % Math.max(1, Math.floor(total / 10)) === 0 || i === total) {
            process.stdout.write(`\r  Progress: ${i}/${total}`);
          }
        },
        onComplete: () => {
          console.log('');
        },
      });

      // Print results
      console.log(`\n${COLORS.bold}  Benchmark Results${COLORS.reset}`);
      console.log(`  ${'─'.repeat(40)}`);
      console.log(`  Tool:       ${result.toolName}`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Errors:     ${result.errors}`);
      console.log('');
      console.log(`  ${COLORS.bold}Latency Statistics:${COLORS.reset}`);
      console.log(`    Min:    ${result.stats.min.toFixed(2)}ms`);
      console.log(`    Max:    ${result.stats.max.toFixed(2)}ms`);
      console.log(`    Mean:   ${result.stats.mean.toFixed(2)}ms`);
      console.log(`    Median: ${result.stats.median.toFixed(2)}ms`);
      console.log(`    P95:    ${result.stats.p95.toFixed(2)}ms`);
      console.log(`    P99:    ${result.stats.p99.toFixed(2)}ms`);
      console.log(`    StdDev: ${result.stats.stddev.toFixed(2)}ms`);

      const durationSec = (result.completedAt.getTime() - result.startedAt.getTime()) / 1000;
      const rps = result.iterations / durationSec;
      console.log(`\n  Throughput: ${COLORS.green}${rps.toFixed(1)} calls/sec${COLORS.reset}`);
      console.log('');

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
