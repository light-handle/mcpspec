import { useParams } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRun } from '@/hooks/use-runs';
import { routerInstance } from '../route-tree';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import type { TestResult } from '@mcpspec/shared';
import { useState } from 'react';

function TestStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'skipped':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
}

function TestResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestStatusIcon status={result.status} />
          <span className="text-sm font-medium">{result.testName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{result.duration}ms</span>
          <Badge variant={result.status === 'passed' ? 'success' : result.status === 'failed' ? 'destructive' : 'secondary'}>
            {result.status}
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {result.error && (
            <div className="rounded bg-red-50 p-2 text-red-700 font-mono text-xs">{result.error}</div>
          )}
          {result.assertions.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-xs text-muted-foreground">Assertions:</p>
              {result.assertions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {a.passed ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RunDetailPage() {
  const { runId } = useParams({ from: '/runs/$runId' });
  const { data, isLoading } = useRun(runId);
  const run = data?.data;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!run) {
    return <p className="text-muted-foreground">Run not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => routerInstance.navigate({ to: '/runs' })}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h2 className="text-2xl font-bold">{run.collectionName}</h2>
        <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'warning'}>
          {run.status}
        </Badge>
      </div>

      {run.summary && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{run.summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{run.summary.passed}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{run.summary.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{run.summary.skipped}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{run.summary.duration}ms</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {run.results && run.results.length > 0 ? (
            run.results.map((result, idx) => <TestResultCard key={idx} result={result} />)
          ) : run.status === 'running' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Clock className="h-4 w-4 animate-spin" />Running tests...
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No results</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
