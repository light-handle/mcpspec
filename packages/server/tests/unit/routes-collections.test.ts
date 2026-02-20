import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { Database } from '../../src/db/database.js';
import { collectionsRoutes } from '../../src/routes/collections.js';

describe('collections routes', () => {
  let db: Database;
  let app: Hono;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    app = new Hono();
    collectionsRoutes(app, db);
  });

  afterEach(() => {
    db.close();
  });

  const validYaml = `name: Test Collection
server: echo hello
tests:
  - name: Echo test
    call: echo
    with:
      message: hello`;

  it('GET /api/collections returns empty list', async () => {
    const res = await app.request('/api/collections');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('POST /api/collections creates a collection', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Tests', yaml: validYaml }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('My Tests');
  });

  it('POST /api/collections validates input', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/collections/:id returns collection', async () => {
    const createRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'C1', yaml: validYaml }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/collections/${data.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('C1');
  });

  it('PUT /api/collections/:id updates collection', async () => {
    const createRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Old', yaml: validYaml }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/collections/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated');
  });

  it('DELETE /api/collections/:id deletes collection', async () => {
    const createRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Del', yaml: validYaml }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/collections/${data.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('POST /api/collections/:id/validate validates YAML', async () => {
    const createRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid', yaml: validYaml }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/collections/${data.id}/validate`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(true);
  });

  it('POST /api/collections/:id/validate catches invalid YAML', async () => {
    const createRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid', yaml: 'not valid yaml: [' }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/collections/${data.id}/validate`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBe(false);
  });
});
