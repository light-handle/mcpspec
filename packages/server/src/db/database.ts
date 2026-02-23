import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runMigrations } from './migrations.js';
import type {
  SavedServerConnection,
  SavedCollection,
  SavedRecording,
  TestRunRecord,
  TestSummary,
  TestResult,
} from '@mcpspec/shared';

export class Database {
  private db!: SqlJsDatabase;
  private dbPath: string | null;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? null;
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();

    if (this.dbPath && existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA journal_mode=WAL');
    this.db.run('PRAGMA foreign_keys=ON');
    runMigrations(this.db);
    this.save();
  }

  private save(): void {
    if (!this.dbPath) return;
    mkdirSync(dirname(this.dbPath), { recursive: true });
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  close(): void {
    this.db.close();
  }

  // --- Server Connections ---

  listServers(): SavedServerConnection[] {
    const stmt = this.db.prepare('SELECT * FROM server_connections ORDER BY updated_at DESC');
    const rows: SavedServerConnection[] = [];
    while (stmt.step()) {
      rows.push(this.rowToServer(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return rows;
  }

  getServer(id: string): SavedServerConnection | null {
    const stmt = this.db.prepare('SELECT * FROM server_connections WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = this.rowToServer(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return row;
  }

  createServer(data: Omit<SavedServerConnection, 'id' | 'createdAt' | 'updatedAt'>): SavedServerConnection {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO server_connections (id, name, transport, command, args, url, env, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.transport, data.command ?? null, data.args ? JSON.stringify(data.args) : null, data.url ?? null, data.env ? JSON.stringify(data.env) : null, now, now],
    );
    this.save();
    return this.getServer(id)!;
  }

  updateServer(id: string, data: Partial<Omit<SavedServerConnection, 'id' | 'createdAt' | 'updatedAt'>>): SavedServerConnection | null {
    const existing = this.getServer(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE server_connections SET name=?, transport=?, command=?, args=?, url=?, env=?, updated_at=? WHERE id=?`,
      [
        data.name ?? existing.name,
        data.transport ?? existing.transport,
        data.command !== undefined ? data.command ?? null : existing.command ?? null,
        data.args !== undefined ? (data.args ? JSON.stringify(data.args) : null) : (existing.args ? JSON.stringify(existing.args) : null),
        data.url !== undefined ? data.url ?? null : existing.url ?? null,
        data.env !== undefined ? (data.env ? JSON.stringify(data.env) : null) : (existing.env ? JSON.stringify(existing.env) : null),
        now,
        id,
      ],
    );
    this.save();
    return this.getServer(id);
  }

  deleteServer(id: string): boolean {
    const existing = this.getServer(id);
    if (!existing) return false;
    this.db.run('DELETE FROM server_connections WHERE id = ?', [id]);
    this.save();
    return true;
  }

  // --- Collections ---

  listCollections(): SavedCollection[] {
    const stmt = this.db.prepare('SELECT * FROM collections ORDER BY updated_at DESC');
    const rows: SavedCollection[] = [];
    while (stmt.step()) {
      rows.push(this.rowToCollection(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return rows;
  }

  getCollection(id: string): SavedCollection | null {
    const stmt = this.db.prepare('SELECT * FROM collections WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = this.rowToCollection(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return row;
  }

  createCollection(data: Omit<SavedCollection, 'id' | 'createdAt' | 'updatedAt'>): SavedCollection {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO collections (id, name, description, yaml, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description ?? null, data.yaml, now, now],
    );
    this.save();
    return this.getCollection(id)!;
  }

  updateCollection(id: string, data: Partial<Omit<SavedCollection, 'id' | 'createdAt' | 'updatedAt'>>): SavedCollection | null {
    const existing = this.getCollection(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE collections SET name=?, description=?, yaml=?, updated_at=? WHERE id=?`,
      [
        data.name ?? existing.name,
        data.description !== undefined ? data.description ?? null : existing.description ?? null,
        data.yaml ?? existing.yaml,
        now,
        id,
      ],
    );
    this.save();
    return this.getCollection(id);
  }

  deleteCollection(id: string): boolean {
    const existing = this.getCollection(id);
    if (!existing) return false;
    this.db.run('DELETE FROM collections WHERE id = ?', [id]);
    this.save();
    return true;
  }

  // --- Test Runs ---

  listRuns(limit = 50): TestRunRecord[] {
    const stmt = this.db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC LIMIT ?');
    stmt.bind([limit]);
    const rows: TestRunRecord[] = [];
    while (stmt.step()) {
      rows.push(this.rowToRun(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return rows;
  }

  getRun(id: string): TestRunRecord | null {
    const stmt = this.db.prepare('SELECT * FROM test_runs WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = this.rowToRun(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return row;
  }

  createRun(data: { collectionId?: string; collectionName: string; serverId?: string }): TestRunRecord {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO test_runs (id, collection_id, collection_name, server_id, status, started_at) VALUES (?, ?, ?, ?, 'running', ?)`,
      [id, data.collectionId ?? null, data.collectionName, data.serverId ?? null, now],
    );
    this.save();
    return this.getRun(id)!;
  }

  updateRun(
    id: string,
    data: {
      status?: TestRunRecord['status'];
      summary?: TestSummary;
      results?: TestResult[];
      completedAt?: string;
      duration?: number;
    },
  ): TestRunRecord | null {
    const existing = this.getRun(id);
    if (!existing) return null;

    this.db.run(
      `UPDATE test_runs SET status=?, summary=?, results=?, completed_at=?, duration=? WHERE id=?`,
      [
        data.status ?? existing.status,
        data.summary ? JSON.stringify(data.summary) : (existing.summary ? JSON.stringify(existing.summary) : null),
        data.results ? JSON.stringify(data.results) : (existing.results ? JSON.stringify(existing.results) : null),
        data.completedAt ?? existing.completedAt ?? null,
        data.duration ?? existing.duration ?? null,
        id,
      ],
    );
    this.save();
    return this.getRun(id);
  }

  deleteRun(id: string): boolean {
    const existing = this.getRun(id);
    if (!existing) return false;
    this.db.run('DELETE FROM test_runs WHERE id = ?', [id]);
    this.save();
    return true;
  }

  // --- Recordings ---

  listRecordings(): SavedRecording[] {
    const stmt = this.db.prepare('SELECT * FROM recordings ORDER BY updated_at DESC');
    const rows: SavedRecording[] = [];
    while (stmt.step()) {
      rows.push(this.rowToRecording(stmt.getAsObject() as Record<string, unknown>));
    }
    stmt.free();
    return rows;
  }

  getRecording(id: string): SavedRecording | null {
    const stmt = this.db.prepare('SELECT * FROM recordings WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = this.rowToRecording(stmt.getAsObject() as Record<string, unknown>);
    stmt.free();
    return row;
  }

  createRecording(data: Omit<SavedRecording, 'id' | 'createdAt' | 'updatedAt'>): SavedRecording {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO recordings (id, name, description, server_name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description ?? null, data.serverName ?? null, data.data, now, now],
    );
    this.save();
    return this.getRecording(id)!;
  }

  deleteRecording(id: string): boolean {
    const existing = this.getRecording(id);
    if (!existing) return false;
    this.db.run('DELETE FROM recordings WHERE id = ?', [id]);
    this.save();
    return true;
  }

  // --- Row mappers ---

  private rowToServer(row: Record<string, unknown>): SavedServerConnection {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      transport: row['transport'] as SavedServerConnection['transport'],
      command: (row['command'] as string) || undefined,
      args: row['args'] ? (JSON.parse(row['args'] as string) as string[]) : undefined,
      url: (row['url'] as string) || undefined,
      env: row['env'] ? (JSON.parse(row['env'] as string) as Record<string, string>) : undefined,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    };
  }

  private rowToCollection(row: Record<string, unknown>): SavedCollection {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      description: (row['description'] as string) || undefined,
      yaml: row['yaml'] as string,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    };
  }

  private rowToRecording(row: Record<string, unknown>): SavedRecording {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      description: (row['description'] as string) || undefined,
      serverName: (row['server_name'] as string) || undefined,
      data: row['data'] as string,
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    };
  }

  private rowToRun(row: Record<string, unknown>): TestRunRecord {
    return {
      id: row['id'] as string,
      collectionId: (row['collection_id'] as string) || undefined,
      collectionName: row['collection_name'] as string,
      serverId: (row['server_id'] as string) || undefined,
      status: row['status'] as TestRunRecord['status'],
      summary: row['summary'] ? (JSON.parse(row['summary'] as string) as TestSummary) : undefined,
      results: row['results'] ? (JSON.parse(row['results'] as string) as TestResult[]) : undefined,
      startedAt: row['started_at'] as string,
      completedAt: (row['completed_at'] as string) || undefined,
      duration: (row['duration'] as number) || undefined,
    };
  }
}
