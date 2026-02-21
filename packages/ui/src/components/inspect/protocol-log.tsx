import { useState, useEffect, useRef } from 'react';
import type { ProtocolLogEntry, MessageDirection } from '@mcpspec/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JsonViewer } from './json-viewer';
import { ArrowDown, ArrowUp, Trash2, ArrowDownToLine } from 'lucide-react';

interface ProtocolLogProps {
  entries: ProtocolLogEntry[];
}

export function ProtocolLog({ entries }: ProtocolLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<'all' | MessageDirection>('all');
  const [methodSearch, setMethodSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearedAt, setClearedAt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = clearedAt ? entries.filter((e) => e.timestamp > clearedAt) : entries;

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible, autoScroll]);

  // Apply filters
  const filtered = visible.filter((e) => {
    if (directionFilter !== 'all' && e.direction !== directionFilter) return false;
    if (methodSearch && !(e.method ?? '').toLowerCase().includes(methodSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as typeof directionFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="outgoing">Outgoing</SelectItem>
            <SelectItem value="incoming">Incoming</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-[200px]"
          placeholder="Filter by method..."
          value={methodSearch}
          onChange={(e) => setMethodSearch(e.target.value)}
        />
        <div className="flex-1" />
        <Button
          size="sm"
          variant={autoScroll ? 'default' : 'outline'}
          onClick={() => setAutoScroll(!autoScroll)}
          title="Auto-scroll"
        >
          <ArrowDownToLine className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setClearedAt(Date.now())} title="Clear log">
          <Trash2 className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} / {visible.length} messages</span>
      </div>

      {/* Log table */}
      <div ref={scrollRef} className="rounded-md border overflow-auto max-h-[600px]">
        <ProtocolTable entries={filtered} expandedId={expandedId} onToggle={(id) => setExpandedId(expandedId === id ? null : id)} />
      </div>
    </div>
  );
}

/** Shared table used by both ProtocolLog and ProtocolTail */
export function ProtocolTable({ entries, expandedId, onToggle }: { entries: ProtocolLogEntry[]; expandedId?: string | null; onToggle?: (id: string) => void }) {
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
        <tr className="border-b">
          <th className="text-left px-3 py-2 font-medium">Time</th>
          <th className="text-left px-3 py-2 font-medium w-10">Dir</th>
          <th className="text-left px-3 py-2 font-medium">Method</th>
          <th className="text-left px-3 py-2 font-medium w-16">ID</th>
          <th className="text-right px-3 py-2 font-medium w-16">RTT</th>
          <th className="text-right px-3 py-2 font-medium w-16">Size</th>
        </tr>
      </thead>
      <tbody>
        {entries.length === 0 ? (
          <tr>
            <td colSpan={6} className="text-center py-8 text-muted-foreground">
              No protocol messages yet.
            </td>
          </tr>
        ) : (
          entries.map((entry) => (
            <tr key={entry.id} className="group">
              <td colSpan={6} className="p-0">
                <button
                  onClick={() => onToggle?.(entry.id)}
                  className="w-full text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="grid grid-cols-[auto_40px_1fr_64px_64px_64px] items-center px-3 py-1.5">
                    <span className="font-mono text-muted-foreground pr-3">{formatTime(entry.timestamp)}</span>
                    <span>
                      {entry.direction === 'outgoing' ? (
                        <ArrowUp className="h-3 w-3 text-blue-500" />
                      ) : (
                        <ArrowDown className={`h-3 w-3 ${entry.isError ? 'text-red-500' : 'text-green-500'}`} />
                      )}
                    </span>
                    <span className="truncate">
                      {entry.method ? (
                        <span className="font-medium">{entry.method}</span>
                      ) : entry.isError ? (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">error</Badge>
                      ) : (
                        <span className="text-muted-foreground">response</span>
                      )}
                    </span>
                    <span className="text-right font-mono text-muted-foreground">
                      {entry.jsonrpcId != null ? String(entry.jsonrpcId) : ''}
                    </span>
                    <span className="text-right font-mono text-muted-foreground">
                      {entry.roundTripMs != null ? `${entry.roundTripMs}ms` : ''}
                    </span>
                    <span className="text-right font-mono text-muted-foreground">
                      {formatBytes(messageSize(entry.message))}
                    </span>
                  </div>
                </button>
                {expandedId === entry.id && (
                  <div className="px-3 pb-3">
                    <JsonViewer data={entry.message} />
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
}

function messageSize(msg: Record<string, unknown>) {
  try {
    return new Blob([JSON.stringify(msg)]).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
