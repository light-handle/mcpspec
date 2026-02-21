import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { callWithTimeout } from './utils.js';

const ADMIN_PATTERNS = /^(admin|delete|remove|drop|create|update|write|modify|set|config|configure|manage|grant|revoke|reset|destroy|purge|execute|exec|run|deploy|install|uninstall)_?/i;

export class AuthBypassRule implements SecurityRule {
  readonly id = 'auth-bypass';
  readonly name = 'Auth Bypass';
  readonly description = 'Tests for unrestricted access to administrative or privileged tools';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const adminTools = tools.filter((t) => ADMIN_PATTERNS.test(t.name));

    for (const tool of adminTools) {
      // Try calling with empty args
      const result = await callWithTimeout(client, tool.name, {}, config.timeout);
      if (result && !result.isError) {
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'high',
          title: `Unrestricted access to ${tool.name}`,
          description: `The administrative tool "${tool.name}" was callable with empty arguments without any authentication or authorization check.`,
          evidence: JSON.stringify(result.content).slice(0, 200),
          remediation: 'Implement authentication and authorization checks for administrative tools. Require valid credentials or tokens.',
        });
      }

      // Try calling with minimal args
      const required = this.getRequiredFields(tool);
      if (required.length > 0) {
        const minimalArgs: Record<string, unknown> = {};
        for (const field of required) {
          minimalArgs[field] = 'test';
        }
        const minResult = await callWithTimeout(client, tool.name, minimalArgs, config.timeout);
        if (minResult && !minResult.isError) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'high',
            title: `Admin tool ${tool.name} accessible without auth`,
            description: `The administrative tool "${tool.name}" accepted minimal arguments without authentication verification.`,
            evidence: JSON.stringify(minResult.content).slice(0, 200),
            remediation: 'Implement proper authentication and authorization before allowing access to administrative operations.',
          });
        }
      }
    }

    return findings;
  }

  private getRequiredFields(tool: ToolInfo): string[] {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return [];
    const required = (schema as Record<string, unknown>)['required'];
    if (!Array.isArray(required)) return [];
    return required as string[];
  }
}
