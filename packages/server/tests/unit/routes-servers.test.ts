import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { Database } from '../../src/db/database.js';
import { serversRoutes } from '../../src/routes/servers.js';

describe('servers routes', () => {
  let db: Database;
  let app: Hono;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    app = new Hono();
    serversRoutes(app, db);
  });

  afterEach(() => {
    db.close();
  });

  it('GET /api/servers returns empty list', async () => {
    const res = await app.request('/api/servers');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('POST /api/servers creates a server', async () => {
    const res = await app.request('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', transport: 'stdio', command: 'echo' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Test');
    expect(body.data.id).toBeDefined();
  });

  it('POST /api/servers validates input', async () => {
    const res = await app.request('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transport: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/servers/:id returns server', async () => {
    const createRes = await app.request('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Srv', transport: 'stdio' }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/servers/${data.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Srv');
  });

  it('GET /api/servers/:id returns 404 for missing', async () => {
    const res = await app.request('/api/servers/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PUT /api/servers/:id updates a server', async () => {
    const createRes = await app.request('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Old', transport: 'stdio' }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/servers/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('New');
  });

  it('DELETE /api/servers/:id deletes a server', async () => {
    const createRes = await app.request('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Del', transport: 'stdio' }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/servers/${data.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/servers/${data.id}`);
    expect(getRes.status).toBe(404);
  });
});
