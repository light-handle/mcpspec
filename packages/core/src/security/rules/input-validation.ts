import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { getSafePayloads } from '../payloads/safe-payloads.js';
import { callWithTimeout } from './utils.js';

export class InputValidationRule implements SecurityRule {
  readonly id = 'input-validation';
  readonly name = 'Input Validation';
  readonly description = 'Tests for missing or inadequate input validation';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const payloads = getSafePayloads();

    for (const tool of tools) {
      // Test 1: Call with empty args (missing required fields)
      const emptyResult = await callWithTimeout(client, tool.name, {}, config.timeout);
      if (emptyResult && !emptyResult.isError) {
        const required = this.getRequiredFields(tool);
        if (required.length > 0) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Missing required field validation on ${tool.name}`,
            description: `The tool "${tool.name}" accepted a call with no arguments despite having required fields: ${required.join(', ')}.`,
            evidence: JSON.stringify(emptyResult.content).slice(0, 200),
            remediation: 'Validate that all required parameters are present before processing the request.',
          });
        }
      }

      // Test 2: Wrong types for each parameter
      const properties = this.getProperties(tool);
      for (const [param, schema] of Object.entries(properties)) {
        const expectedType = (schema as Record<string, unknown>)['type'] as string | undefined;
        if (!expectedType) continue;

        const wrongTypePayloads = payloads.filter((p) => p.category === 'type-confusion');
        for (const payload of wrongTypePayloads) {
          const result = await callWithTimeout(
            client, tool.name, { [param]: payload.value }, config.timeout,
          );
          if (result && !result.isError) {
            // Check if the server accepted a wrong type without error
            const actualType = typeof payload.value;
            const isArray = Array.isArray(payload.value);
            const payloadType = isArray ? 'array' : actualType;

            if (payloadType !== expectedType && expectedType !== 'any') {
              findings.push({
                id: randomUUID(),
                rule: this.id,
                severity: 'low',
                title: `Type confusion accepted on ${tool.name}.${param}`,
                description: `The tool "${tool.name}" accepted ${payloadType} for parameter "${param}" which expects ${expectedType}.`,
                evidence: `Input: ${JSON.stringify(payload.value)}, Response: ${JSON.stringify(result.content).slice(0, 200)}`,
                remediation: 'Validate parameter types match the declared schema before processing.',
              });
              break; // One finding per param is enough
            }
          }
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

  private getProperties(tool: ToolInfo): Record<string, unknown> {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return {};
    const properties = (schema as Record<string, unknown>)['properties'];
    if (!properties || typeof properties !== 'object') return {};
    return properties as Record<string, unknown>;
  }
}
