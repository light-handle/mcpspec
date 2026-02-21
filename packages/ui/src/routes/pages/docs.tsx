import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServerConnector } from '@/components/shared/server-connector';
import type { ServerConnectionData } from '@/components/shared/server-connector';
import { api } from '@/lib/api';
import { FileOutput, Copy, Download, ArrowLeft } from 'lucide-react';

type Phase = 'setup' | 'results';

export function DocsPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [format, setFormat] = useState<'markdown' | 'html'>('markdown');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleConnect(data: ServerConnectionData) {
    setConnecting(true);
    setError(null);

    try {
      const res = await api.docs.generate({ ...data, format });
      setContent(res.data.content);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
    }
    setConnecting(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const filename = format === 'html' ? 'index.html' : 'README.md';
    const mimeType = format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleBack() {
    setPhase('setup');
    setContent('');
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileOutput className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Documentation</h2>
      </div>

      {phase === 'setup' && (
        <ServerConnector
          title="Generate Documentation"
          onConnect={handleConnect}
          connecting={connecting}
          error={error}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ServerConnector>
      )}

      {phase === 'results' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Documentation ({format.toUpperCase()})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto rounded-md bg-muted p-4 text-sm">
              <code>{content}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
