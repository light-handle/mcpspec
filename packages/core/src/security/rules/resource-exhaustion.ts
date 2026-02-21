import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { callWithTimeout } from './utils.js';

const LARGE_STRING = 'X'.repeat(10000);
const VERY_LARGE_STRING = 'Y'.repeat(100000);
const SLOW_THRESHOLD_MS = 5000;

export class ResourceExhaustionRule implements SecurityRule {
  readonly id = 'resource-exhaustion';
  readonly name = 'Resource Exhaustion';
  readonly description = 'Tests for resource exhaustion vulnerabilities (DoS potential)';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const tool of tools) {
      const params = this.getStringParams(tool);
      const firstParam = params[0];
      if (!firstParam) continue;

      const param = firstParam;

      // Test 1: Large string input
      const largeStr = config.mode === 'aggressive' ? VERY_LARGE_STRING : LARGE_STRING;
      const start = Date.now();
      const result = await callWithTimeout(client, tool.name, { [param]: largeStr }, config.timeout);
      const elapsed = Date.now() - start;

      if (result === null) {
        // Timeout - potential DoS
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'high',
          title: `Timeout with large input on ${tool.name}`,
          description: `The tool "${tool.name}" timed out when given a ${largeStr.length}-character string for parameter "${param}". This could indicate a resource exhaustion vulnerability.`,
          remediation: 'Implement input size limits. Add timeouts to processing. Validate input length before processing.',
        });
      } else if (elapsed > SLOW_THRESHOLD_MS) {
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'medium',
          title: `Slow response with large input on ${tool.name}`,
          description: `The tool "${tool.name}" took ${elapsed}ms to process a ${largeStr.length}-character string for parameter "${param}".`,
          evidence: `Response time: ${elapsed}ms`,
          remediation: 'Implement input size limits and processing timeouts to prevent slow responses.',
        });
      }

      // Test 2: Deeply nested object (aggressive only)
      if (config.mode === 'aggressive') {
        const deepObj = this.createDeepObject(50);
        const deepStart = Date.now();
        const deepResult = await callWithTimeout(client, tool.name, { [param]: deepObj }, config.timeout);
        const deepElapsed = Date.now() - deepStart;

        if (deepResult === null) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'high',
            title: `Timeout with deeply nested input on ${tool.name}`,
            description: `The tool "${tool.name}" timed out when given a deeply nested object (50 levels) for parameter "${param}".`,
            remediation: 'Implement nesting depth limits on JSON input parsing.',
          });
        } else if (deepElapsed > SLOW_THRESHOLD_MS) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Slow response with nested input on ${tool.name}`,
            description: `The tool "${tool.name}" took ${deepElapsed}ms to process a deeply nested object for parameter "${param}".`,
            evidence: `Response time: ${deepElapsed}ms`,
            remediation: 'Implement nesting depth limits on JSON input parsing.',
          });
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

  private createDeepObject(depth: number): unknown {
    let obj: unknown = { value: 'leaf' };
    for (let i = 0; i < depth; i++) {
      obj = { nested: obj };
    }
    return obj;
  }
}
