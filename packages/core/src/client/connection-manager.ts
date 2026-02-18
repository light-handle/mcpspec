import type { ConnectionState, ConnectionConfig } from '@mcpspec/shared';
import { MCPSpecError } from '../errors/mcpspec-error.js';

const VALID_TRANSITIONS: Record<ConnectionState, ConnectionState[]> = {
  disconnected: ['connecting'],
  connecting: ['connected', 'error', 'disconnected'],
  connected: ['disconnecting', 'reconnecting', 'error'],
  reconnecting: ['connected', 'error', 'disconnected'],
  disconnecting: ['disconnected'],
  error: ['connecting', 'disconnected'],
};

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  maxReconnectAttempts: 3,
  reconnectBackoff: 'exponential',
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
};

export class ConnectionManager {
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private config: ConnectionConfig;
  private listeners: Array<(from: ConnectionState, to: ConnectionState) => void> = [];

  constructor(config?: Partial<ConnectionConfig>) {
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config };
  }

  getState(): ConnectionState {
    return this.state;
  }

  canTransition(to: ConnectionState): boolean {
    const allowed = VALID_TRANSITIONS[this.state];
    return allowed !== undefined && allowed.includes(to);
  }

  transition(to: ConnectionState): void {
    if (!this.canTransition(to)) {
      throw new MCPSpecError(
        'CONNECTION_LOST',
        `Invalid state transition: ${this.state} -> ${to}`,
        { from: this.state, to },
      );
    }
    const from = this.state;
    this.state = to;

    if (to === 'connected') {
      this.reconnectAttempts = 0;
    }

    for (const listener of this.listeners) {
      listener(from, to);
    }
  }

  onTransition(listener: (from: ConnectionState, to: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  shouldReconnect(): boolean {
    return this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  getReconnectDelay(): number {
    const delay = this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    return Math.min(delay, this.config.maxReconnectDelay);
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  getConfig(): ConnectionConfig {
    return { ...this.config };
  }
}
