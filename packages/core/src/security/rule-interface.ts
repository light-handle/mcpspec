import type { SecurityFinding } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../client/mcp-client-interface.js';
import type { ScanConfig } from './scan-config.js';

export interface SecurityRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  scan(client: MCPClientInterface, tools: ToolInfo[], config: ScanConfig): Promise<SecurityFinding[]>;
}
