import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServers } from '@/hooks/use-servers';
import { Plug, Loader2 } from 'lucide-react';

export interface ServerConnectionData {
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

interface SecondaryAction {
  label: string;
  loading?: boolean;
  onClick: (data: ServerConnectionData) => Promise<void>;
}

interface ServerConnectorProps {
  title?: string;
  buttonLabel?: string;
  onConnect: (data: ServerConnectionData) => Promise<void>;
  connecting?: boolean;
  error?: string | null;
  children?: React.ReactNode;
  secondaryAction?: SecondaryAction;
}

export function ServerConnector({ title = 'Connect to Server', buttonLabel, onConnect, connecting, error, children, secondaryAction }: ServerConnectorProps) {
  const [mode, setMode] = useState<'saved' | 'custom'>('saved');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTransport, setCustomTransport] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');

  const servers = useServers();

  function getConnectionData(): ServerConnectionData | null {
    if (mode === 'saved') {
      const server = servers.data?.data.find((s) => s.id === selectedServerId);
      if (!server) return null;
      return {
        transport: server.transport,
        command: server.command,
        args: server.args,
        url: server.url,
        env: server.env,
      };
    } else {
      if (customTransport === 'stdio') {
        const parts = customCommand.split(/\s+/);
        return { transport: 'stdio', command: parts[0], args: parts.slice(1) };
      } else {
        return { transport: customTransport, url: customUrl };
      }
    }
  }

  async function handleConnect() {
    const data = getConnectionData();
    if (!data) return;
    await onConnect(data);
  }

  async function handleSecondaryAction() {
    if (!secondaryAction) return;
    const data = getConnectionData();
    if (!data) return;
    await secondaryAction.onClick(data);
  }

  const canConnect = mode === 'saved' ? !!selectedServerId : (customTransport === 'stdio' ? !!customCommand : !!customUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'saved' | 'custom')}>
          <TabsList>
            <TabsTrigger value="saved">Saved Server</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="space-y-3 mt-3">
            <Select value={selectedServerId} onValueChange={setSelectedServerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a server" />
              </SelectTrigger>
              <SelectContent>
                {servers.data?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.transport})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3 mt-3">
            <Select value={customTransport} onValueChange={(v) => setCustomTransport(v as typeof customTransport)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">stdio</SelectItem>
                <SelectItem value="sse">SSE</SelectItem>
                <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
              </SelectContent>
            </Select>
            {customTransport === 'stdio' ? (
              <Input value={customCommand} onChange={(e) => setCustomCommand(e.target.value)} placeholder="npx @modelcontextprotocol/server-filesystem /tmp" />
            ) : (
              <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="http://localhost:3000/sse" />
            )}
          </TabsContent>
        </Tabs>

        {children}

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className={secondaryAction ? 'flex gap-2' : ''}>
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={handleSecondaryAction}
              disabled={secondaryAction.loading || connecting || !canConnect}
              className="flex-1"
            >
              {secondaryAction.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              {secondaryAction.label}
            </Button>
          )}
          <Button onClick={handleConnect} disabled={connecting || !canConnect} className={secondaryAction ? 'flex-1' : 'w-full'}>
            {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
            {buttonLabel ?? 'Connect & Start'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
