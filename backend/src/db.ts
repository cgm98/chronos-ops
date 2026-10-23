import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as path from 'path';

// Ruta dedicada para chronos.db
const dbPath = process.env.CHRONOS_DB_PATH || path.resolve(__dirname, '../../../db/chronos.db');

export const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite);
