export type WSClientMessageType = 'subscribe' | 'unsubscribe' | 'ping';
export type WSServerMessageType = 'subscribed' | 'event' | 'pong';

export interface WSSubscribeMessage {
  type: 'subscribe';
  channel: string;
}

export interface WSUnsubscribeMessage {
  type: 'unsubscribe';
  channel: string;
}

export interface WSPingMessage {
  type: 'ping';
}

export interface WSSubscribedMessage {
  type: 'subscribed';
  channel: string;
}

export interface WSEventMessage {
  type: 'event';
  channel: string;
  event: string;
  data: unknown;
}

export interface WSPongMessage {
  type: 'pong';
}
