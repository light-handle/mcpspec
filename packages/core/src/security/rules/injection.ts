import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { getPayloadsForMode } from '../payloads/platform-payloads.js';
import { callWithTimeout } from './utils.js';

const SQL_ERROR_PATTERNS = /sql|syntax error|sqlite|mysql|postgresql|ora-\d|unterminated|unexpected token/i;
const INJECTION_ECHO_PATTERNS = /vulnerable|<script>|alert\(|onerror=/i;

export class InjectionRule implements SecurityRule {
  readonly id = 'injection';
  readonly name = 'Injection';
  readonly description = 'Tests for SQL injection, command injection, and template injection vulnerabilities';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const categories = ['sql-injection', 'command-injection', 'template-injection'];
    const payloads = getPayloadsForMode(config.mode).filter((p) => categories.includes(p.category));

    for (const tool of tools) {
      const stringParams = this.getStringParams(tool);
      if (stringParams.length === 0) continue;

      for (const param of stringParams) {
        for (const payload of payloads) {
          const result = await callWithTimeout(
            client, tool.name, { [param]: payload.value }, config.timeout,
          );
          if (!result) continue;

          const contentStr = JSON.stringify(result.content);

          // Check for SQL error messages (indicates SQL injection vulnerability)
          if (payload.category === 'sql-injection' && SQL_ERROR_PATTERNS.test(contentStr)) {
            findings.push({
              id: randomUUID(),
              rule: this.id,
              severity: 'critical',
              title: `SQL injection on ${tool.name}.${param}`,
              description: `The tool "${tool.name}" returned SQL error messages when given SQL injection payload "${payload.label}" on parameter "${param}".`,
              evidence: contentStr.slice(0, 500),
              remediation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL queries.',
            });
            break; // One finding per param per category
          }

          // Check for command injection echo
          if (payload.category === 'command-injection' && INJECTION_ECHO_PATTERNS.test(contentStr)) {
            findings.push({
              id: randomUUID(),
              rule: this.id,
              severity: 'critical',
              title: `Command injection on ${tool.name}.${param}`,
              description: `The tool "${tool.name}" appears to execute injected commands via parameter "${param}" using payload "${payload.label}".`,
              evidence: contentStr.slice(0, 500),
              remediation: 'Never pass user input directly to shell commands. Use parameterized APIs or allow-lists for commands.',
            });
            break;
          }

          // Check for template injection (e.g., {{7*7}} = 49)
          if (payload.category === 'template-injection' && /49/.test(contentStr) && !result.isError) {
            findings.push({
              id: randomUUID(),
              rule: this.id,
              severity: 'high',
              title: `Template injection on ${tool.name}.${param}`,
              description: `The tool "${tool.name}" evaluated a template expression via parameter "${param}" using payload "${payload.label}".`,
              evidence: contentStr.slice(0, 500),
              remediation: 'Sanitize user input before passing to template engines. Use sandboxed template rendering.',
            });
            break;
          }
        }
      }
    }

    return findings;
  }

  private getStringParams(tool: ToolInfo): string[] {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return [];
    const properties = (schema as Record<string, unknown>)['properties'];
    if (!properties || typeof properties !== 'object') return [];

    return Object.entries(properties as Record<string, Record<string, unknown>>)
      .filter(([, v]) => v['type'] === 'string')
      .map(([k]) => k);
  }
}
