import { config } from '../config.js';
import { getDb } from './connection.js';
import { migrate } from './migrate.js';
import { authService } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';
import type { CreateTaskInput } from '../types.js';

/** Returns an ISO date `days` from now (negative = in the past). */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

const sampleTasks: CreateTaskInput[] = [
  { title: 'Set up project repository', description: 'Initialize git, add README and license.', status: 'done', priority: 'medium', dueDate: daysFromNow(-14) },
  { title: 'Design database schema', description: 'Tables for tasks and users with indexes.', status: 'done', priority: 'high', dueDate: daysFromNow(-10) },
  { title: 'Wire up CI pipeline', description: 'Run tests on every pull request.', status: 'done', priority: 'low', dueDate: daysFromNow(-7) },
  { title: 'Build authentication flow', description: 'JWT login, protect API routes.', status: 'in_progress', priority: 'high', dueDate: daysFromNow(2) },
  { title: 'Implement task CRUD endpoints', description: 'Create, read, update, delete with validation.', status: 'in_progress', priority: 'high', dueDate: daysFromNow(1) },
  { title: 'Add pagination to task list', description: 'Page and limit query params with totals.', status: 'in_progress', priority: 'medium', dueDate: daysFromNow(3) },
  { title: 'Write API integration tests', description: 'Cover create, list, update, delete paths.', status: 'todo', priority: 'high', dueDate: daysFromNow(-2) },
  { title: 'Add filtering by status', description: 'Support todo / in_progress / done filters.', status: 'todo', priority: 'medium', dueDate: daysFromNow(4) },
  { title: 'Build the board UI', description: 'Columns grouped by status with cards.', status: 'todo', priority: 'high', dueDate: daysFromNow(5) },
  { title: 'Create task form', description: 'Validated form for create and edit.', status: 'todo', priority: 'medium', dueDate: daysFromNow(6) },
  { title: 'Add delete confirmation', description: 'Prevent accidental deletes with a dialog.', status: 'todo', priority: 'low', dueDate: daysFromNow(7) },
  { title: 'Build the stats panel', description: 'Counts per status and overdue total.', status: 'todo', priority: 'medium', dueDate: null },
  { title: 'Handle loading and error states', description: 'Spinners, empty states, retry actions.', status: 'todo', priority: 'medium', dueDate: daysFromNow(8) },
  { title: 'Polish responsive layout', description: 'Make the board work on small screens.', status: 'todo', priority: 'low', dueDate: daysFromNow(12) },
  { title: 'Review accessibility', description: 'Keyboard focus, labels, color contrast.', status: 'todo', priority: 'low', dueDate: null },
  { title: 'Fix overdue date highlighting', description: 'Cards past due should stand out.', status: 'todo', priority: 'medium', dueDate: daysFromNow(-1) },
  { title: 'Write the README', description: 'Setup steps, credentials, folder structure.', status: 'in_progress', priority: 'high', dueDate: daysFromNow(1) },
  { title: 'Record a short demo', description: 'Walk through login, board, and stats.', status: 'todo', priority: 'low', dueDate: daysFromNow(9) },
];

function insertSampleTasks(): void {
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const t of sampleTasks) {
      db.run(
        `INSERT INTO tasks (title, description, status, priority, due_date)
         VALUES (@title, @description, @status, @priority, @due_date)`,
        {
          '@title': t.title,
          '@description': t.description ?? '',
          '@status': t.status ?? 'todo',
          '@priority': t.priority ?? 'medium',
          '@due_date': t.dueDate ?? null,
        },
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

async function ensureSeedUser(): Promise<void> {
  if (userRepository.findByEmail(config.seedUser.email)) return;
  const hash = await authService.hashPassword(config.seedUser.password);
  userRepository.create(config.seedUser.email, hash);
}

/**
 * Seeds sample data only when the tasks table is empty, and makes sure the
 * demo user exists. Called on every server boot so a fresh (or cold-started)
 * instance always has demo data, without wiping data on warm restarts.
 */
export async function seedIfEmpty(): Promise<void> {
  const db = getDb();
  const { count } = db.get('SELECT COUNT(*) AS count FROM tasks') as { count: number };

  if (count === 0) {
    insertSampleTasks();
    console.log(`Seeded ${sampleTasks.length} tasks (tasks table was empty).`);
  }

  await ensureSeedUser();
}

/** Destructive reset used by `npm run seed` / `npm run db:reset`. */
async function resetAndSeed(): Promise<void> {
  migrate();
  const db = getDb();

  // Reset task data for a predictable seed (keeps the schema).
  db.exec('DELETE FROM tasks;');
  db.exec("DELETE FROM sqlite_sequence WHERE name = 'tasks';");

  insertSampleTasks();
  await ensureSeedUser();

  console.log(`Seeded ${sampleTasks.length} tasks.`);
  console.log(`Login: ${config.seedUser.email} / ${config.seedUser.password}`);
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  resetAndSeed();
}
