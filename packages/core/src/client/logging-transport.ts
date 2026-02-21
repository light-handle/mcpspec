import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage, MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js';

export type OnProtocolMessage = (direction: 'outgoing' | 'incoming', message: Record<string, unknown>) => void;

/**
 * Wraps an SDK Transport to intercept and log all JSON-RPC messages.
 */
export class LoggingTransport implements Transport {
  private inner: Transport;
  private callback: OnProtocolMessage;

  constructor(inner: Transport, callback: OnProtocolMessage) {
    this.inner = inner;
    this.callback = callback;
  }

  async start(): Promise<void> {
    return this.inner.start();
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    this.callback('outgoing', message as unknown as Record<string, unknown>);
    return this.inner.send(message, options);
  }

  async close(): Promise<void> {
    return this.inner.close();
  }

  get onclose(): (() => void) | undefined {
    return this.inner.onclose;
  }

  set onclose(handler: (() => void) | undefined) {
    this.inner.onclose = handler;
  }

  get onerror(): ((error: Error) => void) | undefined {
    return this.inner.onerror;
  }

  set onerror(handler: ((error: Error) => void) | undefined) {
    this.inner.onerror = handler;
  }

  get onmessage(): (<T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void) | undefined {
    return this.inner.onmessage;
  }

  set onmessage(handler: (<T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void) | undefined) {
    if (!handler) {
      this.inner.onmessage = undefined;
      return;
    }
    const cb = this.callback;
    this.inner.onmessage = <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => {
      cb('incoming', message as unknown as Record<string, unknown>);
      handler(message, extra);
    };
  }

  get sessionId(): string | undefined {
    return this.inner.sessionId;
  }

  set sessionId(value: string | undefined) {
    this.inner.sessionId = value;
  }

  get setProtocolVersion(): ((version: string) => void) | undefined {
    return this.inner.setProtocolVersion;
  }

  set setProtocolVersion(handler: ((version: string) => void) | undefined) {
    this.inner.setProtocolVersion = handler;
  }
}
