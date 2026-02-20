import type { Hono } from 'hono';
import type { Database } from '../db/database.js';
import { createCollectionSchema, updateCollectionSchema, collectionSchema } from '@mcpspec/shared';
import { loadYamlSafely } from '@mcpspec/core';

export function collectionsRoutes(app: Hono, db: Database): void {
  app.get('/api/collections', (c) => {
    const collections = db.listCollections();
    return c.json({ data: collections, total: collections.length });
  });

  app.post('/api/collections', async (c) => {
    const body = await c.req.json();
    const parsed = createCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }
    const collection = db.createCollection(parsed.data);
    return c.json({ data: collection }, 201);
  });

  app.get('/api/collections/:id', (c) => {
    const collection = db.getCollection(c.req.param('id'));
    if (!collection) return c.json({ error: 'not_found', message: 'Collection not found' }, 404);
    return c.json({ data: collection });
  });

  app.put('/api/collections/:id', async (c) => {
    const body = await c.req.json();
    const parsed = updateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: parsed.error.message }, 400);
    }
    const collection = db.updateCollection(c.req.param('id'), parsed.data);
    if (!collection) return c.json({ error: 'not_found', message: 'Collection not found' }, 404);
    return c.json({ data: collection });
  });

  app.delete('/api/collections/:id', (c) => {
    const deleted = db.deleteCollection(c.req.param('id'));
    if (!deleted) return c.json({ error: 'not_found', message: 'Collection not found' }, 404);
    return c.json({ data: { deleted: true } });
  });

  app.post('/api/collections/:id/validate', (c) => {
    const collection = db.getCollection(c.req.param('id'));
    if (!collection) return c.json({ error: 'not_found', message: 'Collection not found' }, 404);

    try {
      const yamlContent = loadYamlSafely(collection.yaml) as Record<string, unknown>;
      const result = collectionSchema.safeParse(yamlContent);
      if (!result.success) {
        return c.json({ data: { valid: false, errors: result.error.issues } });
      }
      return c.json({ data: { valid: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'YAML parse error';
      return c.json({ data: { valid: false, errors: [{ message }] } });
    }
  });
}
