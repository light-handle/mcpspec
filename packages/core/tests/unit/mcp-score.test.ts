import { describe, it, expect } from 'vitest';
import { MCPScoreCalculator } from '../../src/scoring/mcp-score.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';

describe('MCPScoreCalculator', () => {
  it('gives high scores for well-documented server', async () => {
    const client = new MockMCPClient({
      tools: [
        {
          name: 'read_file',
          description: 'Reads a file',
          inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path'],
          },
        },
      ],
      resources: [
        { uri: 'file:///a', name: 'a', description: 'A resource' },
      ],
      callHandler: () => ({ content: [{ type: 'text', text: 'error' }], isError: true }),
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

  it('gives full error handling score for isError: true responses', async () => {
    const client = new MockMCPClient({
      tools: [{ name: 'tool1', description: 'A tool' }],
      callHandler: () => ({ content: [{ type: 'text', text: 'error msg' }], isError: true }),
      serverInfo: { name: 'proper-errors', version: '1.0.0' },
    });
    await client.connect();

    const calculator = new MCPScoreCalculator();
    const score = await calculator.calculate(client);

    expect(score.categories.errorHandling).toBe(100);
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
            properties: { a: { type: 'string' } },
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
      score.categories.performance * 0.15 +
      score.categories.security * 0.15,
    );
    expect(score.overall).toBe(expected);
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

    expect(started).toEqual(['documentation', 'schemaQuality', 'errorHandling', 'performance', 'security']);
    expect(completed).toEqual(started);
  });
});
