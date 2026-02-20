import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JsonViewer } from './json-viewer';
import { api } from '@/lib/api';
import { Play, Loader2 } from 'lucide-react';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ToolCallerProps {
  sessionId: string;
  tools: Tool[];
}

export function ToolCaller({ sessionId, tools }: ToolCallerProps) {
  const [selectedTool, setSelectedTool] = useState('');
  const [inputJson, setInputJson] = useState('{}');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentTool = tools.find((t) => t.name === selectedTool);

  async function handleCall() {
    if (!selectedTool) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const input = JSON.parse(inputJson);
      const response = await api.inspect.call(sessionId, selectedTool, input);
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call failed');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Tool</label>
        <Select value={selectedTool} onValueChange={(v) => {
          setSelectedTool(v);
          setResult(null);
          setError(null);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a tool" />
          </SelectTrigger>
          <SelectContent>
            {tools.map((t) => (
              <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentTool?.description && (
          <p className="text-xs text-muted-foreground mt-1">{currentTool.description}</p>
        )}
      </div>

      {currentTool?.inputSchema && (
        <div>
          <label className="text-sm font-medium">Schema</label>
          <JsonViewer data={currentTool.inputSchema} />
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Input (JSON)</label>
        <Textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          className="font-mono text-xs"
          rows={4}
        />
      </div>

      <Button onClick={handleCall} disabled={!selectedTool || loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
        Call Tool
      </Button>

      {error != null && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {result != null && (
        <div>
          <label className="text-sm font-medium">Result</label>
          <JsonViewer data={result} />
        </div>
      )}
    </div>
  );
}
