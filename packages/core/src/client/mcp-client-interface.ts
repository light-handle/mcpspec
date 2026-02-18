export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ResourceInfo {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface ToolCallResult {
  content: unknown[];
  isError?: boolean;
}

export interface MCPClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listTools(): Promise<ToolInfo[]>;
  listResources(): Promise<ResourceInfo[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
  readResource(uri: string): Promise<{ contents: unknown[] }>;
  getServerInfo(): { name?: string; version?: string } | undefined;
}
