import type { MCPClientInterface, ToolCallResult } from '../../client/mcp-client-interface.js';

export async function callWithTimeout(
  client: MCPClientInterface,
  toolName: string,
  args: Record<string, unknown>,
  timeout: number,
): Promise<ToolCallResult | null> {
  try {
    const result = await Promise.race([
      client.callTool(toolName, args),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
    ]);
    return result;
  } catch {
    return null;
  }
}

export function stringifyContent(result: ToolCallResult): string {
  return JSON.stringify(result.content);
}
