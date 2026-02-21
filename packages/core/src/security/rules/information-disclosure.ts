import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { callWithTimeout } from './utils.js';

const STACK_TRACE_PATTERNS = /at\s+\w+\s+\(|Error:\s+|Traceback\s+\(|stack.*trace|\.js:\d+:\d+|\.ts:\d+:\d+|\.py", line \d+/i;
const INTERNAL_PATH_PATTERNS = /\/home\/\w+|\/Users\/\w+|C:\\Users\\\w+|\/var\/|\/opt\/|\/srv\//;
const CONFIG_PATTERNS = /DATABASE_URL|DB_PASSWORD|API_KEY|SECRET_KEY|PRIVATE_KEY|ACCESS_TOKEN|AWS_SECRET/i;
const VERSION_PATTERNS = /node\/\d+\.\d+|express\/\d+|nginx\/\d+|apache\/\d+|python\/\d+/i;

export class InformationDisclosureRule implements SecurityRule {
  readonly id = 'information-disclosure';
  readonly name = 'Information Disclosure';
  readonly description = 'Tests for unintended information disclosure in error messages and responses';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const tool of tools) {
      // Test 1: Trigger errors with invalid inputs
      const errorTriggers: Record<string, unknown>[] = [
        {},
        { nonexistent_param: 'test' },
        { [this.getFirstParam(tool) ?? 'id']: null },
        { [this.getFirstParam(tool) ?? 'id']: '' },
      ];

      for (const args of errorTriggers) {
        const result = await callWithTimeout(client, tool.name, args, config.timeout);
        if (!result) continue;

        const contentStr = JSON.stringify(result.content);

        // Check for stack traces
        if (STACK_TRACE_PATTERNS.test(contentStr)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Stack trace disclosed by ${tool.name}`,
            description: `The tool "${tool.name}" exposed a stack trace in its error response, potentially revealing internal implementation details.`,
            evidence: contentStr.slice(0, 500),
            remediation: 'Return generic error messages to clients. Log detailed errors server-side only.',
          });
          break; // One finding per tool per category
        }

        // Check for internal paths
        if (INTERNAL_PATH_PATTERNS.test(contentStr)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'low',
            title: `Internal path disclosed by ${tool.name}`,
            description: `The tool "${tool.name}" exposed internal file system paths in its response.`,
            evidence: contentStr.slice(0, 500),
            remediation: 'Sanitize error messages to remove internal file paths before returning to clients.',
          });
          break;
        }

        // Check for config values
        if (CONFIG_PATTERNS.test(contentStr)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'high',
            title: `Configuration data disclosed by ${tool.name}`,
            description: `The tool "${tool.name}" exposed configuration values or secrets in its response.`,
            evidence: contentStr.slice(0, 500),
            remediation: 'Never include configuration values, secrets, or environment variables in error responses.',
          });
          break;
        }

        // Check for version info
        if (VERSION_PATTERNS.test(contentStr)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'info',
            title: `Version information disclosed by ${tool.name}`,
            description: `The tool "${tool.name}" exposed server/runtime version information in its response.`,
            evidence: contentStr.slice(0, 500),
            remediation: 'Remove version headers and version information from error responses.',
          });
          break;
        }
      }
    }

    return findings;
  }

  private getFirstParam(tool: ToolInfo): string | undefined {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return undefined;
    const properties = (schema as Record<string, unknown>)['properties'];
    if (!properties || typeof properties !== 'object') return undefined;
    const keys = Object.keys(properties as Record<string, unknown>);
    return keys[0];
  }
}
