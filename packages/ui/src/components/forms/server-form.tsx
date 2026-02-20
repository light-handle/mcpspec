import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const serverFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.string().optional(), // comma-separated, parsed to array
  url: z.string().optional(),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

interface ServerFormProps {
  defaultValues?: Partial<ServerFormValues>;
  onSubmit: (data: { name: string; transport: 'stdio' | 'sse' | 'streamable-http'; command?: string; args?: string[]; url?: string }) => void;
  loading?: boolean;
}

export function ServerForm({ defaultValues, onSubmit, loading }: ServerFormProps) {
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: '',
      transport: 'stdio',
      ...defaultValues,
    },
  });

  const transport = form.watch('transport');

  function handleSubmit(values: ServerFormValues) {
    onSubmit({
      name: values.name,
      transport: values.transport,
      command: values.command || undefined,
      args: values.args ? values.args.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      url: values.url || undefined,
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input {...form.register('name')} placeholder="My MCP Server" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Transport</label>
        <Select value={transport} onValueChange={(v) => form.setValue('transport', v as ServerFormValues['transport'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stdio">stdio</SelectItem>
            <SelectItem value="sse">SSE</SelectItem>
            <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transport === 'stdio' ? (
        <>
          <div>
            <label className="text-sm font-medium">Command</label>
            <Input {...form.register('command')} placeholder="npx" />
          </div>
          <div>
            <label className="text-sm font-medium">Arguments (comma-separated)</label>
            <Input {...form.register('args')} placeholder="@modelcontextprotocol/server-filesystem, /tmp" />
          </div>
        </>
      ) : (
        <div>
          <label className="text-sm font-medium">URL</label>
          <Input {...form.register('url')} placeholder="http://localhost:3000/sse" />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Save Server'}
      </Button>
    </form>
  );
}
