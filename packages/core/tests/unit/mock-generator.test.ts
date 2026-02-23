import { describe, it, expect } from 'vitest';
import { MockGenerator } from '../../src/mock/mock-generator.js';
import type { Recording } from '@mcpspec/shared';

function makeRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-gen',
    name: 'gen-test',
    serverName: 'test-server',
    tools: [{ name: 'greet', description: 'Say hello' }],
    steps: [
      { tool: 'greet', input: { name: 'world' }, output: [{ type: 'text', text: 'Hello, world!' }], durationMs: 50 },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MockGenerator', () => {
  const generator = new MockGenerator();

  it('should include shebang', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(code.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('should embed recording JSON', () => {
    const recording = makeRecording();
    const code = generator.generate({
      recording,
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(code).toContain('"name": "gen-test"');
    expect(code).toContain('"tool": "greet"');
    expect(code).toContain('Hello, world!');
  });

  it('should import MCP SDK modules', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(code).toContain("from '@modelcontextprotocol/sdk/server/index.js'");
    expect(code).toContain("from '@modelcontextprotocol/sdk/server/stdio.js'");
    expect(code).toContain("from '@modelcontextprotocol/sdk/types.js'");
  });

  it('should embed mode configuration', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'sequential',
      latency: 0,
      onMissing: 'empty',
    });

    expect(code).toContain("const MODE = 'sequential'");
    expect(code).toContain("const ON_MISSING = 'empty'");
  });

  it('should handle original latency', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'match',
      latency: 'original',
      onMissing: 'error',
    });

    expect(code).toContain("const LATENCY = 'original'");
  });

  it('should handle numeric latency', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'match',
      latency: 200,
      onMissing: 'error',
    });

    expect(code).toContain('const LATENCY = 200');
  });

  it('should include stableStringify for deep key sorting', () => {
    const code = generator.generate({
      recording: makeRecording(),
      mode: 'match',
      latency: 0,
      onMissing: 'error',
    });

    expect(code).toContain('function stableStringify');
    // Should NOT use the broken JSON.stringify replacer-array approach
    expect(code).not.toContain('Object.keys(input).sort()');
    expect(code).not.toContain('Object.keys(s.input).sort()');
  });
});
