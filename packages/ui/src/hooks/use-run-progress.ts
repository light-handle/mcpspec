import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './use-websocket';
import type { WSServerMessage } from '@mcpspec/shared';
import type { TestResult } from '@mcpspec/shared';

interface RunProgress {
  started: boolean;
  testResults: TestResult[];
  completed: boolean;
  summary?: { total: number; passed: number; failed: number; skipped: number; errors: number; duration: number };
}

export function useRunProgress(runId: string | undefined) {
  const [progress, setProgress] = useState<RunProgress>({
    started: false,
    testResults: [],
    completed: false,
  });

  const handleMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type !== 'event') return;

    const data = msg.data as Record<string, unknown>;
    switch (msg.event) {
      case 'started':
        setProgress((p) => ({ ...p, started: true }));
        break;
      case 'test-completed':
        setProgress((p) => ({ ...p, testResults: [...p.testResults, data as unknown as TestResult] }));
        break;
      case 'completed':
        setProgress((p) => ({
          ...p,
          completed: true,
          summary: data['summary'] as RunProgress['summary'],
        }));
        break;
    }
  }, []);

  const { connected, subscribe, unsubscribe } = useWebSocket({
    onMessage: handleMessage,
    enabled: !!runId,
  });

  useEffect(() => {
    if (connected && runId) {
      subscribe(`run:${runId}`);
      return () => unsubscribe(`run:${runId}`);
    }
  }, [connected, runId, subscribe, unsubscribe]);

  return progress;
}
