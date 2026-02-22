import { randomUUID } from 'node:crypto';
import type { SecurityFinding, SecurityScanResult, SecurityScanSummary, SeverityLevel } from '@mcpspec/shared';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';
import type { ToolInfo } from '../client/mcp-client-interface.js';
import type { SecurityRule } from './rule-interface.js';
import type { ScanConfig } from './scan-config.js';
import { PathTraversalRule } from './rules/path-traversal.js';
import { InputValidationRule } from './rules/input-validation.js';
import { ResourceExhaustionRule } from './rules/resource-exhaustion.js';
import { AuthBypassRule } from './rules/auth-bypass.js';
import { InjectionRule } from './rules/injection.js';
import { InformationDisclosureRule } from './rules/information-disclosure.js';

const SEVERITY_ORDER: SeverityLevel[] = ['info', 'low', 'medium', 'high', 'critical'];

export interface ScanProgress {
  onRuleStart?: (ruleId: string, ruleName: string) => void;
  onRuleComplete?: (ruleId: string, findingCount: number) => void;
  onFinding?: (finding: SecurityFinding) => void;
}

export interface DryRunResult {
  tools: Array<{ name: string; included: boolean; reason?: string }>;
  rules: string[];
  mode: string;
}

export class SecurityScanner {
  private readonly rules: Map<string, SecurityRule> = new Map();

  constructor() {
    this.registerBuiltinRules();
  }

  registerRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Preview which tools will be scanned without actually running payloads.
   */
  async dryRun(client: MCPClientInterface, config: ScanConfig): Promise<DryRunResult> {
    const allTools = await client.listTools();
    const toolResults = allTools.map((tool) => {
      if (config.excludeTools.includes(tool.name)) {
        return { name: tool.name, included: false, reason: 'excluded by --exclude-tools' };
      }
      if (config.isToolExcluded(tool.name)) {
        return { name: tool.name, included: false, reason: 'auto-skipped (destructive name)' };
      }
      return { name: tool.name, included: true };
    });

    return {
      tools: toolResults,
      rules: [...config.rules],
      mode: config.mode,
    };
  }

  /**
   * Filter tools based on config exclusions.
   */
  filterTools(tools: ToolInfo[], config: ScanConfig): ToolInfo[] {
    return tools.filter((tool) => !config.isToolExcluded(tool.name));
  }

  async scan(
    client: MCPClientInterface,
    config: ScanConfig,
    progress?: ScanProgress,
  ): Promise<SecurityScanResult> {
    const startedAt = new Date();
    const findings: SecurityFinding[] = [];

    const allTools = await client.listTools();
    const tools = this.filterTools(allTools, config);

    const skippedCount = allTools.length - tools.length;
    if (skippedCount > 0) {
      findings.push({
        id: randomUUID(),
        rule: 'safety-filter',
        severity: 'info',
        title: `${skippedCount} tool(s) excluded from scan`,
        description: `${skippedCount} tool(s) were excluded from scanning due to safety filters or --exclude-tools.`,
      });
    }

    for (const ruleId of config.rules) {
      const rule = this.rules.get(ruleId);
      if (!rule) continue;

      progress?.onRuleStart?.(rule.id, rule.name);

      try {
        const ruleFindings = await rule.scan(client, tools, config);
        for (const finding of ruleFindings) {
          findings.push(finding);
          progress?.onFinding?.(finding);
        }
        progress?.onRuleComplete?.(rule.id, ruleFindings.length);
      } catch (err) {
        // Report rule failure as info finding
        const errorFinding: SecurityFinding = {
          id: randomUUID(),
          rule: ruleId,
          severity: 'info',
          title: `Rule "${ruleId}" failed to complete`,
          description: `The security rule "${ruleId}" encountered an error during scanning: ${err instanceof Error ? err.message : String(err)}`,
        };
        findings.push(errorFinding);
        progress?.onFinding?.(errorFinding);
        progress?.onRuleComplete?.(ruleId, 0);
      }
    }

    // Sort findings by severity (critical first)
    findings.sort((a, b) => {
      return SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity);
    });

    const completedAt = new Date();
    const serverInfo = client.getServerInfo();

    return {
      id: randomUUID(),
      serverName: serverInfo?.name ?? 'unknown',
      mode: config.mode,
      startedAt,
      completedAt,
      findings,
      summary: this.buildSummary(findings),
    };
  }

  private buildSummary(findings: SecurityFinding[]): SecurityScanSummary {
    const bySeverity: Record<SeverityLevel, number> = {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const byRule: Record<string, number> = {};

    for (const finding of findings) {
      bySeverity[finding.severity]++;
      byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    }

    return {
      totalFindings: findings.length,
      bySeverity,
      byRule,
    };
  }

  private registerBuiltinRules(): void {
    this.registerRule(new PathTraversalRule());
    this.registerRule(new InputValidationRule());
    this.registerRule(new ResourceExhaustionRule());
    this.registerRule(new AuthBypassRule());
    this.registerRule(new InjectionRule());
    this.registerRule(new InformationDisclosureRule());
  }
}
