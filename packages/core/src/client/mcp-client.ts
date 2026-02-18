import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPClientInterface, ToolInfo, ResourceInfo, ToolCallResult } from './mcp-client-interface.js';
import type { ServerConfig } from '@mcpspec/shared';
import { ConnectionManager } from './connection-manager.js';
import { ProcessManagerImpl } from '../process/process-manager.js';
import { MCPSpecError } from '../errors/mcpspec-error.js';

export interface MCPClientOptions {
  serverConfig: ServerConfig | string;
  processManager?: ProcessManagerImpl;
}

export class MCPClient implements MCPClientInterface {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connectionManager: ConnectionManager;
  public readonly processManager: ProcessManagerImpl;
  private serverConfig: ServerConfig;
  private serverInfo: { name?: string; version?: string } | undefined;

  constructor(options: MCPClientOptions) {
    this.connectionManager = new ConnectionManager();
    this.processManager = options.processManager ?? new ProcessManagerImpl();
    this.serverConfig = this.normalizeConfig(options.serverConfig);
  }

  private normalizeConfig(config: ServerConfig | string): ServerConfig {
    if (typeof config === 'string') {
      const parts = config.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);
      if (!command) {
        throw new MCPSpecError('CONFIG_ERROR', 'Empty server command', { config });
      }
      return {
        transport: 'stdio',
        command,
        args,
      };
    }
    return config;
  }

  async connect(): Promise<void> {
    if (this.connectionManager.getState() === 'connected') return;

    this.connectionManager.transition('connecting');

    try {
      const { command, args } = this.serverConfig;
      if (!command) {
        throw new MCPSpecError('CONFIG_ERROR', 'Server command is required for stdio transport', {
          config: this.serverConfig,
        });
      }

      this.transport = new StdioClientTransport({
        command,
        args: args ?? [],
        env: this.serverConfig.env as Record<string, string> | undefined,
      });

      this.client = new Client(
        { name: 'mcpspec', version: '0.1.0' },
        { capabilities: {} },
      );

      await this.client.connect(this.transport);
      this.serverInfo = this.client.getServerVersion() as { name?: string; version?: string } | undefined;
      this.connectionManager.transition('connected');
    } catch (err) {
      this.connectionManager.transition('error');
      if (err instanceof MCPSpecError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('CONNECTION_TIMEOUT', `Failed to connect to MCP server: ${message}`, {
        command: this.serverConfig.command,
        error: message,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectionManager.getState() === 'disconnected') return;

    if (this.connectionManager.canTransition('disconnecting')) {
      this.connectionManager.transition('disconnecting');
    }

    try {
      if (this.transport) {
        await this.transport.close();
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      this.client = null;
      this.transport = null;
      if (this.connectionManager.canTransition('disconnected')) {
        this.connectionManager.transition('disconnected');
      }
    }
  }

  isConnected(): boolean {
    return this.connectionManager.getState() === 'connected';
  }

  async listTools(): Promise<ToolInfo[]> {
    this.ensureConnected();
    try {
      const result = await this.client!.listTools();
      return (result.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('TOOL_CALL_FAILED', `Failed to list tools: ${message}`, {
        error: message,
      });
    }
  }

  async listResources(): Promise<ResourceInfo[]> {
    this.ensureConnected();
    try {
      const result = await this.client!.listResources();
      return (result.resources ?? []).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('TOOL_CALL_FAILED', `Failed to list resources: ${message}`, {
        error: message,
      });
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    this.ensureConnected();
    try {
      const result = await this.client!.callTool({ name, arguments: args });
      return {
        content: result.content as unknown[],
        isError: result.isError === true ? true : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('TOOL_CALL_FAILED', `Tool call "${name}" failed: ${message}`, {
        toolName: name,
        error: message,
      });
    }
  }

  async readResource(uri: string): Promise<{ contents: unknown[] }> {
    this.ensureConnected();
    try {
      const result = await this.client!.readResource({ uri });
      return { contents: result.contents as unknown[] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('TOOL_CALL_FAILED', `Failed to read resource "${uri}": ${message}`, {
        uri,
        error: message,
      });
    }
  }

  getServerInfo(): { name?: string; version?: string } | undefined {
    return this.serverInfo;
  }

  getConnectionState() {
    return this.connectionManager.getState();
  }

  private ensureConnected(): void {
    if (!this.isConnected() || !this.client) {
      throw new MCPSpecError('CONNECTION_LOST', 'Not connected to MCP server. Call connect() first.', {});
    }
  }
}
