import { Command } from 'commander';
import { EXIT_CODES } from '@mcpspec/shared';
import type { SeverityLevel } from '@mcpspec/shared';
import {
  MCPClient,
  ScanConfig,
  SecurityScanner,
  formatError,
} from '@mcpspec/core';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: COLORS.red + COLORS.bold,
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.cyan,
  info: COLORS.gray,
};

interface AuditOptions {
  mode: string;
  acknowledgeRisk: boolean;
  failOn?: string;
  rules?: string[];
}

export const auditCommand = new Command('audit')
  .description('Run security audit on an MCP server')
  .argument('<server>', 'Server command or URL')
  .option('--mode <mode>', 'Scan mode: passive, active, aggressive', 'passive')
  .option('--acknowledge-risk', 'Skip confirmation prompt for active/aggressive modes', false)
  .option('--fail-on <severity>', 'Fail with exit code 6 if findings at or above severity: info, low, medium, high, critical')
  .option('--rules <rules...>', 'Only run specific rules')
  .action(async (serverCommand: string, options: AuditOptions) => {
    let client: MCPClient | null = null;

    try {
      const mode = options.mode as 'passive' | 'active' | 'aggressive';
      const config = new ScanConfig({
        mode,
        acknowledgeRisk: options.acknowledgeRisk,
        rules: options.rules,
      });

      // Confirmation prompt for active/aggressive modes
      if (config.requiresConfirmation()) {
        console.log(`\n${COLORS.yellow}${COLORS.bold}  WARNING: Security Scan${COLORS.reset}`);
        console.log(`${COLORS.yellow}  Mode: ${mode}${COLORS.reset}`);
        console.log(`${COLORS.yellow}  This sends potentially harmful payloads to the server.${COLORS.reset}`);
        console.log(`${COLORS.yellow}  NEVER run against production systems!${COLORS.reset}\n`);

        const { confirm } = await import('@inquirer/prompts');
        const confirmed = await confirm({
          message: 'Is this a TEST environment? Continue with scan?',
          default: false,
        });
        if (!confirmed) {
          console.log('  Scan cancelled.');
          process.exit(EXIT_CODES.SUCCESS);
        }
      }

      // Connect to server
      console.log(`\n${COLORS.cyan}  Connecting to:${COLORS.reset} ${serverCommand}`);
      client = new MCPClient({ serverConfig: serverCommand });
      await client.connect();

      const info = client.getServerInfo();
      console.log(`${COLORS.green}  Connected to ${info?.name ?? 'unknown'} v${info?.version ?? '?'}${COLORS.reset}`);
      console.log(`${COLORS.gray}  Scan mode: ${mode} | Rules: ${config.rules.join(', ')}${COLORS.reset}\n`);

      // Run scan
      const scanner = new SecurityScanner();
      const result = await scanner.scan(client, config, {
        onRuleStart: (_ruleId, ruleName) => {
          process.stdout.write(`  ${COLORS.gray}Running ${ruleName}...${COLORS.reset}`);
        },
        onRuleComplete: (_ruleId, findingCount) => {
          if (findingCount > 0) {
            console.log(` ${COLORS.yellow}${findingCount} finding(s)${COLORS.reset}`);
          } else {
            console.log(` ${COLORS.green}clean${COLORS.reset}`);
          }
        },
      });

      // Print results
      console.log(`\n${COLORS.bold}  Security Scan Results${COLORS.reset}`);
      console.log(`  ${'─'.repeat(50)}`);
      console.log(`  Server: ${result.serverName}`);
      console.log(`  Mode: ${result.mode}`);
      console.log(`  Findings: ${result.summary.totalFindings}`);

      if (result.summary.totalFindings > 0) {
        console.log(`\n  ${COLORS.bold}By Severity:${COLORS.reset}`);
        for (const sev of ['critical', 'high', 'medium', 'low', 'info'] as SeverityLevel[]) {
          const count = result.summary.bySeverity[sev];
          if (count > 0) {
            console.log(`    ${SEVERITY_COLORS[sev]}${sev.toUpperCase()}${COLORS.reset}: ${count}`);
          }
        }

        console.log(`\n  ${COLORS.bold}Findings:${COLORS.reset}\n`);
        for (const finding of result.findings) {
          const color = SEVERITY_COLORS[finding.severity];
          console.log(`  ${color}[${finding.severity.toUpperCase()}]${COLORS.reset} ${finding.title}`);
          console.log(`    ${COLORS.gray}${finding.description}${COLORS.reset}`);
          if (finding.evidence) {
            console.log(`    ${COLORS.gray}Evidence: ${finding.evidence.slice(0, 100)}${COLORS.reset}`);
          }
          if (finding.remediation) {
            console.log(`    ${COLORS.cyan}Fix: ${finding.remediation}${COLORS.reset}`);
          }
          console.log('');
        }
      } else {
        console.log(`\n  ${COLORS.green}No security findings detected.${COLORS.reset}\n`);
      }

      await client.disconnect();

      // Exit with appropriate code
      if (options.failOn) {
        const failOnSeverity = options.failOn as SeverityLevel;
        const failConfig = new ScanConfig({ severityThreshold: failOnSeverity });
        const matchingFindings = result.findings.filter((f) => failConfig.meetsThreshold(f.severity));
        if (matchingFindings.length > 0) {
          process.exit(EXIT_CODES.SECURITY_FINDINGS);
        }
      }

      process.exit(EXIT_CODES.SUCCESS);
    } catch (err) {
      const formatted = formatError(err);
      console.error(`\n  ${formatted.title}: ${formatted.description}`);
      formatted.suggestions.forEach((s) => console.error(`    - ${s}`));
      await client?.disconnect();
      process.exit(formatted.exitCode);
    }
  });
