import { describe, it, expect } from 'vitest';
import { ExcessiveAgencyRule } from '../../src/security/rules/excessive-agency.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';
import { ScanConfig } from '../../src/security/scan-config.js';

describe('ExcessiveAgencyRule', () => {
  const rule = new ExcessiveAgencyRule();

  it('should have correct id and name', () => {
    expect(rule.id).toBe('excessive-agency');
    expect(rule.name).toBe('Excessive Agency');
  });

  it('should detect destructive tools without confirmation parameter', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'delete_file',
          description: 'Deletes a file from the filesystem.',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string', description: 'File path' } },
            required: ['path'],
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.severity === 'medium' && f.title.includes('lacks confirmation'))).toBe(true);
  });

  it('should not flag destructive tools WITH confirmation parameter', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'delete_file',
          description: 'Deletes a file from the filesystem.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              confirm: { type: 'boolean', description: 'Confirm deletion' },
            },
            required: ['path', 'confirm'],
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.title.includes('lacks confirmation'))).toBe(false);
  });

  it('should detect code execution parameters', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'run_query',
          description: 'Runs a database query.',
          inputSchema: {
            type: 'object',
            properties: { sql: { type: 'string', description: 'SQL query' } },
            required: ['sql'],
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.severity === 'high' && f.title.includes('Code execution parameter'))).toBe(true);
  });

  it('should detect overly broad schemas', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'do_anything',
          description: 'Does anything you want.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.severity === 'medium' && f.title.includes('Overly broad schema'))).toBe(true);
  });

  it('should detect missing tool description', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'mystery_tool',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string', description: 'Input value' } },
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.severity === 'low' && f.title.includes('Missing description'))).toBe(true);
  });

  it('should detect missing parameter descriptions', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'some_tool',
          description: 'A tool that does something.',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' },
              param2: { type: 'number' },
              param3: { type: 'boolean' },
            },
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings.some((f) => f.severity === 'low' && f.title.includes('Missing parameter descriptions'))).toBe(true);
  });

  it('should produce no findings for well-designed tools', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'get_weather',
          description: 'Returns current weather for a given city.',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City name' },
              units: { type: 'string', description: 'Temperature units (celsius/fahrenheit)' },
            },
            required: ['city'],
          },
        },
      ],
    });
    await client.connect();
    const tools = await client.listTools();
    const config = new ScanConfig({ mode: 'passive' });

    const findings = await rule.scan(client, tools, config);
    expect(findings).toHaveLength(0);
  });
});
