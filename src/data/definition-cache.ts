import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { mkdirSync, unlinkSync } from "fs";
import type { WiktionaryEntry } from "./types.ts";
import { getCacheDir } from "./paths.ts";

let db: Database.Database | null = null;
let dbFailed = false;

function openDatabase(dbPath: string): Database.Database {
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS definitions (
      word TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  return instance;
}

function ensureDatabase(): Database.Database | null {
  if (db) return db;
  if (dbFailed) return null;

  const DB_PATH = resolve(getCacheDir(), "definition_cache.db");
  mkdirSync(dirname(DB_PATH), { recursive: true });

  try {
    db = openDatabase(DB_PATH);
    return db;
  } catch {
    // First failure — delete corrupt DB and retry once
    try {
      unlinkSync(DB_PATH);
    } catch {
      // File may not exist; ignore
    }
    try {
      db = openDatabase(DB_PATH);
      return db;
    } catch {
      // Second failure — give up; cache is unavailable
      dbFailed = true;
      return null;
    }
  }
}

export function get(word: string): WiktionaryEntry[] | null {
  const instance = ensureDatabase();
  if (!instance) return null;

  const row = instance
    .prepare("SELECT data FROM definitions WHERE word = ?")
    .get(word.toLowerCase()) as { data: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.data);
}

export function set(word: string, entries: WiktionaryEntry[]): void {
  const instance = ensureDatabase();
  if (!instance) return;

  instance
    .prepare("INSERT OR REPLACE INTO definitions (word, data) VALUES (?, ?)")
    .run(word.toLowerCase(), JSON.stringify(entries));
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
  dbFailed = false;
}
