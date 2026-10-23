import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export let sqlite: DatabaseSync;
export let db: any;

export function initDb(dbPath: string = process.env.DB_PATH || 'db/chronos.db') {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  }

  sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    sqlite.exec('PRAGMA journal_mode = WAL;');
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      provider TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT,
      project_id TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date);

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      weekly_days TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      time_of_day TEXT NOT NULL DEFAULT 'anytime',
      duration_mins INTEGER NOT NULL DEFAULT 15,
      anchor_cue TEXT,
      depends_on_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id);

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      domain_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);

    CREATE TABLE IF NOT EXISTS plan_versions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, routine_id, date)
    );
  `);

  // Simple compatibility facade for drizzle-like db.insert(...).values(...) in tests
  db = {
    insert: (table: any) => ({
      values: (val: any) => ({
        run: () => {
          const keys = Object.keys(val);
          const cols = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const sql = `INSERT INTO users (${cols}) VALUES (${placeholders})`;
          const stmt = sqlite.prepare(sql);
          stmt.run(...Object.values(val) as any[]);
        }
      })
    })
  };

  return { sqlite, db };
}

// Inicialización automática si no es test
if (process.env.NODE_ENV !== 'test') {
  initDb();
}

export function openDatabase(dbPath?: string): DatabaseSync {
  initDb(dbPath);
  return sqlite;
}
