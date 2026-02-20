import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { localhostOnly } from '../../src/middleware/localhost-only.js';

describe('localhostOnly middleware', () => {
  let originalRemoteAccess: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    originalRemoteAccess = process.env['MCPSPEC_REMOTE_ACCESS'];
    originalToken = process.env['MCPSPEC_TOKEN'];
    delete process.env['MCPSPEC_REMOTE_ACCESS'];
    delete process.env['MCPSPEC_TOKEN'];
  });

  afterEach(() => {
    if (originalRemoteAccess !== undefined) process.env['MCPSPEC_REMOTE_ACCESS'] = originalRemoteAccess;
    else delete process.env['MCPSPEC_REMOTE_ACCESS'];
    if (originalToken !== undefined) process.env['MCPSPEC_TOKEN'] = originalToken;
    else delete process.env['MCPSPEC_TOKEN'];
  });

  function createApp() {
    const app = new Hono();
    app.use('*', localhostOnly());
    app.get('/test', (c) => c.json({ ok: true }));
    return app;
  }

  it('should allow requests without x-forwarded-for (direct local)', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(200);
  });

  it('should reject requests from remote IPs', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '203.0.113.50' },
    });
    expect(res.status).toBe(403);
  });

  it('should allow localhost x-forwarded-for', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    expect(res.status).toBe(200);
  });

  it('should allow remote access when MCPSPEC_REMOTE_ACCESS=true', async () => {
    process.env['MCPSPEC_REMOTE_ACCESS'] = 'true';
    const app = createApp();
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '203.0.113.50' },
    });
    expect(res.status).toBe(200);
  });

  it('should require token when remote access is enabled with token', async () => {
    process.env['MCPSPEC_REMOTE_ACCESS'] = 'true';
    process.env['MCPSPEC_TOKEN'] = 'my-secret-token';
    const app = createApp();

    // Without token
    const res1 = await app.request('/test');
    expect(res1.status).toBe(401);

    // With wrong token
    const res2 = await app.request('/test', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(res2.status).toBe(401);

    // With correct token
    const res3 = await app.request('/test', {
      headers: { Authorization: 'Bearer my-secret-token' },
    });
    expect(res3.status).toBe(200);
  });
});
