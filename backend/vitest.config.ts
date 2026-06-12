import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Run each test file against a fresh in-memory SQLite database.
    env: {
      DATABASE_FILE: ':memory:',
      JWT_SECRET: 'test-secret',
      SEED_USER_EMAIL: 'demo@taskboard.dev',
      SEED_USER_PASSWORD: 'password123',
    },
  },
});
