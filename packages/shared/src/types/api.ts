import type { TransportType, TestSummary, TestResult } from './index.js';

// Saved server connection (persisted in DB)
export interface SavedServerConnection {
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Saved collection (persisted in DB)
export interface SavedCollection {
  id: string;
  name: string;
  description?: string;
  yaml: string; // Raw YAML content
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Test run record (persisted in DB)
export interface TestRunRecord {
  id: string;
  collectionId?: string;
  collectionName: string;
  serverId?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  summary?: TestSummary;
  results?: TestResult[];
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  duration?: number;
}

// Saved recording (persisted in DB)
export interface SavedRecording {
  id: string;
  name: string;
  description?: string;
  serverName?: string;
  data: string; // JSON-serialized Recording
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
