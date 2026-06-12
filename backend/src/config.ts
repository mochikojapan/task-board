import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root is one level above /src
const rootDir = path.resolve(__dirname, '..');

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: Number(env('PORT', '4000')),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '8h'),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173'),
  seedUser: {
    email: env('SEED_USER_EMAIL', 'demo@taskboard.dev'),
    password: env('SEED_USER_PASSWORD', 'password123'),
  },
  // Tests set DATABASE_FILE=:memory: to run against an in-memory database.
  databaseFile: (() => {
    const file = env('DATABASE_FILE', 'data/taskboard.db');
    return file === ':memory:' ? file : path.resolve(rootDir, file);
  })(),
};
