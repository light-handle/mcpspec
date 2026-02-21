import { describe, it, expect, vi } from 'vitest';
import { LoggingTransport } from '../../src/client/logging-transport.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

function createMockTransport(): Transport {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    onclose: undefined,
    onerror: undefined,
    onmessage: undefined,
    sessionId: undefined,
  };
}

describe('LoggingTransport', () => {
  it('logs outgoing messages and delegates to inner send()', async () => {
    const inner = createMockTransport();
    const logged: Array<{ dir: string; msg: Record<string, unknown> }> = [];
    const transport = new LoggingTransport(inner, (dir, msg) => logged.push({ dir, msg }));

    const message = { jsonrpc: '2.0' as const, id: 1, method: 'tools/list', params: {} };
    await transport.send(message as unknown as JSONRPCMessage);

    expect(inner.send).toHaveBeenCalledWith(message, undefined);
    expect(logged).toHaveLength(1);
    expect(logged[0].dir).toBe('outgoing');
    expect(logged[0].msg).toEqual(message);
  });

  it('logs incoming messages when onmessage handler is set', () => {
    const inner = createMockTransport();
    const logged: Array<{ dir: string; msg: Record<string, unknown> }> = [];
    const transport = new LoggingTransport(inner, (dir, msg) => logged.push({ dir, msg }));

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    // Simulate the inner transport calling onmessage
    const response = { jsonrpc: '2.0', id: 1, result: { tools: [] } };
    inner.onmessage!(response as unknown as JSONRPCMessage);

    expect(logged).toHaveLength(1);
    expect(logged[0].dir).toBe('incoming');
    expect(logged[0].msg).toEqual(response);
    expect(received).toHaveLength(1);
  });

  it('delegates start() to inner transport', async () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    await transport.start();
    expect(inner.start).toHaveBeenCalled();
  });

  it('delegates close() to inner transport', async () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    await transport.close();
    expect(inner.close).toHaveBeenCalled();
  });

  it('handles undefined onmessage setter gracefully', () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    transport.onmessage = undefined;
    expect(inner.onmessage).toBeUndefined();
  });

  it('proxies sessionId to inner transport', () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    expect(transport.sessionId).toBeUndefined();

    inner.sessionId = 'test-session';
    expect(transport.sessionId).toBe('test-session');

    transport.sessionId = 'new-session';
    expect(inner.sessionId).toBe('new-session');
  });

  it('proxies onclose to inner transport', () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    const handler = vi.fn();
    transport.onclose = handler;
    expect(inner.onclose).toBe(handler);
    expect(transport.onclose).toBe(handler);
  });

  it('proxies onerror to inner transport', () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    const handler = vi.fn();
    transport.onerror = handler;
    expect(inner.onerror).toBe(handler);
    expect(transport.onerror).toBe(handler);
  });

  it('extracts jsonrpcId from outgoing messages', async () => {
    const inner = createMockTransport();
    const logged: Array<{ dir: string; msg: Record<string, unknown> }> = [];
    const transport = new LoggingTransport(inner, (dir, msg) => logged.push({ dir, msg }));

    const request = { jsonrpc: '2.0', id: 42, method: 'tools/call', params: { name: 'test' } };
    await transport.send(request as unknown as JSONRPCMessage);

    expect(logged[0].msg.id).toBe(42);
    expect(logged[0].msg.method).toBe('tools/call');
  });

  it('detects error responses in incoming messages', () => {
    const inner = createMockTransport();
    const logged: Array<{ dir: string; msg: Record<string, unknown> }> = [];
    const transport = new LoggingTransport(inner, (dir, msg) => logged.push({ dir, msg }));

    transport.onmessage = vi.fn();

    const errorResponse = { jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Invalid' } };
    inner.onmessage!(errorResponse as unknown as JSONRPCMessage);

    expect(logged[0].msg.error).toBeDefined();
  });

  it('passes send options through to inner transport', async () => {
    const inner = createMockTransport();
    const transport = new LoggingTransport(inner, vi.fn());

    const message = { jsonrpc: '2.0' as const, id: 1, method: 'test', params: {} };
    const options = { relatedRequestId: 5 };
    await transport.send(message as unknown as JSONRPCMessage, options);

    expect(inner.send).toHaveBeenCalledWith(message, options);
  });
});
