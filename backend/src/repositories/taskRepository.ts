import { getDb } from '../db/connection.js';
import type {
  CreateTaskInput,
  ListTasksParams,
  Task,
  TaskRow,
  TaskStatus,
  UpdateTaskInput,
} from '../types.js';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

/** Maps a raw DB row to the camelCase API shape. */
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const taskRepository = {
  list({ status, page, limit }: ListTasksParams): { rows: Task[]; total: number } {
    const db = getDb();
    const where = status ? 'WHERE status = ?' : '';
    const filterArgs: string[] = status ? [status] : [];

    const total = (
      db.get(`SELECT COUNT(*) AS count FROM tasks ${where}`, filterArgs) as {
        count: number;
      }
    ).count;

    const offset = (page - 1) * limit;
    const rows = db.all(
      `SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...filterArgs, limit, offset],
    ) as unknown as TaskRow[];

    return { rows: rows.map(toTask), total };
  },

  findById(id: number): Task | null {
    const row = getDb().get('SELECT * FROM tasks WHERE id = ?', [id]) as
      | TaskRow
      | undefined;
    return row ? toTask(row) : null;
  },

  create(input: CreateTaskInput): Task {
    const result = getDb().run(
      `INSERT INTO tasks (title, description, status, priority, due_date)
       VALUES (@title, @description, @status, @priority, @due_date)`,
      {
        '@title': input.title,
        '@description': input.description ?? '',
        '@status': input.status ?? 'todo',
        '@priority': input.priority ?? 'medium',
        '@due_date': input.dueDate ?? null,
      },
    );

    return this.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, input: UpdateTaskInput): Task | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    // node-sqlite3-wasm requires named parameter keys to carry the '@' prefix.
    const params: Record<string, unknown> = { '@id': id };

    const assign = (column: string, value: unknown) => {
      fields.push(`${column} = @${column}`);
      params[`@${column}`] = value;
    };

    if (input.title !== undefined) assign('title', input.title);
    if (input.description !== undefined) assign('description', input.description);
    if (input.status !== undefined) assign('status', input.status);
    if (input.priority !== undefined) assign('priority', input.priority);
    if (input.dueDate !== undefined) assign('due_date', input.dueDate);

    // Always bump updated_at when something changes.
    fields.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);

    getDb().run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`, params);

    return this.findById(id);
  },

  remove(id: number): boolean {
    const result = getDb().run('DELETE FROM tasks WHERE id = ?', [id]);
    return result.changes > 0;
  },

  /** Counts grouped by status plus a count of overdue, unfinished tasks. */
  stats(nowIso: string) {
    const db = getDb();
    const counts = db.all(
      'SELECT status, COUNT(*) AS count FROM tasks GROUP BY status',
    ) as unknown as { status: TaskStatus; count: number }[];

    const byStatus = { todo: 0, in_progress: 0, done: 0 } as Record<TaskStatus, number>;
    for (const row of counts) byStatus[row.status] = row.count;

    const overdue = (
      db.get(
        `SELECT COUNT(*) AS count FROM tasks
         WHERE due_date IS NOT NULL AND due_date < ? AND status != 'done'`,
        [nowIso],
      ) as { count: number }
    ).count;

    const total = STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    return { total, byStatus, overdue };
  },
};
