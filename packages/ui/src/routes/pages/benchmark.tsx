import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServerConnector } from '@/components/shared/server-connector';
import type { ServerConnectionData } from '@/components/shared/server-connector';
import type { BenchmarkResult } from '@mcpspec/shared';
import type { WSServerMessage } from '@mcpspec/shared';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { Timer, Loader2, StopCircle, Play } from 'lucide-react';

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

type Phase = 'connect' | 'setup' | 'running' | 'results';

export function BenchmarkPage() {
  const [phase, setPhase] = useState<Phase>('connect');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionData, setConnectionData] = useState<ServerConnectionData | null>(null);

  // Setup state
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [iterations, setIterations] = useState('100');
  const [warmup, setWarmup] = useState('5');

  // Running state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState<string>('warmup');
  const [completedIterations, setCompletedIterations] = useState(0);
  const [totalIterations, setTotalIterations] = useState(0);

  // Results state
  const [result, setResult] = useState<BenchmarkResult | null>(null);

  const handleWsMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type !== 'event' || !sessionId || msg.channel !== `benchmark:${sessionId}`) return;

    switch (msg.event) {
      case 'warmup-start': {
        setProgressPhase('warmup');
        break;
      }
      case 'iteration': {
        const data = msg.data as { iteration: number; duration: number };
        setProgressPhase('measuring');
        setCompletedIterations(data.iteration);
        break;
      }
      case 'completed': {
        const data = msg.data as { result: BenchmarkResult };
        setResult(data.result);
        setPhase('results');
        break;
      }
      case 'error': {
        const data = msg.data as { message: string };
        setError(data.message);
        setPhase('connect');
        break;
      }
    }
  }, [sessionId]);

  const { subscribe, connected } = useWebSocket({
    onMessage: handleWsMessage,
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (connected && sessionId) {
      subscribe(`benchmark:${sessionId}`);
    }
  }, [connected, sessionId, subscribe]);

  // Phase 1: Connect to server and fetch tools
  async function handleConnect(data: ServerConnectionData) {
    setConnecting(true);
    setError(null);

    try {
      // We need to start a benchmark session to list tools, but we don't want to run yet.
      // Use a dummy benchmark start just to connect, then we'll stop and re-start.
      // Actually, we should use inspect endpoint just to list tools, then start benchmark properly.
      // Let's use the inspect connect endpoint for tool discovery.
      const connectRes = await api.inspect.connect({
        transport: data.transport,
        command: data.command,
        args: data.args,
        url: data.url,
        env: data.env,
      });

      const toolsRes = await api.inspect.tools(connectRes.data.sessionId);
      setTools(toolsRes.data);
      setConnectionData(data);

      // Disconnect the inspect session - we'll create a benchmark session later
      await api.inspect.disconnect(connectRes.data.sessionId).catch(() => {});

      if (toolsRes.data.length > 0) {
        setSelectedTool(toolsRes.data[0]!.name);
      }
      setPhase('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
    setConnecting(false);
  }

  // Phase 2: Start benchmark
  async function handleStartBenchmark() {
    if (!connectionData || !selectedTool) return;

    setError(null);
    setCompletedIterations(0);
    setTotalIterations(parseInt(iterations, 10));
    setProgressPhase('warmup');

    try {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolArgs);
      } catch {
        setError('Invalid JSON in tool arguments');
        return;
      }

      const res = await api.benchmark.start({
        ...connectionData,
        tool: selectedTool,
        toolArgs: parsedArgs,
        iterations: parseInt(iterations, 10),
        warmup: parseInt(warmup, 10),
      });

      setSessionId(res.data.sessionId);
      setPhase('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start benchmark');
    }
  }

  async function handleStop() {
    if (sessionId) {
      await api.benchmark.stop(sessionId).catch(() => {});
      setSessionId(null);
      setPhase('setup');
    }
  }

  function handleNewBenchmark() {
    setSessionId(null);
    setResult(null);
    setCompletedIterations(0);
    setError(null);
    setPhase('connect');
    setConnectionData(null);
    setTools([]);
    setSelectedTool('');
  }

  function fmtMs(ms: number): string {
    return ms.toFixed(2);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Timer className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Performance Benchmark</h2>
      </div>

      {/* Phase 1: Connect */}
      {phase === 'connect' && (
        <ServerConnector
          title="Connect to Server"
          onConnect={handleConnect}
          connecting={connecting}
          error={error}
        />
      )}

      {/* Phase 2: Setup */}
      {phase === 'setup' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Configure Benchmark</CardTitle>
              <Badge variant="success">{tools.length} tools available</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tool</label>
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tool" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name}{t.description ? ` - ${t.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tool Arguments (JSON)</label>
              <Input
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                placeholder='{"path": "/tmp"}'
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Iterations</label>
                <Input
                  type="number"
                  value={iterations}
                  onChange={(e) => setIterations(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Warmup Iterations</label>
                <Input
                  type="number"
                  value={warmup}
                  onChange={(e) => setWarmup(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <Button onClick={handleStartBenchmark} disabled={!selectedTool} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Run Benchmark
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Running */}
      {phase === 'running' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Running Benchmark
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleStop}>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tool:</span>
              <Badge variant="outline">{selectedTool}</Badge>
              <span className="text-sm font-medium ml-4">Phase:</span>
              <Badge variant={progressPhase === 'warmup' ? 'secondary' : 'default'}>
                {progressPhase === 'warmup' ? 'Warmup' : 'Measuring'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progressPhase === 'warmup' ? 'Warming up...' : `Iteration ${completedIterations} / ${totalIterations}`}</span>
                {totalIterations > 0 && progressPhase === 'measuring' && (
                  <span>{((completedIterations / totalIterations) * 100).toFixed(0)}%</span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{
                    width: progressPhase === 'warmup'
                      ? '0%'
                      : totalIterations > 0
                        ? `${(completedIterations / totalIterations) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 4: Results */}
      {phase === 'results' && result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Benchmark Results - {result.toolName}</CardTitle>
                <Button variant="outline" size="sm" onClick={handleNewBenchmark}>
                  New Benchmark
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview badges */}
              <div className="flex gap-3 flex-wrap">
                <Badge variant="outline">{result.iterations} iterations</Badge>
                <Badge variant="outline">{result.errors} errors</Badge>
                {result.iterations > 0 && (
                  <Badge variant="outline">
                    {((result.errors / result.iterations) * 100).toFixed(1)}% error rate
                  </Badge>
                )}
              </div>

              {/* Stats table */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Min" value={`${fmtMs(result.stats.min)} ms`} />
                <StatCard label="Max" value={`${fmtMs(result.stats.max)} ms`} />
                <StatCard label="Mean" value={`${fmtMs(result.stats.mean)} ms`} />
                <StatCard label="Median" value={`${fmtMs(result.stats.median)} ms`} />
                <StatCard label="P95" value={`${fmtMs(result.stats.p95)} ms`} />
                <StatCard label="P99" value={`${fmtMs(result.stats.p99)} ms`} />
                <StatCard label="Std Dev" value={`${fmtMs(result.stats.stddev)} ms`} />
                <StatCard
                  label="Throughput"
                  value={(() => {
                    const startMs = new Date(result.startedAt).getTime();
                    const endMs = new Date(result.completedAt).getTime();
                    const durationSec = (endMs - startMs) / 1000;
                    return durationSec > 0
                      ? `${(result.iterations / durationSec).toFixed(1)} calls/sec`
                      : 'N/A';
                  })()}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
