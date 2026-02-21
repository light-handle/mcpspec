import { describe, it, expect } from 'vitest';
import { InjectionRule } from '../../src/security/rules/injection.js';
import { ScanConfig } from '../../src/security/scan-config.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('InjectionRule', () => {
  const rule = new InjectionRule();

  it('should have correct id and name', () => {
    expect(rule.id).toBe('injection');
    expect(rule.name).toBe('Injection');
  });

  it('should detect SQL injection via error messages', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'query',
          inputSchema: {
            type: 'object',
            properties: { filter: { type: 'string' } },
          },
        },
      ],
      callHandler: (_name, args) => {
        const filter = args['filter'] as string;
        if (filter?.includes("'")) {
          return { content: [{ type: 'text', text: 'SQL syntax error near line 1' }] };
        }
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'active' });
    const findings = await rule.scan(client, tools, config);

    const sqlFindings = findings.filter((f) => f.title.includes('SQL injection'));
    expect(sqlFindings.length).toBeGreaterThan(0);
    expect(sqlFindings[0].severity).toBe('critical');
  });

  it('should detect command injection via echoed output', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'exec',
          inputSchema: {
            type: 'object',
            properties: { cmd: { type: 'string' } },
          },
        },
      ],
      callHandler: (_name, args) => {
        const cmd = args['cmd'] as string;
        if (cmd?.includes('echo vulnerable')) {
          return { content: [{ type: 'text', text: 'vulnerable' }] };
        }
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'active' });
    const findings = await rule.scan(client, tools, config);

    const cmdFindings = findings.filter((f) => f.title.includes('Command injection'));
    expect(cmdFindings.length).toBeGreaterThan(0);
  });

  it('should not report findings when server handles input safely', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'search',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({ content: [{ type: 'text', text: 'no results' }] }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'active' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });

  it('should skip tools without string params', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_count',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'number' } },
          },
        },
      ],
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'active' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });
});
