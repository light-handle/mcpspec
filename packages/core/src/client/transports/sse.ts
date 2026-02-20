import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export { SSEClientTransport };

export function createSSETransport(url: string): SSEClientTransport {
  return new SSEClientTransport(new URL(url));
}
