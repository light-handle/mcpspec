import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerConnector } from '@/components/shared/server-connector';
import type { ServerConnectionData } from '@/components/shared/server-connector';
import type { MCPScore, WSServerMessage } from '@mcpspec/shared';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { Star, Loader2, Download, ArrowLeft } from 'lucide-react';

type Phase = 'setup' | 'calculating' | 'results';

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

const CATEGORY_LABELS: Record<string, string> = {
  documentation: 'Documentation',
  schemaQuality: 'Schema Quality',
  errorHandling: 'Error Handling',
  responsiveness: 'Responsiveness',
  security: 'Security',
};

export function ScorePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState<MCPScore | null>(null);

  const handleWsMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type !== 'event' || !sessionId || !msg.channel.startsWith(`score:${sessionId}`)) return;

    switch (msg.event) {
      case 'category-start': {
        const data = msg.data as { category: string };
        setCurrentCategory(data.category);
        break;
      }
      case 'category-complete': {
        break;
      }
    }
  }, [sessionId]);

  const { subscribe, connected } = useWebSocket({
    onMessage: handleWsMessage,
    enabled: !!sessionId && phase === 'calculating',
  });

  useEffect(() => {
    if (connected && sessionId) {
      subscribe(`score:${sessionId}`);
    }
  }, [connected, sessionId, subscribe]);

  async function handleConnect(data: ServerConnectionData) {
    setConnecting(true);
    setError(null);
    setCurrentCategory(null);
    setPhase('calculating');

    try {
      const res = await api.score.calculate(data);
      setSessionId(res.data.sessionId);
      setScore(res.data.score);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate score');
      setPhase('setup');
    }
    setConnecting(false);
  }

  async function handleDownloadBadge() {
    if (!score) return;
    try {
      const res = await api.score.badge(score);
      const blob = new Blob([res.data.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-score-badge.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: could show error
    }
  }

  function handleBack() {
    setPhase('setup');
    setScore(null);
    setSessionId(null);
    setError(null);
    setCurrentCategory(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">MCP Score</h2>
      </div>

      {phase === 'setup' && (
        <ServerConnector
          title="Calculate MCP Score"
          onConnect={handleConnect}
          connecting={connecting}
          error={error}
        />
      )}

      {phase === 'calculating' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Calculating Score...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {currentCategory
                ? `Evaluating ${CATEGORY_LABELS[currentCategory] ?? currentCategory}...`
                : 'Connecting to server...'}
            </p>
          </CardContent>
        </Card>
      )}

      {phase === 'results' && score && (
        <>
          {/* Overall score */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Overall Score</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadBadge}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Badge
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${scoreTextColor(score.overall)}`}>
                    {score.overall}
                  </div>
                  <div className="text-lg text-muted-foreground mt-1">out of 100</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(score.categories).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{CATEGORY_LABELS[key] ?? key}</span>
                    <span className={scoreTextColor(value)}>{value}/100</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all ${scoreColor(value)}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
