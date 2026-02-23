import type { Recording } from '@mcpspec/shared';
import type { MatchMode, OnMissingBehavior } from './response-matcher.js';

export interface MockGeneratorOptions {
  recording: Recording;
  mode: MatchMode;
  latency: number | 'original';
  onMissing: OnMissingBehavior;
}

export class MockGenerator {
  generate(options: MockGeneratorOptions): string {
    const recordingJson = JSON.stringify(options.recording, null, 2);
    const latencyValue = options.latency === 'original'
      ? `'original'`
      : String(options.latency);

    return `#!/usr/bin/env node
// Auto-generated mock MCP server by mcpspec
// Recording: ${options.recording.name}
// Generated: ${new Date().toISOString()}
//
// Dependencies: @modelcontextprotocol/sdk
// Install: npm install @modelcontextprotocol/sdk
// Run: node ${options.recording.name}-mock.js

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const RECORDING = ${recordingJson};

const MODE = '${options.mode}';
const LATENCY = ${latencyValue};
const ON_MISSING = '${options.onMissing}';

// --- Stable stringify (deep key sorting) ---

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]));
  return '{' + parts.join(',') + '}';
}

// --- ResponseMatcher (inlined) ---

class ResponseMatcher {
  constructor(steps, config) {
    this.config = config;
    this.steps = steps;
    this.servedCount = 0;
    this.toolQueues = new Map();
    this.sequentialCursor = 0;

    if (config.mode === 'match') {
      for (const step of steps) {
        const queue = this.toolQueues.get(step.tool);
        if (queue) {
          queue.push(step);
        } else {
          this.toolQueues.set(step.tool, [step]);
        }
      }
    }
  }

  match(toolName, input) {
    if (this.config.mode === 'sequential') {
      return this._matchSequential();
    }
    return this._matchByTool(toolName, input);
  }

  _matchSequential() {
    if (this.sequentialCursor >= this.steps.length) return null;
    const step = this.steps[this.sequentialCursor];
    this.sequentialCursor++;
    this.servedCount++;
    return { output: step.output, isError: step.isError === true, durationMs: step.durationMs || 0 };
  }

  _matchByTool(toolName, input) {
    const queue = this.toolQueues.get(toolName);
    if (!queue || queue.length === 0) return null;

    const inputKey = stableStringify(input);
    const exactIndex = queue.findIndex(
      (s) => stableStringify(s.input) === inputKey
    );

    let step;
    if (exactIndex !== -1) {
      step = queue.splice(exactIndex, 1)[0];
    } else {
      step = queue.shift();
    }
    this.servedCount++;
    return { output: step.output, isError: step.isError === true, durationMs: step.durationMs || 0 };
  }
}

// --- Server setup ---

const matcher = new ResponseMatcher(RECORDING.steps, { mode: MODE, onMissing: ON_MISSING });

const server = new Server(
  { name: RECORDING.serverName || RECORDING.name, version: '1.0.0-mock' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: RECORDING.tools.map((t) => ({
    name: t.name,
    description: t.description || '',
    inputSchema: { type: 'object', properties: {} },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const input = request.params.arguments || {};
  const result = matcher.match(toolName, input);

  if (!result) {
    if (ON_MISSING === 'empty') {
      return { content: [{ type: 'text', text: '' }], isError: false };
    }
    return { content: [{ type: 'text', text: \`No recorded response for tool "\${toolName}"\` }], isError: true };
  }

  const delay = LATENCY === 'original' ? result.durationMs : LATENCY;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { content: result.output, isError: result.isError };
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(\`Mock server started (\${RECORDING.steps.length} recorded steps)\\n\`);
`;
  }
}
