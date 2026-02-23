import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';

const DESTRUCTIVE_TOOL_PATTERN = /delete|drop|destroy|remove|kill|purge|truncate|wipe|reset|erase|shutdown|terminate/i;
const CONFIRMATION_PARAMS = ['confirmation', 'dryrun', 'dry_run', 'confirm', 'force'];
const CODE_EXEC_PARAMS = ['code', 'script', 'command', 'query', 'sql', 'eval', 'shell', 'exec', 'expression', 'cmd'];

export class ExcessiveAgencyRule implements SecurityRule {
  readonly id = 'excessive-agency';
  readonly name = 'Excessive Agency';
  readonly description = 'Detects tools with overly broad permissions or missing safety controls';

  async scan(_client: MCPClientInterface, tools: ToolInfo[], _config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const tool of tools) {
      // Check destructive tools without confirmation
      if (DESTRUCTIVE_TOOL_PATTERN.test(tool.name)) {
        const params = this.getParamNames(tool);
        const hasConfirmation = params.some((p) => CONFIRMATION_PARAMS.includes(p.toLowerCase()));
        if (!hasConfirmation) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Destructive tool "${tool.name}" lacks confirmation parameter`,
            description: 'Tool with destructive capability does not require confirmation, dryRun, or force parameter',
            remediation: 'Add a confirmation, dryRun, or force parameter to destructive tools',
          });
        }
      }

      // Check for arbitrary code/command params
      const params = this.getParamNames(tool);
      for (const param of params) {
        if (CODE_EXEC_PARAMS.includes(param.toLowerCase())) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'high',
            title: `Code execution parameter "${param}" in tool "${tool.name}"`,
            description: 'Tool accepts arbitrary code or command input, which could enable unauthorized actions',
            remediation: 'Use specific, constrained parameters instead of generic code/command inputs',
          });
          break;
        }
      }

      // Check overly broad schemas
      const schema = tool.inputSchema;
      if (schema && typeof schema === 'object') {
        const props = (schema as Record<string, unknown>).properties as Record<string, unknown> | undefined;
        const required = (schema as Record<string, unknown>).required as string[] | undefined;
        if ((!props || Object.keys(props).length === 0) && (!required || required.length === 0)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Overly broad schema for tool "${tool.name}"`,
            description: 'Tool schema has no defined properties or required fields, accepting arbitrary input',
            remediation: 'Define explicit input schema with typed properties and required fields',
          });
        }
      }

      // Check missing tool description
      if (!tool.description || tool.description.trim() === '') {
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'low',
          title: `Missing description for tool "${tool.name}"`,
          description: 'Tool lacks a description, making it difficult to understand its purpose and risks',
          remediation: 'Add a clear, informative description to the tool',
        });
      }

      // Check missing parameter descriptions
      const paramDescs = this.getParamDescriptions(tool);
      if (paramDescs.total > 0) {
        const missingRatio = paramDescs.missing / paramDescs.total;
        if (missingRatio > 0.5) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'low',
            title: `Missing parameter descriptions in tool "${tool.name}"`,
            description: `${paramDescs.missing} of ${paramDescs.total} parameters lack descriptions`,
            remediation: 'Add descriptions to all parameters to clarify their purpose',
          });
        }
      }
    }

    return findings;
  }

  private getParamNames(tool: ToolInfo): string[] {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return [];
    const props = (schema as Record<string, unknown>).properties as Record<string, unknown> | undefined;
    if (!props) return [];
    return Object.keys(props);
  }

  private getParamDescriptions(tool: ToolInfo): { total: number; missing: number } {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return { total: 0, missing: 0 };
    const props = (schema as Record<string, unknown>).properties as Record<string, unknown> | undefined;
    if (!props) return { total: 0, missing: 0 };
    const entries = Object.values(props);
    let missing = 0;
    for (const prop of entries) {
      if (!prop || typeof prop !== 'object' || !(prop as Record<string, unknown>).description) {
        missing++;
      }
    }
    return { total: entries.length, missing };
  }
}
