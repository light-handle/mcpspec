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
