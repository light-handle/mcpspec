import { describe, it, expect, vi } from 'vitest';
import { WebSocketHandler } from '../../src/websocket.js';

describe('WebSocketHandler', () => {
  it('should create without error', () => {
    const handler = new WebSocketHandler();
    expect(handler.clientCount).toBe(0);
    handler.closeAll();
  });

  it('should broadcast without subscribers', () => {
    const handler = new WebSocketHandler();
    // Should not throw
    handler.broadcast('run:123', 'test-completed', { testName: 'foo' });
    handler.closeAll();
  });
});
