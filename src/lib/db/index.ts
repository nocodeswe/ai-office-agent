import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA } from './schema';

let db: Database.Database | null = null;

function ensureColumn(
  database: Database.Database,
  tableName: string,
  columnName: string,
  definition: string
): void {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.join(process.cwd(), 'data');
  const dbPath = path.join(dbDir, 'addon.db');

  try {
    fs.mkdirSync(dbDir, { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    ensureColumn(db, 'providers', 'auto_parameters', 'INTEGER NOT NULL DEFAULT 0');

    return db;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize database: ${message}`);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
