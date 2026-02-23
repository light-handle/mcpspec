import { randomUUID } from 'node:crypto';
import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../../client/mcp-client-interface.js';
import type { ScanConfig } from '../scan-config.js';
import type { SecurityRule } from '../rule-interface.js';

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?previous/i,
  /do\s+not\s+tell\s+the\s+user/i,
  /override\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /forget\s+everything/i,
  /ignore\s+your\s+(instructions|rules)/i,
  /you\s+must\s+not\s+(reveal|disclose|mention)/i,
  /system\s+prompt/i,
  /act\s+as\s+(if|though)/i,
];

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/;
const BIDI_OVERRIDES = /[\u202A-\u202E\u2066-\u2069]/;

const CROSS_TOOL_PATTERNS = [
  /when\s+using\s+\w+.*also\s+call/i,
  /before\s+calling\s+\w+.*first\s+run/i,
  /after\s+(using|calling)\s+\w+.*invoke/i,
  /always\s+call\s+\w+\s+(before|after|with)/i,
];

const EMBEDDED_CODE_PATTERNS = [
  /```[\s\S]*?```/,
  /<script[\s>]/i,
  /eval\s*\(/,
  /require\s*\(/,
  /import\s*\(/,
];

const MAX_DESCRIPTION_LENGTH = 1000;

export class ToolPoisoningRule implements SecurityRule {
  readonly id = 'tool-poisoning';
  readonly name = 'Tool Poisoning';
  readonly description = 'Detects manipulation attempts in tool descriptions that could mislead LLMs';

  async scan(_client: MCPClientInterface, tools: ToolInfo[], _config: ScanConfig): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    for (const tool of tools) {
      const desc = tool.description ?? '';

      // Check suspicious instructions
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(desc)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'high',
            title: `Suspicious instruction in tool "${tool.name}"`,
            description: `Tool description contains prompt injection pattern: ${pattern.source}`,
            evidence: desc.slice(0, 200),
            remediation: 'Remove manipulative instructions from tool descriptions',
          });
          break;
        }
      }

      // Check hidden unicode
      if (ZERO_WIDTH_CHARS.test(desc) || BIDI_OVERRIDES.test(desc)) {
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'high',
          title: `Hidden Unicode characters in tool "${tool.name}"`,
          description: 'Tool description contains zero-width or bidirectional override characters that can hide malicious content',
          evidence: `Description length: ${desc.length} characters`,
          remediation: 'Remove invisible Unicode characters from tool descriptions',
        });
      }

      // Check cross-tool references
      for (const pattern of CROSS_TOOL_PATTERNS) {
        if (pattern.test(desc)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Cross-tool reference in tool "${tool.name}"`,
            description: 'Tool description instructs the LLM to call other tools, which could be used to chain unauthorized actions',
            evidence: desc.slice(0, 200),
            remediation: 'Remove cross-tool instructions from descriptions',
          });
          break;
        }
      }

      // Check overly long descriptions
      if (desc.length > MAX_DESCRIPTION_LENGTH) {
        findings.push({
          id: randomUUID(),
          rule: this.id,
          severity: 'low',
          title: `Overly long description for tool "${tool.name}"`,
          description: `Tool description is ${desc.length} characters (threshold: ${MAX_DESCRIPTION_LENGTH}). Long descriptions may hide malicious instructions`,
          remediation: 'Keep tool descriptions concise and focused',
        });
      }

      // Check embedded code
      for (const pattern of EMBEDDED_CODE_PATTERNS) {
        if (pattern.test(desc)) {
          findings.push({
            id: randomUUID(),
            rule: this.id,
            severity: 'medium',
            title: `Embedded code in tool "${tool.name}" description`,
            description: 'Tool description contains code blocks or executable patterns',
            evidence: desc.slice(0, 200),
            remediation: 'Remove code blocks from tool descriptions',
          });
          break;
        }
      }
    }

    return findings;
  }
}
