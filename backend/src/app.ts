import cors from 'cors';
import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { statsRouter } from './routes/stats.js';
import { tasksRouter } from './routes/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend root is one level above /src; the built frontend lives next to it.
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

/**
 * Builds the Express app. Kept separate from index.ts so tests can import the
 * app without starting an HTTP listener.
 */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Public routes
  app.use(healthRouter);
  app.use('/api/auth', authRouter);

  // Protected routes
  app.use('/api/tasks', requireAuth, tasksRouter);
  app.use('/api/stats', requireAuth, statsRouter);

  // In production the backend serves the built SPA from the same origin.
  if (config.nodeEnv === 'production') {
    app.use(express.static(frontendDist));

    // SPA fallback: any non-API GET route gets index.html.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // Fallbacks
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
