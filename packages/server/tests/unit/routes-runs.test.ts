import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { Database } from '../../src/db/database.js';
import { runsRoutes } from '../../src/routes/runs.js';

describe('runs routes', () => {
  let db: Database;
  let app: Hono;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    app = new Hono();
    runsRoutes(app, db);
  });

  afterEach(() => {
    db.close();
  });

  it('GET /api/runs returns empty list', async () => {
    const res = await app.request('/api/runs');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('GET /api/runs/:id returns 404 for missing run', async () => {
    const res = await app.request('/api/runs/nonexistent');
    expect(res.status).toBe(404);
  });

  it('POST /api/runs returns 404 when collection not found', async () => {
    const res = await app.request('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('POST /api/runs validates input', async () => {
    const res = await app.request('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/runs/:id on existing run', async () => {
    // Directly create a run in the DB
    const run = db.createRun({ collectionName: 'Test' });

    const res = await app.request(`/api/runs/${run.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/runs/${run.id}`);
    expect(getRes.status).toBe(404);
  });

  it('GET /api/runs/:id returns a manually created run', async () => {
    const run = db.createRun({ collectionName: 'Manual' });
    db.updateRun(run.id, {
      status: 'completed',
      summary: { total: 1, passed: 1, failed: 0, skipped: 0, errors: 0, duration: 100 },
    });

    const res = await app.request(`/api/runs/${run.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('completed');
    expect(body.data.summary.total).toBe(1);
  });
});
