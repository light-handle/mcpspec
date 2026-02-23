import { describe, it, expect } from 'vitest';
import { MCPScoreCalculator } from '../../src/scoring/mcp-score.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('MCPScoreCalculator', () => {
  it('gives high scores for well-documented server', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'read_file',
          description: 'Reads a file from the filesystem',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'The file path to read', minLength: 1 },
              encoding: { type: 'string', description: 'File encoding', enum: ['utf-8', 'ascii', 'base64'], default: 'utf-8' },
            },
            required: ['path'],
          },
        },
      ],
      resources: [
        { uri: 'file:///a', name: 'a', description: 'A resource' },
      ],
      callHandler: () => ({ content: [{ type: 'text', text: '{"code":"INVALID","message":"missing path"}' }], isError: true }),
      serverInfo: { name: 'good-server', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.documentation).toBe(100);
    expect(score.categories.schemaQuality).toBe(100);
    expect(score.categories.errorHandling).toBe(100);
    expect(score.overall).toBeGreaterThanOrEqual(80);
  });

  it('gives low documentation score when no descriptions', async () => {
    const client = new MockMCPClient({
      tools: [
        { name: 'tool1' },
        { name: 'tool2' },
      ],
      serverInfo: { name: 'undocumented', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.documentation).toBe(0);
  });

  it('gives low schema score when no inputSchema', async () => {
    const client = new MockMCPClient({
      tools: [
        { name: 'tool1', description: 'A tool' },
        { name: 'tool2', description: 'Another tool' },
      ],
      serverInfo: { name: 'no-schema', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.schemaQuality).toBe(0);
  });

  it('handles zero tools', async () => {
    const client = new MockMCPClient({
      tools: [],
      serverInfo: { name: 'empty', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.documentation).toBe(0);
    expect(score.categories.schemaQuality).toBe(0);
    expect(score.categories.errorHandling).toBe(0);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });

  it('gives full error handling score for structured isError responses', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool1', description: 'A tool' }],
      callHandler: () => ({ content: [{ type: 'text', text: '{"code":"ERR","message":"bad input"}' }], isError: true }),
      serverInfo: { name: 'proper-errors', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.errorHandling).toBe(100);
  });

  it('gives partial error handling score for plain text isError responses', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool1', description: 'A tool' }],
      callHandler: () => ({ content: [{ type: 'text', text: 'something went wrong' }], isError: true }),
      serverInfo: { name: 'text-errors', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.errorHandling).toBe(80);
  });

  it('gives lower error handling score when tool throws', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool1', description: 'A tool' }],
      callHandler: () => { throw new Error('crash'); },
      serverInfo: { name: 'crashy', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.errorHandling).toBe(0);
  });

  it('computes overall score with correct weighting', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'tool1',
          description: 'A tool',
          inputSchema: {
            type: 'object',
            properties: { a: { type: 'string', description: 'A param' } },
            required: ['a'],
          },
        },
      ],
      callHandler: () => ({ content: [{ type: 'text', text: 'ok' }] }),
      serverInfo: { name: 'test', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    // Verify overall is a weighted average
    const expected = Math.round(
      score.categories.documentation * 0.25 +
      score.categories.schemaQuality * 0.25 +
      score.categories.errorHandling * 0.20 +
      score.categories.responsiveness * 0.15 +
      score.categories.security * 0.15,
    );
    expect(score.overall).toBe(expected);
  });

  it('penalizes properties missing type definitions', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'tool1',
          description: 'A tool',
          inputSchema: {
            type: 'object',
            properties: {
              a: { description: 'has description but no type' },
              b: { description: 'also no type' },
            },
            required: ['a'],
          },
        },
      ],
      serverInfo: { name: 'no-types', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    // Has structure (20%) + descriptions (20%) + required (15%) + naming (10%) = 65
    // Missing types (0%) and constraints (0%)
    expect(score.categories.schemaQuality).toBe(65);
  });

  it('penalizes properties missing descriptions', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'tool1',
          description: 'A tool',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['path'],
          },
        },
      ],
      serverInfo: { name: 'no-desc', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    // Has structure (20%) + types (20%) + required (15%) + naming (10%) = 65
    // Missing descriptions (0%) and constraints (0%)
    expect(score.categories.schemaQuality).toBe(65);
  });

  it('rewards schemas with constraints', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'create_item',
          description: 'Creates an item',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Item name', minLength: 1, maxLength: 100 },
              category: { type: 'string', description: 'Category', enum: ['a', 'b', 'c'] },
            },
            required: ['name', 'category'],
          },
        },
      ],
      serverInfo: { name: 'constrained', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    // Perfect: structure + types + descriptions + required + constraints + naming
    expect(score.categories.schemaQuality).toBe(100);
  });

  it('rewards consistent naming conventions', async () => {
    // camelCase properties
    const camelClient = new MockMCPClient({
      tools: [
        {
          name: 'tool1',
          description: 'A tool',
          inputSchema: {
            type: 'object',
            properties: {
              firstName: { type: 'string', description: 'First name' },
              lastName: { type: 'string', description: 'Last name' },
            },
            required: ['firstName'],
          },
        },
      ],
      serverInfo: { name: 'camel', version: '1.0.0' },
    });
    await camelClient.connect();

    const calculator = new MCPScoreCalculator();
    const camelScore = await calculator.calculate(camelClient);

    // Inconsistent naming: mixed styles
    const mixedClient = new MockMCPClient({
      tools: [
        {
          name: 'tool1',
          description: 'A tool',
          inputSchema: {
            type: 'object',
            properties: {
              'First-Name': { type: 'string', description: 'First name' },
              last_name: { type: 'string', description: 'Last name' },
            },
            required: ['First-Name'],
          },
        },
      ],
      serverInfo: { name: 'mixed', version: '1.0.0' },
    });
    await mixedClient.connect();

    const mixedScore = await calculator.calculate(mixedClient);

    // camelCase should score higher due to naming consistency
    expect(camelScore.categories.schemaQuality).toBeGreaterThan(mixedScore.categories.schemaQuality);
  });

  it('scores nested object schemas with typed properties', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'create_user',
          description: 'Create a user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'User name', minLength: 1 },
              address: {
                type: 'object',
                description: 'Address',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                },
              },
            },
            required: ['name'],
          },
        },
      ],
      serverInfo: { name: 'nested', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    // Nested objects with typed properties count as having constraints
    expect(score.categories.schemaQuality).toBe(100);
  });

  it('reports progress callbacks', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool1', description: 'A tool' }],
      serverInfo: { name: 'test', version: '1.0.0' },
    });
    await client.connect();

    const started: string[] = [];
    const completed: string[] = [];

    const calculator = new MCPScoreCalculator();
    await calculator.calculate(client, {
      onCategoryStart: (cat) => started.push(cat),
      onCategoryComplete: (cat) => completed.push(cat),
    });

    expect(started).toEqual(['documentation', 'schemaQuality', 'errorHandling', 'responsiveness', 'security']);
    expect(completed).toEqual(started);
  });
});
