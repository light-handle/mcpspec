import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToolCaller } from '@/components/inspect/tool-caller';
import { JsonViewer } from '@/components/inspect/json-viewer';
import { ProtocolLog } from '@/components/inspect/protocol-log';
import { ProtocolTail } from '@/components/inspect/protocol-tail';
import { useServers } from '@/hooks/use-servers';
import { useProtocolLog } from '@/hooks/use-protocol-log';
import { api } from '@/lib/api';
import { Plug, Unplug, Loader2, Save } from 'lucide-react';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface Resource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export function InspectPage() {
  const [mode, setMode] = useState<'saved' | 'custom'>('saved');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTransport, setCustomTransport] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSaveRecording, setShowSaveRecording] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [savingRecording, setSavingRecording] = useState(false);

  const servers = useServers();
  const { entries: protocolEntries } = useProtocolLog(sessionId);

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      let connectData: Parameters<typeof api.inspect.connect>[0];

      if (mode === 'saved') {
        const server = servers.data?.data.find((s) => s.id === selectedServerId);
        if (!server) throw new Error('Server not found');
        connectData = {
          transport: server.transport,
          command: server.command,
          args: server.args,
          url: server.url,
          env: server.env,
        };
      } else {
        if (customTransport === 'stdio') {
          const parts = customCommand.split(/\s+/);
          connectData = { transport: 'stdio', command: parts[0], args: parts.slice(1) };
        } else {
          connectData = { transport: customTransport, url: customUrl };
        }
      }

      const result = await api.inspect.connect(connectData);
      setSessionId(result.data.sessionId);

      // Fetch tools and resources
      const [toolsRes, resourcesRes] = await Promise.all([
        api.inspect.tools(result.data.sessionId),
        api.inspect.resources(result.data.sessionId).catch(() => ({ data: [] })),
      ]);

      setTools(toolsRes.data);
      setResources(resourcesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }

    setConnecting(false);
  }

  async function handleDisconnect() {
    if (sessionId) {
      await api.inspect.disconnect(sessionId).catch(() => {});
      setSessionId(null);
      setTools([]);
      setResources([]);
    }
  }

  async function handleSaveRecording() {
    if (!sessionId || !recordingName.trim()) return;
    setSavingRecording(true);
    try {
      await api.inspect.saveRecording(sessionId, recordingName.trim(), recordingDescription.trim() || undefined);
      setShowSaveRecording(false);
      setRecordingName('');
      setRecordingDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording');
    }
    setSavingRecording(false);
  }

  // Check if there are tool calls in the protocol log
  const hasToolCalls = protocolEntries.some(
    (e) => e.direction === 'outgoing' && e.method === 'tools/call',
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Inspector</h2>

      {!sessionId ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect to Server</CardTitle>
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

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Connect
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Badge variant="success">Connected</Badge>
            <span className="text-sm text-muted-foreground">{tools.length} tools, {resources.length} resources</span>
            {hasToolCalls && (
              <Button size="sm" variant="outline" onClick={() => setShowSaveRecording(true)}>
                <Save className="mr-2 h-4 w-4" />Save Recording
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDisconnect}>
              <Unplug className="mr-2 h-4 w-4" />Disconnect
            </Button>
          </div>

          {showSaveRecording && (
            <Card>
              <CardHeader>
                <CardTitle>Save Recording</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  placeholder="Recording name"
                />
                <Input
                  value={recordingDescription}
                  onChange={(e) => setRecordingDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveRecording}
                    disabled={savingRecording || !recordingName.trim()}
                  >
                    {savingRecording ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveRecording(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="tools">
            <TabsList>
              <TabsTrigger value="tools">Tools ({tools.length})</TabsTrigger>
              <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
              <TabsTrigger value="call">Call Tool</TabsTrigger>
              <TabsTrigger value="protocol">Protocol Log</TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="mt-4 space-y-3">
              {tools.map((tool) => (
                <Card key={tool.name}>
                  <CardContent className="pt-4">
                    <p className="font-medium text-sm">{tool.name}</p>
                    {tool.description && <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>}
                    {tool.inputSchema && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Input Schema</summary>
                        <JsonViewer data={tool.inputSchema} />
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="resources" className="mt-4 space-y-3">
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resources exposed</p>
              ) : (
                resources.map((resource) => (
                  <Card key={resource.uri}>
                    <CardContent className="pt-4">
                      <p className="font-medium text-sm">{resource.name ?? resource.uri}</p>
                      <p className="text-xs text-muted-foreground">{resource.uri}</p>
                      {resource.description && <p className="text-xs mt-1">{resource.description}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="call" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <ToolCaller sessionId={sessionId} tools={tools} />
                </CardContent>
              </Card>
              <ProtocolTail entries={protocolEntries} />
            </TabsContent>

            <TabsContent value="protocol" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  <ProtocolLog entries={protocolEntries} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
