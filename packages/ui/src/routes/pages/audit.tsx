import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServerConnector } from '@/components/shared/server-connector';
import type { ServerConnectionData } from '@/components/shared/server-connector';
import type { SecurityFinding, SecurityScanResult, SeverityLevel } from '@mcpspec/shared';
import type { WSServerMessage } from '@mcpspec/shared';
import { useWebSocket } from '@/hooks/use-websocket';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, StopCircle, ChevronDown, ChevronRight, ArrowLeft, Play, CheckCircle2, XCircle } from 'lucide-react';

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-red-500 text-white',
  medium: 'bg-orange-500 text-white',
  low: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white',
};

interface DryRunResult {
  tools: Array<{ name: string; included: boolean; reason?: string }>;
  rules: string[];
  mode: string;
}

type Phase = 'setup' | 'preview' | 'scanning' | 'results';

export function AuditPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<'passive' | 'active' | 'aggressive'>('passive');
  const [excludeToolsInput, setExcludeToolsInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Dry-run / preview state
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [savedConnectionData, setSavedConnectionData] = useState<ServerConnectionData | null>(null);

  // Scanning state
  const [currentRule, setCurrentRule] = useState<string | null>(null);
  const [completedRules, setCompletedRules] = useState(0);
  const [totalRules, setTotalRules] = useState(0);
  const [liveFindings, setLiveFindings] = useState<SecurityFinding[]>([]);

  // Results state
  const [result, setResult] = useState<SecurityScanResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const handleWsMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type !== 'event' || !sessionId || msg.channel !== `scan:${sessionId}`) return;

    switch (msg.event) {
      case 'rule-start': {
        const data = msg.data as { ruleId: string; ruleName: string };
        setCurrentRule(data.ruleName);
        break;
      }
      case 'rule-complete': {
        setCompletedRules((prev) => prev + 1);
        break;
      }
      case 'finding': {
        const data = msg.data as { finding: SecurityFinding };
        setLiveFindings((prev) => [...prev, data.finding]);
        break;
      }
      case 'completed': {
        // Fetch final result
        if (sessionId) {
          api.audit.result(sessionId).then((res) => {
            setResult(res.data);
            setPhase('results');
          }).catch(() => {
            setPhase('results');
          });
        }
        break;
      }
      case 'error': {
        const data = msg.data as { message: string };
        setError(data.message);
        setPhase('setup');
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
      subscribe(`scan:${sessionId}`);
    }
  }, [connected, sessionId, subscribe]);

  function parseExcludeTools(): string[] | undefined {
    const trimmed = excludeToolsInput.trim();
    if (!trimmed) return undefined;
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }

  async function handleDryRun(data: ServerConnectionData) {
    setDryRunLoading(true);
    setError(null);

    try {
      const res = await api.audit.dryRun({ ...data, mode, excludeTools: parseExcludeTools() });
      setDryRunResult(res.data);
      setSavedConnectionData(data);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run dry-run preview');
    }
    setDryRunLoading(false);
  }

  async function handleConnect(data: ServerConnectionData) {
    setConnecting(true);
    setError(null);
    setLiveFindings([]);
    setCompletedRules(0);
    setCurrentRule(null);

    try {
      const res = await api.audit.start({ ...data, mode, excludeTools: parseExcludeTools() });
      setSessionId(res.data.sessionId);

      // Get total rules from status
      const status = await api.audit.status(res.data.sessionId);
      if (status.data.progress) {
        setTotalRules(status.data.progress.totalRules);
      }
      setPhase('scanning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start audit');
    }
    setConnecting(false);
  }

  async function handleRunFromPreview() {
    if (!savedConnectionData) return;
    await handleConnect(savedConnectionData);
  }

  async function handleStop() {
    if (sessionId) {
      await api.audit.stop(sessionId).catch(() => {});
      setSessionId(null);
      setPhase('setup');
    }
  }

  function handleNewScan() {
    setSessionId(null);
    setResult(null);
    setLiveFindings([]);
    setCompletedRules(0);
    setCurrentRule(null);
    setError(null);
    setDryRunResult(null);
    setSavedConnectionData(null);
    setPhase('setup');
  }

  const filteredFindings = result?.findings.filter(
    (f) => severityFilter === 'all' || f.severity === severityFilter,
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Security Audit</h2>
      </div>

      {phase === 'setup' && (
        <ServerConnector
          title="Start Security Audit"
          buttonLabel="Start Scan"
          onConnect={handleConnect}
          connecting={connecting}
          error={error}
          secondaryAction={{
            label: 'Preview Scan',
            loading: dryRunLoading,
            onClick: handleDryRun,
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Scan Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passive">Passive (safe, read-only probes)</SelectItem>
                <SelectItem value="active">Active (sends test payloads)</SelectItem>
                <SelectItem value="aggressive">Aggressive (extensive probing)</SelectItem>
              </SelectContent>
            </Select>
            {mode !== 'passive' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <strong>Warning:</strong> {mode === 'active' ? 'Active' : 'Aggressive'} mode sends potentially harmful payloads. Only use against test environments.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exclude Tools</label>
            <Input
              value={excludeToolsInput}
              onChange={(e) => setExcludeToolsInput(e.target.value)}
              placeholder="tool1, tool2, ... (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">Tools to skip during scanning. Destructive-sounding tools are auto-skipped in active/aggressive mode.</p>
          </div>
        </ServerConnector>
      )}

      {phase === 'preview' && dryRunResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scan Preview</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPhase('setup')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button size="sm" onClick={handleRunFromPreview} disabled={connecting}>
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Run Scan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline">{dryRunResult.mode} mode</Badge>
              <span className="text-sm text-muted-foreground">
                {dryRunResult.tools.filter((t) => t.included).length} of {dryRunResult.tools.length} tools will be scanned
              </span>
              <span className="text-sm text-muted-foreground">
                {dryRunResult.rules.length} rule{dryRunResult.rules.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Rules</h4>
              <div className="flex gap-2 flex-wrap">
                {dryRunResult.rules.map((rule) => (
                  <Badge key={rule} variant="secondary">{rule}</Badge>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tools</h4>
              <div className="rounded-md border divide-y">
                {dryRunResult.tools.map((tool) => (
                  <div key={tool.name} className="flex items-center gap-3 px-3 py-2">
                    {tool.included ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={tool.included ? 'text-sm' : 'text-sm text-muted-foreground line-through'}>
                      {tool.name}
                    </span>
                    {tool.reason && (
                      <span className="text-xs text-muted-foreground ml-auto">{tool.reason}</span>
                    )}
                  </div>
                ))}
                {dryRunResult.tools.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No tools found on server</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'scanning' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Scanning...
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleStop}>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentRule ? `Running: ${currentRule}` : 'Starting...'}</span>
                <span>{completedRules} / {totalRules} rules</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: totalRules > 0 ? `${(completedRules / totalRules) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Live findings count by severity */}
            <div className="flex gap-2 flex-wrap">
              {(['critical', 'high', 'medium', 'low', 'info'] as SeverityLevel[]).map((sev) => {
                const count = liveFindings.filter((f) => f.severity === sev).length;
                if (count === 0) return null;
                return (
                  <Badge key={sev} className={SEVERITY_COLORS[sev]}>
                    {sev}: {count}
                  </Badge>
                );
              })}
              {liveFindings.length === 0 && (
                <span className="text-sm text-muted-foreground">No findings yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'results' && result && (
        <>
          {/* Summary card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scan Results - {result.serverName}</CardTitle>
                <Button variant="outline" size="sm" onClick={handleNewScan}>
                  New Scan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mode:</span>
                <Badge variant="outline">{result.mode}</Badge>
                <span className="text-sm font-medium ml-4">Total Findings:</span>
                <Badge variant="secondary">{result.summary.totalFindings}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['critical', 'high', 'medium', 'low', 'info'] as SeverityLevel[]).map((sev) => {
                  const count = result.summary.bySeverity[sev];
                  if (count === 0) return null;
                  return (
                    <Badge key={sev} className={SEVERITY_COLORS[sev]}>
                      {sev}: {count}
                    </Badge>
                  );
                })}
                {result.summary.totalFindings === 0 && (
                  <span className="text-sm text-green-600 font-medium">No vulnerabilities found</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Findings list */}
          {result.findings.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Findings</CardTitle>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredFindings.map((finding) => (
                    <div key={finding.id} className="rounded-md border">
                      <button
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                      >
                        {expandedFinding === finding.id ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                        <Badge className={`${SEVERITY_COLORS[finding.severity]} flex-shrink-0`}>
                          {finding.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{finding.rule}</span>
                        <span className="text-sm font-medium truncate">{finding.title}</span>
                      </button>
                      {expandedFinding === finding.id && (
                        <div className="border-t px-3 py-3 space-y-2 bg-muted/20">
                          <p className="text-sm">{finding.description}</p>
                          {finding.evidence && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Evidence</p>
                              <pre className="rounded bg-muted p-2 text-xs overflow-x-auto">{finding.evidence}</pre>
                            </div>
                          )}
                          {finding.remediation && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Remediation</p>
                              <p className="text-sm">{finding.remediation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
