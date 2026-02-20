import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../src/db/database.js';

describe('Database', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(); // In-memory (no path)
    await db.init();
  });

  afterEach(() => {
    db.close();
  });

  describe('server_connections', () => {
    it('should create and retrieve a server', () => {
      const server = db.createServer({
        name: 'Test Server',
        transport: 'stdio',
        command: 'npx',
        args: ['my-server'],
      });

      expect(server.id).toBeDefined();
      expect(server.name).toBe('Test Server');
      expect(server.transport).toBe('stdio');
      expect(server.command).toBe('npx');
      expect(server.args).toEqual(['my-server']);

      const fetched = db.getServer(server.id);
      expect(fetched).toEqual(server);
    });

    it('should list servers', () => {
      db.createServer({ name: 'Server A', transport: 'stdio' });
      db.createServer({ name: 'Server B', transport: 'sse', url: 'http://localhost:3000' });

      const servers = db.listServers();
      expect(servers).toHaveLength(2);
    });

    it('should update a server', () => {
      const server = db.createServer({ name: 'Old Name', transport: 'stdio' });
      const updated = db.updateServer(server.id, { name: 'New Name' });

      expect(updated?.name).toBe('New Name');
      expect(updated?.transport).toBe('stdio');
    });

    it('should delete a server', () => {
      const server = db.createServer({ name: 'To Delete', transport: 'stdio' });
      expect(db.deleteServer(server.id)).toBe(true);
      expect(db.getServer(server.id)).toBeNull();
    });

    it('should return null for non-existent server', () => {
      expect(db.getServer('nonexistent')).toBeNull();
    });

    it('should return false when deleting non-existent server', () => {
      expect(db.deleteServer('nonexistent')).toBe(false);
    });
  });

  describe('collections', () => {
    it('should create and retrieve a collection', () => {
      const coll = db.createCollection({
        name: 'Test Collection',
        yaml: 'name: test\nserver: echo\ntests:\n  - name: t1\n    call: foo',
      });

      expect(coll.id).toBeDefined();
      expect(coll.name).toBe('Test Collection');
      expect(coll.yaml).toContain('name: test');

      const fetched = db.getCollection(coll.id);
      expect(fetched).toEqual(coll);
    });

    it('should update a collection', () => {
      const coll = db.createCollection({ name: 'Old', yaml: 'yaml here' });
      const updated = db.updateCollection(coll.id, { name: 'New', description: 'A description' });

      expect(updated?.name).toBe('New');
      expect(updated?.description).toBe('A description');
    });

    it('should delete a collection', () => {
      const coll = db.createCollection({ name: 'Del', yaml: 'yaml' });
      expect(db.deleteCollection(coll.id)).toBe(true);
      expect(db.getCollection(coll.id)).toBeNull();
    });
  });

  describe('test_runs', () => {
    it('should create a run with running status', () => {
      const run = db.createRun({ collectionName: 'My Collection' });

      expect(run.id).toBeDefined();
      expect(run.status).toBe('running');
      expect(run.collectionName).toBe('My Collection');
    });

    it('should update a run with results', () => {
      const run = db.createRun({ collectionName: 'Test' });
      const updated = db.updateRun(run.id, {
        status: 'completed',
        summary: { total: 2, passed: 1, failed: 1, skipped: 0, errors: 0, duration: 500 },
        results: [
          { testId: 't1', testName: 'Test 1', status: 'passed', duration: 100, assertions: [] },
          { testId: 't2', testName: 'Test 2', status: 'failed', duration: 200, assertions: [] },
        ],
        completedAt: new Date().toISOString(),
        duration: 500,
      });

      expect(updated?.status).toBe('completed');
      expect(updated?.summary?.total).toBe(2);
      expect(updated?.results).toHaveLength(2);
    });

    it('should list runs', () => {
      db.createRun({ collectionName: 'First' });
      db.createRun({ collectionName: 'Second' });

      const runs = db.listRuns();
      expect(runs).toHaveLength(2);
      const names = runs.map((r) => r.collectionName);
      expect(names).toContain('First');
      expect(names).toContain('Second');
    });

    it('should delete a run', () => {
      const run = db.createRun({ collectionName: 'Del' });
      expect(db.deleteRun(run.id)).toBe(true);
      expect(db.getRun(run.id)).toBeNull();
    });
  });
});
