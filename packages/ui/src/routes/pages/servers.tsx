import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ServerForm } from '@/components/forms/server-form';
import { useServers, useCreateServer, useDeleteServer, useTestConnection } from '@/hooks/use-servers';
import { Plus, Trash2, Wifi, Loader2 } from 'lucide-react';

export function ServersPage() {
  const [open, setOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { connected: boolean; toolCount?: number; error?: string }>>({});
  const servers = useServers();
  const createServer = useCreateServer();
  const deleteServer = useDeleteServer();
  const testConnection = useTestConnection();

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const result = await testConnection.mutateAsync(id);
      setTestResult((prev) => ({ ...prev, [id]: result.data }));
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { connected: false, error: 'Request failed' } }));
    }
    setTestingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Servers</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Server</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Server Connection</DialogTitle>
            </DialogHeader>
            <ServerForm
              loading={createServer.isPending}
              onSubmit={async (data) => {
                await createServer.mutateAsync(data);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {servers.data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No servers configured yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.data?.data.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell><Badge variant="outline">{server.transport}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {server.command ? `${server.command} ${server.args?.join(' ') ?? ''}` : server.url ?? '-'}
                    </TableCell>
                    <TableCell>
                      {testResult[server.id] ? (
                        testResult[server.id].connected ? (
                          <Badge variant="success">Connected ({testResult[server.id].toolCount} tools)</Badge>
                        ) : (
                          <Badge variant="destructive">{testResult[server.id].error ?? 'Failed'}</Badge>
                        )
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(server.id)}
                        disabled={testingId === server.id}
                      >
                        {testingId === server.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteServer.mutate(server.id)}
                      >
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
