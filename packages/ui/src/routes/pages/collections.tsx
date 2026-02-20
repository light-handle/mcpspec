import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CollectionEditor } from '@/components/collections/collection-editor';
import { useCollections, useCreateCollection, useDeleteCollection, useUpdateCollection, useValidateCollection } from '@/hooks/use-collections';
import { useTriggerRun } from '@/hooks/use-runs';
import { routerInstance } from '../route-tree';
import { Plus, Trash2, Edit, Play, CheckCircle, XCircle } from 'lucide-react';

const DEFAULT_YAML = `name: My Tests
server: npx @modelcontextprotocol/server-filesystem /tmp

tests:
  - name: List tools
    call: list_directory
    with:
      path: /tmp
    expect:
      - exists: $.content
`;

export function CollectionsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [yaml, setYaml] = useState(DEFAULT_YAML);
  const [editYaml, setEditYaml] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors?: unknown[] } | null>(null);

  const collections = useCollections();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const validateCollection = useValidateCollection();
  const triggerRun = useTriggerRun();

  async function handleCreate() {
    await createCollection.mutateAsync({ name, yaml });
    setCreateOpen(false);
    setName('');
    setYaml(DEFAULT_YAML);
  }

  async function handleValidate(id: string) {
    const result = await validateCollection.mutateAsync(id);
    setValidationResult(result.data);
  }

  async function handleRun(id: string) {
    const result = await triggerRun.mutateAsync({ collectionId: id });
    routerInstance.navigate({ to: '/runs/$runId', params: { runId: result.data.id } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Collections</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Collection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" />
              </div>
              <div>
                <label className="text-sm font-medium">YAML</label>
                <CollectionEditor value={yaml} onChange={setYaml} />
              </div>
              <Button onClick={handleCreate} disabled={!name || createCollection.isPending} className="w-full">
                {createCollection.isPending ? 'Creating...' : 'Create Collection'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No collections yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.data?.data.map((coll) => (
                  <TableRow key={coll.id}>
                    <TableCell className="font-medium">{coll.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{coll.description ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(coll.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditId(coll.id); setEditYaml(coll.yaml); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleRun(coll.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCollection.mutate(coll.id)}>
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

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => { if (!o) setEditId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <CollectionEditor
            value={editYaml}
            onChange={setEditYaml}
            onValidate={() => editId && handleValidate(editId)}
            validating={validateCollection.isPending}
            onSave={async () => {
              if (editId) {
                await updateCollection.mutateAsync({ id: editId, data: { yaml: editYaml } });
                setEditId(null);
              }
            }}
            saving={updateCollection.isPending}
            onRun={() => editId && handleRun(editId)}
          />
          {validationResult && (
            <div className="flex items-center gap-2 mt-2">
              {validationResult.valid ? (
                <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Valid</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Invalid</Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
