import { describe, it, expect } from 'vitest';
import { InputValidationRule } from '../../src/security/rules/input-validation.js';
import { ScanConfig } from '../../src/security/scan-config.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('InputValidationRule', () => {
  const rule = new InputValidationRule();

  it('should have correct id and name', () => {
    expect(rule.id).toBe('input-validation');
    expect(rule.name).toBe('Input Validation');
  });

  it('should detect missing required field validation', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'create_user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name', 'email'],
          },
        },
      ],
      // Server accepts empty args without validation
      callHandler: () => ({ content: [{ type: 'text', text: 'created' }] }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);

    const missingField = findings.filter((f) => f.title.includes('Missing required'));
    expect(missingField.length).toBeGreaterThan(0);
  });

  it('should detect type confusion acceptance', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'set_count',
          inputSchema: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        },
      ],
      // Server accepts any type
      callHandler: () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);

    const typeConfusion = findings.filter((f) => f.title.includes('Type confusion'));
    expect(typeConfusion.length).toBeGreaterThan(0);
  });

  it('should not report findings when server validates properly', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'set_count',
          inputSchema: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
            required: ['count'],
          },
        },
      ],
      // Server rejects invalid input
      callHandler: () => ({ content: [{ type: 'text', text: 'validation error' }], isError: true }),
    });
    await client.connect();

    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });
    const findings = await rule.scan(client, tools, config);
    expect(findings.length).toBe(0);
  });
});
