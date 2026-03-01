import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import type { WiktionaryEntry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../../data/definition_cache.db");

let db: Database.Database | null = null;

function ensureDatabase(): Database.Database {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS definitions (
      word TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  return db;
}

export function get(word: string): WiktionaryEntry[] | null {
  const row = ensureDatabase()
    .prepare("SELECT data FROM definitions WHERE word = ?")
    .get(word.toLowerCase()) as { data: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.data);
}

export function set(word: string, entries: WiktionaryEntry[]): void {
  ensureDatabase()
    .prepare("INSERT OR REPLACE INTO definitions (word, data) VALUES (?, ?)")
    .run(word.toLowerCase(), JSON.stringify(entries));
}
