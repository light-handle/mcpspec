import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export { StreamableHTTPClientTransport };

export function createStreamableHTTPTransport(url: string): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(url));
}
