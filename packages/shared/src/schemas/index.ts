import { z } from 'zod';

export {
  createServerSchema,
  updateServerSchema,
  createCollectionSchema,
  updateCollectionSchema,
  triggerRunSchema,
  inspectConnectSchema,
  inspectCallSchema,
} from './api.js';

export const serverConfigSchema = z.union([
  z.string(),
  z.object({
    name: z.string().optional(),
    transport: z.enum(['stdio', 'sse', 'streamable-http']).default('stdio'),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeouts: z
      .object({
        connect: z.number().optional(),
        call: z.number().optional(),
      })
      .optional(),
  }),
]);

export const simpleExpectationSchema = z.union([
  z.object({ exists: z.string() }),
  z.object({ equals: z.tuple([z.string(), z.unknown()]) }),
  z.object({ contains: z.tuple([z.string(), z.unknown()]) }),
  z.object({ matches: z.tuple([z.string(), z.string()]) }),
]);

export const assertionDefinitionSchema = z.object({
  type: z.enum([
    'schema',
    'equals',
    'contains',
    'exists',
    'matches',
    'type',
    'length',
    'latency',
    'mimeType',
    'expression',
  ]),
  path: z.string().optional(),
  value: z.unknown().optional(),
  expected: z.unknown().optional(),
  pattern: z.string().optional(),
  maxMs: z.number().optional(),
  operator: z.string().optional(),
  expr: z.string().optional(),
});

export const extractionSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const testDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  tags: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  retries: z.number().optional(),
  type: z.enum(['tool', 'resource']).optional(),
  tool: z.string().optional(),
  call: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  with: z.record(z.unknown()).optional(),
  assertions: z.array(assertionDefinitionSchema).optional(),
  expect: z.array(z.record(z.unknown())).optional(),
  expectError: z.boolean().optional(),
  extract: z.array(extractionSchema).optional(),
});

export const environmentSchema = z.object({
  variables: z.record(z.string()),
});

export const collectionSchema = z.object({
  schemaVersion: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  server: serverConfigSchema,
  environments: z.record(environmentSchema).optional(),
  defaultEnvironment: z.string().optional(),
  tests: z.array(testDefinitionSchema).min(1),
});

export const timeoutConfigSchema = z.object({
  test: z.number().default(30000),
  mcpCall: z.number().default(25000),
  transport: z.number().default(20000),
  assertion: z.number().default(5000),
  cleanup: z.number().default(5000),
});

export const rateLimitConfigSchema = z.object({
  maxCallsPerSecond: z.number().default(10),
  maxConcurrent: z.number().default(5),
  backoff: z.object({
    initial: z.number().default(1000),
    multiplier: z.number().default(2),
    max: z.number().default(30000),
  }),
});
