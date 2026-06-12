import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';

// Ensure the schema exists before serving requests.
migrate();

// Seed demo data on a fresh database (no-op when data already exists), so a
// cold-started instance always has the sample tasks and the demo user.
await seedIfEmpty();

const app = createApp();

app.listen(config.port, () => {
  console.log(`Task Board API listening on http://localhost:${config.port}`);
});
