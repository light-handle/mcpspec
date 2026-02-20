interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <pre className="rounded-md border bg-muted/50 p-4 text-xs font-mono overflow-auto max-h-96">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
