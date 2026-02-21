import type { Writable, Readable } from 'node:stream';

// Connection types
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting'
  | 'error';

export interface ConnectionConfig {
  maxReconnectAttempts: number;
  reconnectBackoff: 'exponential';
  initialReconnectDelay: number;
  maxReconnectDelay: number;
}

// Process types
export interface ProcessConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ManagedProcess {
  id: string;
  pid: number;
  command: string;
  args: string[];
  startedAt: Date;
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
}

// Timeout types
export interface TimeoutConfig {
  test: number;
  mcpCall: number;
  transport: number;
  assertion: number;
  cleanup: number;
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  test: 30000,
  mcpCall: 25000,
  transport: 20000,
  assertion: 5000,
  cleanup: 5000,
};

// Rate limiting types
export interface RateLimitConfig {
  maxCallsPerSecond: number;
  maxConcurrent: number;
  backoff: {
    initial: number;
    multiplier: number;
    max: number;
  };
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxCallsPerSecond: 10,
  maxConcurrent: 5,
  backoff: {
    initial: 1000,
    multiplier: 2,
    max: 30000,
  },
};

// Transport types
export type TransportType = 'stdio' | 'sse' | 'streamable-http';

// Server config types
export interface ServerConfig {
  name?: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  timeouts?: Partial<TimeoutConfig>;
}

// Collection types
export interface CollectionDefinition {
  schemaVersion?: string;
  name: string;
  description?: string;
  server: string | ServerConfig;
  environments?: Record<string, EnvironmentDefinition>;
  defaultEnvironment?: string;
  tests: TestDefinition[];
}

export interface EnvironmentDefinition {
  variables: Record<string, string>;
}

export interface TestDefinition {
  id?: string;
  name: string;
  tags?: string[];
  timeout?: number;
  retries?: number;
  type?: 'tool' | 'resource';
  tool?: string;
  call?: string;
  input?: Record<string, unknown>;
  with?: Record<string, unknown>;
  assertions?: AssertionDefinition[];
  expect?: SimpleExpectation[];
  expectError?: boolean;
  extract?: ExtractionDefinition[];
}

export type SimpleExpectation = { exists: string } | { equals: [string, unknown] } | { contains: [string, unknown] } | { matches: [string, string] };

export interface AssertionDefinition {
  type: AssertionType;
  path?: string;
  value?: unknown;
  expected?: unknown;
  pattern?: string;
  maxMs?: number;
  operator?: string;
  expr?: string;
}

export type AssertionType =
  | 'schema'
  | 'equals'
  | 'contains'
  | 'exists'
  | 'matches'
  | 'type'
  | 'length'
  | 'latency'
  | 'mimeType'
  | 'expression';

export interface ExtractionDefinition {
  name: string;
  path: string;
}

// Test result types
export interface TestRunResult {
  id: string;
  collectionName: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  results: TestResult[];
  summary: TestSummary;
}

export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  assertions: AssertionResult[];
  error?: string;
  extractedVariables?: Record<string, unknown>;
}

export interface AssertionResult {
  type: AssertionType;
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  duration: number;
}

// Reporter types
export type ReporterType = 'console' | 'json' | 'junit' | 'html' | 'tap';

// Security types
export type SecurityScanMode = 'passive' | 'active' | 'aggressive';
export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityFinding {
  id: string;
  rule: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  evidence?: string;
  remediation?: string;
}

// MCP Score types
export interface MCPScore {
  overall: number;
  categories: {
    documentation: number;
    errorHandling: number;
    schemaQuality: number;
    performance: number;
    security: number;
  };
}

// WebSocket types  
export type WSClientMessage =
  | { type: 'subscribe'; channel: string }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'ping' };

export type WSServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'event'; channel: string; event: string; data: unknown }
  | { type: 'pong' };

// Error template types
export interface ErrorTemplate {
  title: string;
  description: string;
  suggestions: string[];
  docs?: string;
}

// Protocol log types
export type { ProtocolLogEntry, MessageDirection } from './protocol-log.js';

// API types
export type {
  SavedServerConnection,
  SavedCollection,
  TestRunRecord,
  ApiResponse,
  ApiListResponse,
  ApiError,
} from './api.js';
