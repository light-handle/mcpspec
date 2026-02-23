import { Command } from 'commander';
import { existsSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { EXIT_CODES } from '@mcpspec/shared';

type Platform = 'github' | 'gitlab' | 'shell';
type Check = 'test' | 'audit' | 'score' | 'bench';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface CiInitOptions {
  platform?: Platform;
  collection?: string;
  server?: string;
  checks?: string;
  failOn?: Severity;
  minScore?: string;
  force?: boolean;
}

interface CiConfig {
  platform: Platform;
  collection: string;
  server: string;
  checks: Check[];
  failOn: Severity;
  minScore: number | null;
}

function detectPlatform(): Platform | null {
  if (existsSync('.github')) return 'github';
  if (existsSync('.gitlab-ci.yml')) return 'gitlab';
  return null;
}

function detectCollection(): string | null {
  if (existsSync('mcpspec.yaml')) return './mcpspec.yaml';
  if (existsSync('mcpspec.yml')) return './mcpspec.yml';
  return null;
}

function renderGitHubActions(config: CiConfig): string {
  const lines: string[] = [];
  lines.push('name: MCP Server Tests');
  lines.push('on: [push, pull_request]');
  lines.push('');
  lines.push('jobs:');
  lines.push('  mcpspec:');
  lines.push('    runs-on: ubuntu-latest');
  lines.push('    steps:');
  lines.push('      - uses: actions/checkout@v4');
  lines.push('      - uses: actions/setup-node@v4');
  lines.push('        with:');
  lines.push("          node-version: '22'");
  lines.push('');
  lines.push('      # Or add mcpspec as a devDependency for version pinning');
  lines.push('      - run: npm install -g mcpspec');

  const artifacts: string[] = [];

  if (config.checks.includes('test')) {
    lines.push('');
    lines.push('      - name: Run tests');
    lines.push(`        run: mcpspec test ${config.collection} --ci --reporter junit --output results.xml`);
    artifacts.push('results.xml');
  }

  if (config.checks.includes('audit') && config.server) {
    lines.push('');
    lines.push('      - name: Security audit');
    lines.push(`        run: mcpspec audit "${config.server}" --mode passive --fail-on ${config.failOn}`);
  }

  if (config.checks.includes('score') && config.server) {
    lines.push('');
    lines.push('      - name: MCP Score');
    if (config.minScore !== null) {
      lines.push(`        run: mcpspec score "${config.server}" --badge badge.svg --min-score ${config.minScore}`);
    } else {
      lines.push(`        run: mcpspec score "${config.server}" --badge badge.svg`);
    }
    artifacts.push('badge.svg');
  }

  if (config.checks.includes('bench') && config.server) {
    lines.push('');
    lines.push('      - name: Performance benchmark');
    lines.push(`        run: mcpspec bench "${config.server}"`);
  }

  if (artifacts.length > 0) {
    lines.push('');
    lines.push('      - name: Upload results');
    lines.push('        if: always()');
    lines.push('        uses: actions/upload-artifact@v4');
    lines.push('        with:');
    lines.push('          name: mcpspec-results');
    lines.push('          path: |');
    for (const a of artifacts) {
      lines.push(`            ${a}`);
    }
  }

  if (config.checks.includes('test')) {
    lines.push('');
    lines.push('      - name: Test Report');
    lines.push('        if: always()');
    lines.push('        uses: mikepenz/action-junit-report@v4');
    lines.push('        with:');
    lines.push('          report_paths: results.xml');
  }

  lines.push('');
  return lines.join('\n');
}

function renderGitLabCI(config: CiConfig): string {
  const lines: string[] = [];
  lines.push('mcpspec:');
  lines.push('  image: node:22');
  lines.push('  stage: test');
  lines.push('  script:');
  lines.push('    # Or add mcpspec as a devDependency for version pinning');
  lines.push('    - npm install -g mcpspec');

  if (config.checks.includes('test')) {
    lines.push(`    - mcpspec test ${config.collection} --ci --reporter junit --output results.xml`);
  }

  if (config.checks.includes('audit') && config.server) {
    lines.push(`    - mcpspec audit "${config.server}" --mode passive --fail-on ${config.failOn}`);
  }

  if (config.checks.includes('score') && config.server) {
    if (config.minScore !== null) {
      lines.push(`    - mcpspec score "${config.server}" --min-score ${config.minScore}`);
    } else {
      lines.push(`    - mcpspec score "${config.server}"`);
    }
  }

  if (config.checks.includes('bench') && config.server) {
    lines.push(`    - mcpspec bench "${config.server}"`);
  }

  if (config.checks.includes('test')) {
    lines.push('  artifacts:');
    lines.push('    when: always');
    lines.push('    paths:');
    lines.push('      - results.xml');
    lines.push('    reports:');
    lines.push('      junit: results.xml');
    lines.push('    expire_in: 1 week');
  }

  lines.push('');
  return lines.join('\n');
}

function renderShellScript(config: CiConfig): string {
  const lines: string[] = [];
  lines.push('#!/usr/bin/env bash');
  lines.push('set -euo pipefail');
  lines.push('');
  lines.push('# Or add mcpspec as a devDependency for version pinning');
  lines.push('command -v mcpspec >/dev/null 2>&1 || npm install -g mcpspec');
  lines.push('');
  lines.push('echo "Running MCPSpec CI checks..."');
  lines.push('');

  if (config.checks.includes('test')) {
    lines.push(`mcpspec test ${config.collection} --ci --reporter junit --output results.xml`);
    lines.push('echo "Tests passed."');
    lines.push('');
  }

  if (config.checks.includes('audit') && config.server) {
    lines.push(`mcpspec audit "${config.server}" --mode passive --fail-on ${config.failOn}`);
    lines.push('echo "Security audit passed."');
    lines.push('');
  }

  if (config.checks.includes('score') && config.server) {
    if (config.minScore !== null) {
      lines.push(`mcpspec score "${config.server}" --min-score ${config.minScore}`);
    } else {
      lines.push(`mcpspec score "${config.server}"`);
    }
    lines.push('echo "MCP Score check passed."');
    lines.push('');
  }

  if (config.checks.includes('bench') && config.server) {
    lines.push(`mcpspec bench "${config.server}"`);
    lines.push('echo "Benchmark complete."');
    lines.push('');
  }

  lines.push('echo "All checks passed!"');
  lines.push('');
  return lines.join('\n');
}

function getOutputPath(platform: Platform): string {
  switch (platform) {
    case 'github':
      return '.github/workflows/mcpspec.yml';
    case 'gitlab':
      return '.gitlab-ci.yml';
    case 'shell':
      return 'mcpspec-ci.sh';
  }
}

/**
 * Replace the `mcpspec:` top-level job block in a GitLab CI file,
 * preserving all other jobs. Returns null if no mcpspec block found.
 */
function replaceGitLabJob(existing: string, newJob: string): string | null {
  const lines = existing.split('\n');
  let blockStart = -1;
  let blockEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (blockStart === -1) {
      // Look for the mcpspec: top-level key
      if (/^mcpspec:/.test(line)) {
        blockStart = i;
      }
    } else {
      // Find the end: next non-empty line at indentation 0 (next top-level key)
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#')) {
        blockEnd = i;
        break;
      }
    }
  }

  if (blockStart === -1) return null;

  // Trim trailing blank lines from the block
  while (blockEnd > blockStart && lines[blockEnd - 1]!.trim() === '') {
    blockEnd--;
  }

  const before = lines.slice(0, blockStart);
  const after = lines.slice(blockEnd);

  // Remove trailing blank lines from 'before' to avoid double spacing
  while (before.length > 0 && before[before.length - 1]!.trim() === '') {
    before.pop();
  }

  const parts: string[] = [];
  if (before.length > 0) {
    parts.push(before.join('\n'));
    parts.push('');
  }
  parts.push(newJob.trimEnd());
  if (after.length > 0) {
    const afterStr = after.join('\n').trimStart();
    if (afterStr.length > 0) {
      parts.push('');
      parts.push(afterStr);
    }
  }

  return parts.join('\n') + '\n';
}

function parseChecks(checksStr: string): Check[] {
  const valid: Check[] = ['test', 'audit', 'score', 'bench'];
  const parsed = checksStr.split(',').map((c) => c.trim()).filter(Boolean) as Check[];
  for (const c of parsed) {
    if (!valid.includes(c)) {
      console.error(`Unknown check: ${c}. Valid checks: ${valid.join(', ')}`);
      process.exit(EXIT_CODES.CONFIG_ERROR);
    }
  }
  return parsed;
}

export const ciInitCommand = new Command('ci-init')
  .description('Generate CI pipeline configuration for MCP server testing')
  .option('--platform <type>', 'CI platform: github, gitlab, or shell')
  .option('--collection <path>', 'Path to collection file')
  .option('--server <command>', 'Server command for audit/score/bench steps')
  .option('--checks <list>', 'Comma-separated checks: test,audit,score,bench', 'test,audit')
  .option('--fail-on <severity>', 'Audit severity gate: low, medium, high, critical', 'high')
  .option('--min-score <n>', 'Minimum MCP Score threshold (0-100)')
  .option('--force', 'Overwrite existing files')
  .action(async (options: CiInitOptions) => {
    try {
      let platform = options.platform as Platform | undefined;
      let collection = options.collection ?? detectCollection() ?? './mcpspec.yaml';
      let server = options.server ?? '';
      let checks = parseChecks(options.checks ?? 'test,audit');
      let failOn = (options.failOn ?? 'high') as Severity;
      let minScore: number | null = options.minScore ? Number(options.minScore) : null;

      // Interactive wizard when no --platform and stdin is TTY
      if (!platform && process.stdin.isTTY) {
        const { select, input, checkbox, confirm } = await import('@inquirer/prompts');

        console.log('\n  Generate CI pipeline configuration for MCPSpec.\n');

        const detected = detectPlatform();
        platform = await select({
          message: 'CI platform:',
          choices: [
            { name: 'GitHub Actions', value: 'github' as const },
            { name: 'GitLab CI', value: 'gitlab' as const },
            { name: 'Shell script', value: 'shell' as const },
          ],
          default: detected ?? undefined,
        });

        const detectedCollection = detectCollection();
        collection = await input({
          message: 'Collection file path:',
          default: detectedCollection ?? './mcpspec.yaml',
        });

        server = await input({
          message: 'Server command (for audit/score/bench, leave empty to skip):',
          default: '',
        });

        checks = await checkbox({
          message: 'Which checks to run?',
          choices: [
            { name: 'Test collections', value: 'test' as const, checked: true },
            { name: 'Security audit', value: 'audit' as const, checked: true },
            { name: 'MCP Score', value: 'score' as const, checked: false },
            { name: 'Performance benchmark', value: 'bench' as const, checked: false },
          ],
        }) as Check[];

        if (checks.length === 0) {
          console.error('No checks selected. At least one check is required.');
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        if (checks.includes('audit')) {
          failOn = await select({
            message: 'Fail on audit severity:',
            choices: [
              { name: 'critical', value: 'critical' as const },
              { name: 'high (recommended)', value: 'high' as const },
              { name: 'medium', value: 'medium' as const },
              { name: 'low', value: 'low' as const },
            ],
            default: 'high',
          });
        }

        if (checks.includes('score')) {
          const wantMinScore = await confirm({
            message: 'Set a minimum MCP Score threshold?',
            default: false,
          });
          if (wantMinScore) {
            const scoreStr = await input({
              message: 'Minimum score (0-100):',
              default: '70',
            });
            minScore = Number(scoreStr);
            if (isNaN(minScore) || minScore < 0 || minScore > 100) {
              console.error('Score must be a number between 0 and 100.');
              process.exit(EXIT_CODES.CONFIG_ERROR);
            }
          }
        }
      } else if (!platform) {
        // Non-interactive: auto-detect or default to shell
        platform = detectPlatform() ?? 'shell';
      }

      // Validate min-score range
      if (minScore !== null && (isNaN(minScore) || minScore < 0 || minScore > 100)) {
        console.error('--min-score must be a number between 0 and 100.');
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      const config: CiConfig = { platform, collection, server, checks, failOn, minScore };
      const outputPath = getOutputPath(platform);
      const resolvedPath = resolve(outputPath);

      const force = options.force === true;
      const fileExists = existsSync(resolvedPath);

      if (platform === 'gitlab' && fileExists) {
        const existing = readFileSync(resolvedPath, 'utf-8');
        const hasMcpspec = existing.includes('mcpspec');
        const newJob = renderGitLabCI(config);

        if (hasMcpspec && !force) {
          console.error(`MCPSpec job already exists in ${outputPath}. Use --force to overwrite, or edit manually.`);
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        if (hasMcpspec && force) {
          // Replace only the mcpspec: block, preserving other jobs
          const replaced = replaceGitLabJob(existing, newJob);
          if (replaced) {
            writeFileSync(resolvedPath, replaced, 'utf-8');
            console.log(`\nReplaced MCPSpec job in ${outputPath}`);
          } else {
            // Fallback: mcpspec substring found but not as a top-level key
            writeFileSync(resolvedPath, existing.trimEnd() + '\n\n' + newJob, 'utf-8');
            console.log(`\nAppended MCPSpec job to ${outputPath}`);
          }
        } else {
          // No existing mcpspec job — append
          writeFileSync(resolvedPath, existing.trimEnd() + '\n\n' + newJob, 'utf-8');
          console.log(`\nAppended MCPSpec job to ${outputPath}`);
        }
      } else {
        if (fileExists && !force) {
          console.error(`File already exists: ${outputPath}. Use --force to overwrite.`);
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        let content: string;
        switch (platform) {
          case 'github':
            content = renderGitHubActions(config);
            break;
          case 'gitlab':
            content = renderGitLabCI(config);
            break;
          case 'shell':
            content = renderShellScript(config);
            break;
        }

        // Ensure parent directories exist
        const parentDir = resolve(outputPath, '..');
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }

        writeFileSync(resolvedPath, content, 'utf-8');

        if (platform === 'shell') {
          chmodSync(resolvedPath, 0o755);
        }

        console.log(`\nCreated ${outputPath}`);
      }

      // Print summary
      console.log(`\n  Platform:   ${platform}`);
      console.log(`  Checks:     ${checks.join(', ')}`);
      if (checks.includes('audit')) console.log(`  Fail on:    ${failOn}`);
      if (minScore !== null) console.log(`  Min score:  ${minScore}`);
      if (server) console.log(`  Server:     ${server}`);
      console.log(`  Collection: ${collection}`);
      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to generate CI config: ${message}`);
      process.exit(EXIT_CODES.ERROR);
    }
  });
