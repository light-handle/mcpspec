import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';
import { getPayloadsForMode } from '../payloads/platform-payloads.js';
import { callWithTimeout } from './utils.js';

const PATH_PARAM_PATTERNS = /^(path|file|filename|filepath|dir|directory|folder|uri|url|location|src|dest|source|destination|target)$/i;

export class PathTraversalRule implements SecurityRule {
  readonly id = 'path-traversal';
  readonly name = 'Path Traversal';
  readonly description = 'Tests for directory traversal vulnerabilities in path-based parameters';

  async scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const payloads = getPayloadsForMode(config.mode).filter((p) => p.category === 'path-traversal');

    for (const tool of tools) {
      const pathParams = this.findPathParams(tool);
      if (pathParams.length === 0) continue;

      for (const param of pathParams) {
        // Passive: test with simple relative path
        const passiveResult = await callWithTimeout(
          client, tool.name, { [param]: '../test' }, config.timeout,
        );
        if (passiveResult && !passiveResult.isError) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Path traversal possible on ${tool.name}.${param}`,
            description: `The tool "${tool.name}" accepted a relative path "../test" on parameter "${param}" without rejection.`,
            evidence: JSON.stringify(passiveResult.content).slice(0, 200),
            remediation: 'Validate and sanitize path inputs. Reject paths containing ".." and resolve to absolute paths within an allowed directory.',
          });
        }

        // Active/aggressive: use platform-specific payloads
        for (const payload of payloads) {
          const result = await callWithTimeout(
            client, tool.name, { [param]: payload.value }, config.timeout,
          );
          if (!result) continue;

          const contentStr = JSON.stringify(result.content);
          const hasSensitiveContent = /root:|admin:|password|shadow|id_rsa|PRIVATE KEY|sam|SYSTEM/i.test(contentStr);
          const hasPathDisclosure = /\/etc\/|\/home\/|C:\\Users|C:\\Windows/i.test(contentStr);

          if (!result.isError && (hasSensitiveContent || hasPathDisclosure)) {
            findings.push({
              id: randomUUID(),
              rule: this.id,
              severity: hasSensitiveContent ? 'critical' : 'high',
              title: `Path traversal: ${payload.label} on ${tool.name}.${param}`,
              description: `The tool "${tool.name}" returned sensitive content when given "${payload.label}" payload on parameter "${param}".`,
              evidence: contentStr.slice(0, 500),
              remediation: 'Restrict file access to a specific directory. Validate paths against an allow-list. Use chroot or similar sandboxing.',
            });
          }
        }
      }
    }

    return findings;
  }

  private findPathParams(tool: ToolInfo): string[] {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object') return [];
    const properties = (schema as Record<string, unknown>)['properties'];
    if (!properties || typeof properties !== 'object') return [];

    return Object.keys(properties as Record<string, unknown>).filter(
      (key) => PATH_PARAM_PATTERNS.test(key),
    );
  }
}
