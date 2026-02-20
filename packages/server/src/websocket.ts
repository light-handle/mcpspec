import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { WSClientMessage, WSServerMessage } from '@mcpspec/shared';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private subscriptions = new Map<WebSocket, Set<string>>();

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', (ws) => this.onConnection(ws));
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }

  private onConnection(ws: WebSocket): void {
    this.subscriptions.set(ws, new Set());

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSClientMessage;
        this.handleMessage(ws, msg);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.subscriptions.delete(ws);
    });

    ws.on('error', () => {
      this.subscriptions.delete(ws);
    });
  }

  private handleMessage(ws: WebSocket, msg: WSClientMessage): void {
    switch (msg.type) {
      case 'subscribe': {
        const channels = this.subscriptions.get(ws);
        if (channels) {
          channels.add(msg.channel);
          this.send(ws, { type: 'subscribed', channel: msg.channel });
        }
        break;
      }
      case 'unsubscribe': {
        const channels = this.subscriptions.get(ws);
        if (channels) {
          channels.delete(msg.channel);
        }
        break;
      }
      case 'ping': {
        this.send(ws, { type: 'pong' });
        break;
      }
    }
  }

  broadcast(channel: string, event: string, data: unknown): void {
    const message: WSServerMessage = { type: 'event', channel, event, data };
    const payload = JSON.stringify(message);

    for (const [ws, channels] of this.subscriptions) {
      if (channels.has(channel) && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private send(ws: WebSocket, msg: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  closeAll(): void {
    for (const ws of this.subscriptions.keys()) {
      ws.close();
    }
    this.subscriptions.clear();
    this.wss.close();
  }

  get clientCount(): number {
    return this.subscriptions.size;
  }
}
