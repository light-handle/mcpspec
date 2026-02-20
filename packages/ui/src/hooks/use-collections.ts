import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => api.collections.list(),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ['collections', id],
    queryFn: () => api.collections.get(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; yaml: string }) => api.collections.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; yaml?: string } }) =>
      api.collections.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.collections.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useValidateCollection() {
  return useMutation({
    mutationFn: (id: string) => api.collections.validate(id),
  });
}
