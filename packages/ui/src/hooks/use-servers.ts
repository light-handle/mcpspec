import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SavedServerConnection } from '@mcpspec/shared';

export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => api.servers.list(),
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ['servers', id],
    queryFn: () => api.servers.get(id),
    enabled: !!id,
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SavedServerConnection>) => api.servers.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SavedServerConnection> }) => api.servers.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.servers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => api.servers.test(id),
  });
}
