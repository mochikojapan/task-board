// node-sqlite3-wasm is a CommonJS module — use the default import and pull
// the Database class off it at runtime.
import sqlite3 from 'node-sqlite3-wasm';
import type { Database } from 'node-sqlite3-wasm';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

let db: Database | null = null;

/**
 * Returns a shared SQLite connection, creating the data directory on first use.
 * node-sqlite3-wasm is synchronous (pure-WASM SQLite, no native compilation),
 * so a single connection per process is all we need.
 */
export function getDb(): Database {
  if (db) return db;

  if (config.databaseFile !== ':memory:') {
    fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
  }

  db = new sqlite3.Database(config.databaseFile);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

/** Closes the connection. Mainly used by tests to reset state. */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
