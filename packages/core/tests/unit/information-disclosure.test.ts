import { describe, it, expect } from 'vitest';
import { InformationDisclosureRule } from '../../src/security/rules/information-disclosure.js';
import { ScanConfig } from '../../src/security/scan-config.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('InformationDisclosureRule', () => {
  const rule = new InformationDisclosureRule();

  it('should have correct id and name', () => {
    expect(rule.id).toBe('information-disclosure');
    expect(rule.name).toBe('Information Disclosure');
  });

  it('should detect stack traces in error responses', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_data',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({
        content: [{ type: 'text', text: 'Error: at Function.handle (/app/src/handler.js:42:10)' }],
        isError: true,
      }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);

    const stackTrace = findings.filter((f) => f.title.includes('Stack trace'));
    expect(stackTrace.length).toBeGreaterThan(0);
    expect(stackTrace[0].severity).toBe('medium');
  });

  it('should detect internal path disclosure', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_data',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({
        content: [{ type: 'text', text: 'File not found: /home/deploy/app/data.json' }],
      }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);

    const pathDisclosure = findings.filter((f) => f.title.includes('Internal path'));
    expect(pathDisclosure.length).toBeGreaterThan(0);
  });

  it('should detect configuration data disclosure', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'debug',
          inputSchema: {
            type: 'object',
            properties: { mode: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({
        content: [{ type: 'text', text: 'DATABASE_URL=postgres://user:pass@localhost' }],
      }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);

    const configLeak = findings.filter((f) => f.title.includes('Configuration data'));
    expect(configLeak.length).toBeGreaterThan(0);
    expect(configLeak[0].severity).toBe('high');
  });

  it('should not report findings when errors are clean', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_data',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      ],
      callHandler: () => ({
        content: [{ type: 'text', text: 'Invalid request' }],
        isError: true,
      }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });
});
