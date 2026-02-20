import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useServers } from '@/hooks/use-servers';
import { useCollections } from '@/hooks/use-collections';
import { useRuns } from '@/hooks/use-runs';
import { routerInstance } from '../route-tree';
import { Server, FileText, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
    case 'running':
      return <Badge variant="warning"><AlertCircle className="mr-1 h-3 w-3" />Running</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function DashboardPage() {
  const servers = useServers();
  const collections = useCollections();
  const runs = useRuns(5);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers.data?.total ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collections.data?.total ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Runs</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runs.data?.total ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => routerInstance.navigate({ to: '/servers' })}>
              Add Server
            </Button>
            <Button size="sm" variant="outline" onClick={() => routerInstance.navigate({ to: '/collections' })}>
              New Collection
            </Button>
            <Button size="sm" variant="outline" onClick={() => routerInstance.navigate({ to: '/inspect' })}>
              Inspect Server
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.data?.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No test runs yet</p>
            ) : (
              <div className="space-y-2">
                {runs.data?.data.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => routerInstance.navigate({ to: '/runs/$runId', params: { runId: run.id } })}
                  >
                    <div>
                      <p className="text-sm font-medium">{run.collectionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.duration ? `${run.duration}ms` : 'In progress...'}
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
