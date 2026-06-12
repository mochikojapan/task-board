import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { getDb } from '../src/db/connection.js';
import { authService } from '../src/services/authService.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { config } from '../src/config.js';

export async function setupTestApp(): Promise<{ app: Express; token: string }> {
  migrate();

  // Clear any data from a previous test in the same worker.
  const db = getDb();
  db.exec('DELETE FROM tasks; DELETE FROM users;');

  const hash = await authService.hashPassword(config.seedUser.password);
  userRepository.upsert(config.seedUser.email, hash);

  const app = createApp();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: config.seedUser.email, password: config.seedUser.password });

  return { app, token: login.body.token };
}

export function auth(token: string) {
  return `Bearer ${token}`;
}
