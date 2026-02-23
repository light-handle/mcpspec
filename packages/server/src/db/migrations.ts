import type { Database as SqlJsDatabase } from 'sql.js';


interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS server_connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        transport TEXT NOT NULL DEFAULT 'stdio',
        command TEXT,
        args TEXT, -- JSON array
        url TEXT,
        env TEXT, -- JSON object
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        yaml TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        collection_id TEXT,
        collection_name TEXT NOT NULL,
        server_id TEXT,
        status TEXT NOT NULL DEFAULT 'running',
        summary TEXT, -- JSON
        results TEXT, -- JSON
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        duration INTEGER
      )`,
      `INSERT INTO schema_version (version) VALUES (1)`,
    ],
  },
  {
    version: 2,
    up: [
      `CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        server_name TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `UPDATE schema_version SET version = 2`,
    ],
  },
];

export function getSchemaVersion(db: SqlJsDatabase): number {
  try {
    const result = db.exec('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as number;
    }
  } catch {
    // Table doesn't exist yet
  }
  return 0;
}

export function runMigrations(db: SqlJsDatabase): void {
  const currentVersion = getSchemaVersion(db);

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      for (const sql of migration.up) {
        db.run(sql);
      }
    }
  }
}
