import { useState, useEffect, useCallback } from 'react';
import type { ProtocolLogEntry, WSServerMessage } from '@mcpspec/shared';
import { useWebSocket } from './use-websocket';
import { api } from '@/lib/api';

const MAX_LOG_ENTRIES = 10_000;

export function useProtocolLog(sessionId: string | null) {
  const [entries, setEntries] = useState<ProtocolLogEntry[]>([]);

  // Fetch initial messages when session connects
  useEffect(() => {
    if (!sessionId) {
      setEntries([]);
      return;
    }
    api.inspect.messages(sessionId).then((res) => {
      setEntries(res.data);
    }).catch(() => {});
  }, [sessionId]);

  // Subscribe to real-time updates via WebSocket
  const handleWsMessage = useCallback((msg: WSServerMessage) => {
    if (!sessionId) return;
    if (msg.type === 'event' && msg.event === 'protocol-message' && msg.channel === `inspect:${sessionId}`) {
      const entry = msg.data as ProtocolLogEntry;
      setEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > MAX_LOG_ENTRIES) {
          return next.slice(next.length - MAX_LOG_ENTRIES);
        }
        return next;
      });
    }
  }, [sessionId]);

  const { subscribe, unsubscribe, connected } = useWebSocket({
    onMessage: handleWsMessage,
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (connected && sessionId) {
      subscribe(`inspect:${sessionId}`);
    }
    return () => {
      if (sessionId) {
        unsubscribe(`inspect:${sessionId}`);
      }
    };
  }, [connected, sessionId, subscribe, unsubscribe]);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, clear };
}
