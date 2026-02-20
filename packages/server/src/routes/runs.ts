import type { Hono } from 'hono';
import type { Database } from '../db/database.js';
import { triggerRunSchema, collectionSchema } from '@mcpspec/shared';
import { loadYamlSafely, TestRunner } from '@mcpspec/core';
import type { TestRunReporter } from '@mcpspec/core';
import type { TestResult, TestRunResult, CollectionDefinition } from '@mcpspec/shared';

export function runsRoutes(app: Hono, db: Database): void {
  app.get('/api/runs', (c) => {
    const limit = Number(c.req.query('limit') ?? '50');
    const runs = db.listRuns(limit);
    return c.json({ data: runs, total: runs.length });
  });

  app.post('/api/runs', async (c) => {
    const body = await c.req.json();
    const parsed = triggerRunSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }

    const collection = db.getCollection(parsed.data.collectionId);
    if (!collection) {
      return c.json({ error: 'not_found', message: 'Collection not found' }, 404);
    }

    // Parse and validate YAML
    let collectionDef: CollectionDefinition;
    try {
      const raw = loadYamlSafely(collection.yaml) as Record<string, unknown>;
      const validated = collectionSchema.parse(raw);
      collectionDef = coerceCollection(validated as unknown as Record<string, unknown>);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid collection YAML';
      return c.json({ error: 'validation_error', message }, 400);
    }

    // Create run record
    const run = db.createRun({
      collectionId: collection.id,
      collectionName: collectionDef.name,
      serverId: parsed.data.serverId,
    });

    // Execute test run asynchronously
    executeRunInBackground(db, run.id, collectionDef, {
      environment: parsed.data.environment,
      tags: parsed.data.tags,
      parallelism: parsed.data.parallelism,
    });

    return c.json({ data: run }, 202);
  });

  app.get('/api/runs/:id', (c) => {
    const run = db.getRun(c.req.param('id'));
    if (!run) return c.json({ error: 'not_found', message: 'Run not found' }, 404);
    return c.json({ data: run });
  });

  app.delete('/api/runs/:id', (c) => {
    const deleted = db.deleteRun(c.req.param('id'));
    if (!deleted) return c.json({ error: 'not_found', message: 'Run not found' }, 404);
    return c.json({ data: { deleted: true } });
  });
}

function executeRunInBackground(
  db: Database,
  runId: string,
  collection: CollectionDefinition,
  options: { environment?: string; tags?: string[]; parallelism?: number },
): void {
  const runner = new TestRunner();
  const results: TestResult[] = [];

  const reporter: TestRunReporter = {
    onRunStart() {},
    onTestStart() {},
    onTestComplete(result: TestResult) {
      results.push(result);
    },
    onRunComplete(runResult: TestRunResult) {
      db.updateRun(runId, {
        status: 'completed',
        summary: runResult.summary,
        results: runResult.results,
        completedAt: new Date().toISOString(),
        duration: runResult.duration,
      });
    },
  };

  runner
    .run(collection, {
      reporter,
      environment: options.environment,
      tags: options.tags,
      parallelism: options.parallelism,
    })
    .catch((err) => {
      db.updateRun(runId, {
        status: 'failed',
        results,
        completedAt: new Date().toISOString(),
      });
      console.error(`Run ${runId} failed:`, err instanceof Error ? err.message : err);
    });
}

// Coerce YAML FAILSAFE_SCHEMA string values to correct types
function coerceCollection(raw: Record<string, unknown>): CollectionDefinition {
  const tests = raw['tests'] as Record<string, unknown>[];
  return {
    ...raw,
    tests: tests.map((t) => ({
      ...t,
      timeout: t['timeout'] !== undefined ? Number(t['timeout']) : undefined,
      retries: t['retries'] !== undefined ? Number(t['retries']) : undefined,
      expectError: t['expectError'] !== undefined ? t['expectError'] === 'true' || t['expectError'] === true : undefined,
    })),
  } as CollectionDefinition;
}
