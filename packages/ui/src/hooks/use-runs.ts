import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRuns(limit?: number) {
  return useQuery({
    queryKey: ['runs', limit],
    queryFn: () => api.runs.list(limit),
    refetchInterval: 5000, // Poll for updates
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: () => api.runs.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === 'running' ? 2000 : false;
    },
  });
}

export function useTriggerRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { collectionId: string; environment?: string; tags?: string[]; parallelism?: number }) =>
      api.runs.trigger(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });
}

export function useDeleteRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.runs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });
}
