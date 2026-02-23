import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useServers } from '@/hooks/use-servers';
import { Trash2, Play, Loader2, Video } from 'lucide-react';
import type { RecordingDiff, Recording, SavedRecording } from '@mcpspec/shared';

function StepDiffBadge({ type }: { type: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    matched: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Matched' },
    changed: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Changed' },
    added: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Added' },
    removed: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Removed' },
  };
  const v = variants[type] ?? { className: 'bg-gray-100 text-gray-800', label: type };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${v.className}`}>{v.label}</span>;
}

export function RecordingsPage() {
  const queryClient = useQueryClient();
  const servers = useServers();

  const [replayTarget, setReplayTarget] = useState<string | null>(null);
  const [replayServerId, setReplayServerId] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [replayMode, setReplayMode] = useState<'saved' | 'custom'>('saved');
  const [replayResult, setReplayResult] = useState<RecordingDiff | null>(null);

  const recordingsQuery = useQuery({
    queryKey: ['recordings'],
    queryFn: () => api.recordings.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.recordings.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recordings'] }),
  });

  const replayMutation = useMutation({
    mutationFn: async ({ id, connectData }: { id: string; connectData: Parameters<typeof api.recordings.replay>[1] }) => {
      const res = await api.recordings.replay(id, connectData);
      return res.data;
    },
    onSuccess: (data) => {
      setReplayResult(data);
      setReplayTarget(null);
    },
  });

  function getRecordingData(saved: SavedRecording): Recording | null {
    try {
      return JSON.parse(saved.data) as Recording;
    } catch {
      return null;
    }
  }

  function handleReplay() {
    if (!replayTarget) return;

    let connectData: Parameters<typeof api.recordings.replay>[1];
    if (replayMode === 'saved') {
      const server = servers.data?.data.find((s) => s.id === replayServerId);
      if (!server) return;
      connectData = {
        transport: server.transport,
        command: server.command,
        args: server.args,
        url: server.url,
        env: server.env,
      };
    } else {
      const parts = customCommand.split(/\s+/);
      connectData = { transport: 'stdio', command: parts[0], args: parts.slice(1) };
    }

    replayMutation.mutate({ id: replayTarget, connectData });
  }

  const recordings = recordingsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Recordings</h2>

      {replayTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Replay Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={replayMode === 'saved' ? 'default' : 'outline'}
                onClick={() => setReplayMode('saved')}
              >
                Saved Server
              </Button>
              <Button
                size="sm"
                variant={replayMode === 'custom' ? 'default' : 'outline'}
                onClick={() => setReplayMode('custom')}
              >
                Custom
              </Button>
            </div>

            {replayMode === 'saved' ? (
              <Select value={replayServerId} onValueChange={setReplayServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.data?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.transport})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="npx @modelcontextprotocol/server-filesystem /tmp"
              />
            )}

            <div className="flex gap-2">
              <Button onClick={handleReplay} disabled={replayMutation.isPending}>
                {replayMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Replay
              </Button>
              <Button variant="outline" onClick={() => setReplayTarget(null)}>Cancel</Button>
            </div>

            {replayMutation.error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {replayMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {replayResult && (
        <Card>
          <CardHeader>
            <CardTitle>Replay Results: {replayResult.recordingName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400">Matched: {replayResult.summary.matched}</span>
              <span className="text-yellow-600 dark:text-yellow-400">Changed: {replayResult.summary.changed}</span>
              <span className="text-blue-600 dark:text-blue-400">Added: {replayResult.summary.added}</span>
              <span className="text-red-600 dark:text-red-400">Removed: {replayResult.summary.removed}</span>
            </div>

            <div className="space-y-2">
              {replayResult.steps.map((step) => (
                <div key={step.index} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <span className="font-mono text-muted-foreground w-6">{step.index + 1}</span>
                  <span className="font-medium">{step.tool}</span>
                  <StepDiffBadge type={step.type} />
                  {step.outputDiff && <span className="text-xs text-muted-foreground">{step.outputDiff}</span>}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setReplayResult(null)}>Close</Button>
          </CardContent>
        </Card>
      )}

      {recordings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Video className="h-12 w-12 opacity-50" />
              <p>No recordings yet.</p>
              <p className="text-sm">Use the Inspector to connect to a server, make tool calls, then save a recording.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recordings.map((rec) => {
            const data = getRecordingData(rec);
            return (
              <Card key={rec.id}>
                <CardContent className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-medium">{rec.name}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {rec.serverName && <span>Server: {rec.serverName}</span>}
                      {data && <span>{data.steps.length} steps</span>}
                      <span>{new Date(rec.createdAt).toLocaleString()}</span>
                    </div>
                    {rec.description && <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReplayTarget(rec.id); setReplayResult(null); }}
                    >
                      <Play className="mr-1 h-3 w-3" />Replay
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(rec.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
