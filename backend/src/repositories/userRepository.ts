import { getDb } from '../db/connection.js';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export const userRepository = {
  findByEmail(email: string): UserRow | null {
    const row = getDb().get('SELECT * FROM users WHERE email = ?', [
      email.toLowerCase(),
    ]) as UserRow | undefined;
    return row ?? null;
  },

  create(email: string, passwordHash: string): UserRow {
    const result = getDb().run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [
      email.toLowerCase(),
      passwordHash,
    ]);
    return getDb().get('SELECT * FROM users WHERE id = ?', [
      Number(result.lastInsertRowid),
    ]) as UserRow;
  },

  /** Inserts the user if the email is not already present. */
  upsert(email: string, passwordHash: string): UserRow {
    return this.findByEmail(email) ?? this.create(email, passwordHash);
  },
};
