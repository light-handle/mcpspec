import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRuns, useTriggerRun, useDeleteRun } from '@/hooks/use-runs';
import { useCollections } from '@/hooks/use-collections';
import { routerInstance } from '../route-tree';
import { Play, Trash2, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
    case 'running':
      return <Badge variant="warning"><Clock className="mr-1 h-3 w-3 animate-spin" />Running</Badge>;
    case 'cancelled':
      return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function RunsPage() {
  const [runOpen, setRunOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const runs = useRuns();
  const collections = useCollections();
  const triggerRun = useTriggerRun();
  const deleteRun = useDeleteRun();

  async function handleTrigger() {
    if (!selectedCollection) return;
    const result = await triggerRun.mutateAsync({ collectionId: selectedCollection });
    setRunOpen(false);
    routerInstance.navigate({ to: '/runs/$runId', params: { runId: result.data.id } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Test Runs</h2>
        <Dialog open={runOpen} onOpenChange={setRunOpen}>
          <DialogTrigger asChild>
            <Button><Play className="mr-2 h-4 w-4" />Run Collection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Collection</label>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.data?.data.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleTrigger} disabled={!selectedCollection || triggerRun.isPending} className="w-full">
                {triggerRun.isPending ? 'Starting...' : 'Start Run'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No runs yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data?.data.map((run) => (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => routerInstance.navigate({ to: '/runs/$runId', params: { runId: run.id } })}
                  >
                    <TableCell className="font-medium">{run.collectionName}</TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell>
                      {run.summary ? (
                        <span className="text-sm">
                          <span className="text-green-600">{run.summary.passed}</span>
                          {' / '}
                          <span>{run.summary.total}</span>
                          {run.summary.failed > 0 && <span className="text-red-600"> ({run.summary.failed} failed)</span>}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{run.duration ? `${run.duration}ms` : '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => deleteRun.mutate(run.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
