import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Recording } from '@mcpspec/shared';
import { ResponseMatcher, type MatchMode, type OnMissingBehavior, type MatcherStats } from './response-matcher.js';

export interface MockServerConfig {
  recording: Recording;
  mode: MatchMode;
  latency: number | 'original';
  onMissing: OnMissingBehavior;
}

export interface MockServerStats extends MatcherStats {
  toolCount: number;
}

export class MockMCPServer {
  private readonly config: MockServerConfig;
  private readonly matcher: ResponseMatcher;
  private readonly server: Server;

  constructor(config: MockServerConfig) {
    this.config = config;
    this.matcher = new ResponseMatcher(config.recording.steps, {
      mode: config.mode,
      onMissing: config.onMissing,
    });

    this.server = new Server(
      {
        name: config.recording.serverName ?? config.recording.name,
        version: '1.0.0-mock',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.registerHandlers();
  }

  async start(transport?: Transport): Promise<void> {
    const t = transport ?? new StdioServerTransport();
    await this.server.connect(t);
    // Status messages go to stderr (stdout is for MCP protocol)
    process.stderr.write(`Mock server started (${this.config.recording.steps.length} recorded steps)\n`);
  }

  getStats(): MockServerStats {
    return {
      ...this.matcher.getStats(),
      toolCount: this.config.recording.tools.length,
    };
  }

  private registerHandlers(): void {
    const tools = this.config.recording.tools;
    const matcher = this.matcher;
    const config = this.config;

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description ?? '',
          inputSchema: { type: 'object' as const, properties: {} },
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const input = (request.params.arguments ?? {}) as Record<string, unknown>;

      const result = matcher.match(toolName, input);

      if (!result) {
        if (config.onMissing === 'empty') {
          return {
            content: [{ type: 'text', text: '' }],
            isError: false,
          };
        }
        // onMissing === 'error'
        return {
          content: [{ type: 'text', text: `No recorded response for tool "${toolName}"` }],
          isError: true,
        };
      }

      // Apply latency
      const delay = config.latency === 'original' ? result.durationMs : config.latency;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return {
        content: result.output as Array<{ type: string; text: string }>,
        isError: result.isError,
      };
    });
  }
}
