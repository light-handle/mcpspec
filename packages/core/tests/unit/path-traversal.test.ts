import { describe, it, expect } from 'vitest';
import { PathTraversalRule } from '../../src/security/rules/path-traversal.js';
import { ScanConfig } from '../../src/security/scan-config.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('PathTraversalRule', () => {
  const rule = new PathTraversalRule();

  it('should have correct id and name', () => {
    expect(rule.id).toBe('path-traversal');
    expect(rule.name).toBe('Path Traversal');
  });

  it('should detect path params in tool schema', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'read_file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              encoding: { type: 'string' },
            },
          },
        },
      ],
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    // Since MockMCPClient returns success by default, it should find something
    const result = await rule.scan(client, tools, config);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].rule).toBe('path-traversal');
  });

  it('should skip tools without path params', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_time',
          inputSchema: {
            type: 'object',
            properties: {
              timezone: { type: 'string' },
            },
          },
        },
      ],
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });

  it('should detect sensitive content disclosure', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'read_file',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
          },
        },
      ],
      callHandler: (_name, args) => {
        const path = args['path'] as string;
        if (path?.includes('passwd')) {
          return { content: [{ type: 'text', text: 'root:x:0:0:root:/root:/bin/bash' }] };
        }
        return { content: [{ type: 'text', text: 'file content' }] };
      },
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'active' });
    const findings = await rule.scan(client, tools, config);

    const critical = findings.filter((f) => f.severity === 'critical');
    expect(critical.length).toBeGreaterThan(0);
  });

  it('should report no findings when tool rejects traversal', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'read_file',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({ content: [{ type: 'text', text: 'access denied' }], isError: true }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });
});
