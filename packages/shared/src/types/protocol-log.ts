export type MessageDirection = 'outgoing' | 'incoming';

export interface ProtocolLogEntry {
  id: string;
  timestamp: number;
  direction: MessageDirection;
  message: Record<string, unknown>;
  jsonrpcId?: string | number | null;
  method?: string;
  isError?: boolean;
  roundTripMs?: number;
}
