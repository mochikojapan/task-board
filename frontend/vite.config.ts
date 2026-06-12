import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    // The client always calls relative paths (/api/..., /health). In dev,
    // forward them to the backend so no CORS setup is needed; in production
    // the backend serves the built SPA from the same origin.
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Expose afterEach globally so Testing Library auto-registers its cleanup
    // between tests.
    globals: true,
  },
});
