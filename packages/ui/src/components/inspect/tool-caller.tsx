import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchemaForm } from './schema-form';
import { JsonViewer } from './json-viewer';
import { api } from '@/lib/api';

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
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentTool = tools.find((t) => t.name === selectedTool);

  async function handleCall(input: Record<string, unknown>) {
    if (!selectedTool) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.inspect.call(sessionId, selectedTool, input);
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call failed');
    }
    setLoading(false);
  }

  // Build a schema for the form — use the tool's inputSchema or an empty fallback
  const formSchema = currentTool?.inputSchema ?? { type: 'object', properties: {} };

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

      {currentTool && (
        <SchemaForm
          key={currentTool.name}
          schema={formSchema}
          onSubmit={handleCall}
          loading={loading}
        />
      )}

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
