import type {
  SavedServerConnection,
  SavedCollection,
  TestRunRecord,
  ProtocolLogEntry,
  ApiResponse,
  ApiListResponse,
} from '@mcpspec/shared';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Servers
export const api = {
  servers: {
    list: () => request<ApiListResponse<SavedServerConnection>>('/servers'),
    get: (id: string) => request<ApiResponse<SavedServerConnection>>(`/servers/${id}`),
    create: (data: Partial<SavedServerConnection>) =>
      request<ApiResponse<SavedServerConnection>>('/servers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<SavedServerConnection>) =>
      request<ApiResponse<SavedServerConnection>>(`/servers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<ApiResponse<{ deleted: boolean }>>(`/servers/${id}`, { method: 'DELETE' }),
    test: (id: string) =>
      request<ApiResponse<{ connected: boolean; toolCount?: number; error?: string }>>(
        `/servers/${id}/test`,
        { method: 'POST' },
      ),
  },

  collections: {
    list: () => request<ApiListResponse<SavedCollection>>('/collections'),
    get: (id: string) => request<ApiResponse<SavedCollection>>(`/collections/${id}`),
    create: (data: { name: string; description?: string; yaml: string }) =>
      request<ApiResponse<SavedCollection>>('/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<SavedCollection>) =>
      request<ApiResponse<SavedCollection>>(`/collections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<ApiResponse<{ deleted: boolean }>>(`/collections/${id}`, { method: 'DELETE' }),
    validate: (id: string) =>
      request<ApiResponse<{ valid: boolean; errors?: unknown[] }>>(`/collections/${id}/validate`, {
        method: 'POST',
      }),
  },

  runs: {
    list: (limit?: number) =>
      request<ApiListResponse<TestRunRecord>>(`/runs${limit ? `?limit=${limit}` : ''}`),
    get: (id: string) => request<ApiResponse<TestRunRecord>>(`/runs/${id}`),
    trigger: (data: { collectionId: string; environment?: string; tags?: string[]; parallelism?: number }) =>
      request<ApiResponse<TestRunRecord>>('/runs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<ApiResponse<{ deleted: boolean }>>(`/runs/${id}`, { method: 'DELETE' }),
  },

  inspect: {
    connect: (data: { transport: string; command?: string; args?: string[]; url?: string; env?: Record<string, string> }) =>
      request<ApiResponse<{ sessionId: string; connected: boolean }>>('/inspect/connect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    tools: (sessionId: string) =>
      request<{ data: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> }>(
        '/inspect/tools',
        { method: 'POST', body: JSON.stringify({ sessionId }) },
      ),
    call: (sessionId: string, tool: string, input?: Record<string, unknown>) =>
      request<ApiResponse<unknown>>('/inspect/call', {
        method: 'POST',
        body: JSON.stringify({ sessionId, tool, input }),
      }),
    resources: (sessionId: string) =>
      request<{ data: Array<{ uri: string; name?: string; description?: string; mimeType?: string }> }>(
        '/inspect/resources',
        { method: 'POST', body: JSON.stringify({ sessionId }) },
      ),
    messages: (sessionId: string, after?: number) =>
      request<{ data: ProtocolLogEntry[]; total: number }>('/inspect/messages', {
        method: 'POST',
        body: JSON.stringify({ sessionId, after }),
      }),
    disconnect: (sessionId: string) =>
      request<ApiResponse<{ disconnected: boolean }>>('/inspect/disconnect', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
  },
};
