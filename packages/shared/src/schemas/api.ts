import { z } from 'zod';

export const createServerSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export const updateServerSchema = createServerSchema.partial();

export const createCollectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  yaml: z.string().min(1),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const triggerRunSchema = z.object({
  collectionId: z.string().min(1),
  serverId: z.string().optional(),
  environment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parallelism: z.number().int().min(1).optional(),
});

export const inspectConnectSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export const inspectCallSchema = z.object({
  sessionId: z.string().min(1),
  tool: z.string().min(1),
  input: z.record(z.unknown()).optional(),
});

export const auditStartSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  mode: z.enum(['passive', 'active', 'aggressive']).default('passive'),
  rules: z.array(z.string()).optional(),
  excludeTools: z.array(z.string()).optional(),
});

export const auditDryRunSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  mode: z.enum(['passive', 'active', 'aggressive']).default('passive'),
  rules: z.array(z.string()).optional(),
  excludeTools: z.array(z.string()).optional(),
});

export const benchmarkStartSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  tool: z.string().min(1),
  toolArgs: z.record(z.unknown()).default({}),
  iterations: z.number().int().min(1).default(100),
  warmup: z.number().int().min(0).default(5),
  timeout: z.number().int().min(1000).default(30000),
});

export const docsGenerateSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  format: z.enum(['markdown', 'html']).default('markdown'),
});

export const saveRecordingSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  serverName: z.string().optional(),
  data: z.string().min(1),
});

export const replayRecordingSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export const saveInspectRecordingSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const scoreCalculateSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
});
