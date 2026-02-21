import { useState, useEffect, useRef } from 'react';
import type { ProtocolLogEntry } from '@mcpspec/shared';
import { Button } from '@/components/ui/button';
import { ProtocolTable } from './protocol-log';
import { Trash2 } from 'lucide-react';

const TAIL_SIZE = 20;

interface ProtocolTailProps {
  entries: ProtocolLogEntry[];
}

export function ProtocolTail({ entries }: ProtocolTailProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = clearedAt ? entries.filter((e) => e.timestamp > clearedAt) : entries;
  const tail = visible.slice(-TAIL_SIZE);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Protocol Log (last {TAIL_SIZE})</p>
        <Button size="sm" variant="ghost" onClick={() => setClearedAt(Date.now())} title="Clear log" className="h-6 px-2">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div ref={scrollRef} className="rounded-md border overflow-auto max-h-[250px]">
        <ProtocolTable
          entries={tail}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
      </div>
    </div>
  );
}
