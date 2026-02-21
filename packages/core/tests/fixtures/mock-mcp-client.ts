import type { MCPClientInterface, ToolInfo, ResourceInfo, ToolCallResult } from '../../src/client/mcp-client-interface.js';

export type CallHandler = (name: string, args: Record<string, unknown>) => ToolCallResult;

export class MockMCPClient implements MCPClientInterface {
  private connected = false;
  private tools: ToolInfo[];
  private resources: ResourceInfo[];
  private callHandler: CallHandler;
  private serverInfo: { name?: string; version?: string };

  constructor(options: {
    tools?: ToolInfo[];
    resources?: ResourceInfo[];
    callHandler?: CallHandler;
    serverInfo?: { name?: string; version?: string };
  } = {}) {
    this.tools = options.tools ?? [];
    this.resources = options.resources ?? [];
    this.callHandler = options.callHandler ?? (() => ({ content: [{ type: 'text', text: 'ok' }] }));
    this.serverInfo = options.serverInfo ?? { name: 'mock-server', version: '1.0.0' };
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<ToolInfo[]> {
    return this.tools;
  }

  async listResources(): Promise<ResourceInfo[]> {
    return this.resources;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    return this.callHandler(name, args);
  }

  async readResource(_uri: string): Promise<{ contents: unknown[] }> {
    return { contents: [] };
  }

  getServerInfo(): { name?: string; version?: string } | undefined {
    return this.serverInfo;
  }

  setCallHandler(handler: CallHandler): void {
    this.callHandler = handler;
  }

  setTools(tools: ToolInfo[]): void {
    this.tools = tools;
  }
}
