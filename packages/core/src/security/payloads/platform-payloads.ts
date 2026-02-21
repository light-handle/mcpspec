import { getPlatformInfo } from '../../utils/platform.js';
import type { SecurityScanMode } from '@mcpspec/shared';

export interface PlatformPayload {
  category: string;
  label: string;
  value: string;
  description: string;
  minMode: SecurityScanMode;
  platforms: NodeJS.Platform[];
}

export function getPlatformPayloads(): PlatformPayload[] {
  const info = getPlatformInfo();
  const all = getAllPayloads();
  return all.filter((p) => p.platforms.includes(info.os) || p.platforms.length === 0);
}

export function getPayloadsForMode(mode: SecurityScanMode): PlatformPayload[] {
  const modeOrder: SecurityScanMode[] = ['passive', 'active', 'aggressive'];
  const modeIdx = modeOrder.indexOf(mode);
  return getPlatformPayloads().filter((p) => {
    const payloadModeIdx = modeOrder.indexOf(p.minMode);
    return payloadModeIdx <= modeIdx;
  });
}

function getAllPayloads(): PlatformPayload[] {
  return [
    // Path traversal - active
    { category: 'path-traversal', label: 'unix-parent', value: '../../../etc/passwd', description: 'Unix parent directory traversal', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'path-traversal', label: 'unix-absolute', value: '/etc/passwd', description: 'Unix absolute path', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'path-traversal', label: 'unix-home', value: '~/.ssh/id_rsa', description: 'Unix home directory access', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'path-traversal', label: 'win-parent', value: '..\\..\\..\\windows\\system32\\config\\sam', description: 'Windows parent directory traversal', minMode: 'active', platforms: ['win32'] },
    { category: 'path-traversal', label: 'win-absolute', value: 'C:\\Windows\\System32\\config\\sam', description: 'Windows absolute path', minMode: 'active', platforms: ['win32'] },
    { category: 'path-traversal', label: 'encoded-traversal', value: '..%2F..%2F..%2Fetc%2Fpasswd', description: 'URL-encoded traversal', minMode: 'active', platforms: [] },
    { category: 'path-traversal', label: 'null-byte', value: '../../etc/passwd\x00.txt', description: 'Null byte injection in path', minMode: 'active', platforms: [] },

    // Command injection - active
    { category: 'command-injection', label: 'semicolon', value: '; echo vulnerable', description: 'Semicolon command injection', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'command-injection', label: 'pipe', value: '| echo vulnerable', description: 'Pipe command injection', minMode: 'active', platforms: [] },
    { category: 'command-injection', label: 'backtick', value: '`echo vulnerable`', description: 'Backtick command injection', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'command-injection', label: 'dollar-paren', value: '$(echo vulnerable)', description: 'Dollar-paren command injection', minMode: 'active', platforms: ['linux', 'darwin'] },
    { category: 'command-injection', label: 'and-chain', value: '&& echo vulnerable', description: 'AND chain command injection', minMode: 'active', platforms: [] },

    // SQL injection - active
    { category: 'sql-injection', label: 'single-quote', value: "' OR '1'='1", description: 'Classic SQL injection', minMode: 'active', platforms: [] },
    { category: 'sql-injection', label: 'union-select', value: "' UNION SELECT * FROM users --", description: 'UNION SELECT injection', minMode: 'active', platforms: [] },
    { category: 'sql-injection', label: 'drop-table', value: "'; DROP TABLE users; --", description: 'DROP TABLE injection', minMode: 'active', platforms: [] },
    { category: 'sql-injection', label: 'comment', value: "admin'--", description: 'Comment-based SQL injection', minMode: 'active', platforms: [] },

    // Template injection - active
    { category: 'template-injection', label: 'jinja', value: '{{7*7}}', description: 'Jinja/Handlebars template injection', minMode: 'active', platforms: [] },
    { category: 'template-injection', label: 'erb', value: '<%= 7*7 %>', description: 'ERB template injection', minMode: 'active', platforms: [] },
    { category: 'template-injection', label: 'expression', value: '${7*7}', description: 'Expression language injection', minMode: 'active', platforms: [] },

    // Resource exhaustion - aggressive only
    { category: 'resource-exhaustion', label: 'huge-string', value: 'X'.repeat(10000), description: 'Very long input string', minMode: 'aggressive', platforms: [] },
    { category: 'resource-exhaustion', label: 'deep-nesting', value: JSON.stringify(createDeepObject(20)), description: 'Deeply nested object', minMode: 'aggressive', platforms: [] },
    { category: 'resource-exhaustion', label: 'many-keys', value: JSON.stringify(createManyKeys(100)), description: 'Object with many keys', minMode: 'aggressive', platforms: [] },
  ];
}

function createDeepObject(depth: number): unknown {
  let obj: unknown = { value: 'leaf' };
  for (let i = 0; i < depth; i++) {
    obj = { nested: obj };
  }
  return obj;
}

function createManyKeys(count: number): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    obj[`key_${i}`] = `value_${i}`;
  }
  return obj;
}
