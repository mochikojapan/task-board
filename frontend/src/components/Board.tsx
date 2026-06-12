import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { CreateTaskInput, Task, TaskStats, TaskStatus } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { StatsPanel } from './StatsPanel';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

interface Props {
  onLogout: () => void;
}

type FormState =
  | { mode: 'closed' }
  | { mode: 'create'; initialStatus: TaskStatus }
  | { mode: 'edit'; task: Task };

export function Board({ onLogout }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, statsResult] = await Promise.all([api.listTasks(), api.getStats()]);
      setTasks(list.data);
      setStats(statsResult);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load the board.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await api.getStats());
    } catch {
      // Non-fatal: stats panel keeps its last known values.
    }
  }, []);

  async function handleCreate(input: CreateTaskInput) {
    const created = await api.createTask(input);
    setTasks((prev) => [created, ...prev]);
    setForm({ mode: 'closed' });
    void refreshStats();
  }

  async function handleUpdate(id: number, input: CreateTaskInput) {
    const updated = await api.updateTask(id, input);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setForm({ mode: 'closed' });
    void refreshStats();
  }

  async function handleMove(task: Task, status: TaskStatus) {
    setActionError(null);
    try {
      const updated = await api.updateTask(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      void refreshStats();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to move the task.');
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteTask(pendingDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== pendingDelete.id));
      setPendingDelete(null);
      void refreshStats();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete the task.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Task Board</h1>
        <div className="app-header-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setForm({ mode: 'create', initialStatus: 'todo' })}
          >
            + New task
          </button>
          <button className="btn" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="state-block" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading your board…
          </div>
        ) : loadError ? (
          <div className="state-block state-error" role="alert">
            <p>{loadError}</p>
            <button className="btn" type="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <StatsPanel stats={stats} />

            {actionError && (
              <p className="form-error board-action-error" role="alert">
                {actionError}
              </p>
            )}

            {tasks.length === 0 ? (
              <div className="state-block">
                <p>No tasks yet. Create your first one to get started.</p>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setForm({ mode: 'create', initialStatus: 'todo' })}
                >
                  + New task
                </button>
              </div>
            ) : (
              <div className="board">
                {COLUMNS.map(({ status, label }) => {
                  const columnTasks = tasks.filter((t) => t.status === status);
                  return (
                    <section key={status} className="column" aria-label={label}>
                      <header className="column-header">
                        <h2 className="column-title">{label}</h2>
                        <span className="column-count">{columnTasks.length}</span>
                      </header>
                      <div className="column-body">
                        {columnTasks.length === 0 ? (
                          <p className="column-empty">Nothing here yet</p>
                        ) : (
                          columnTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onEdit={(t) => setForm({ mode: 'edit', task: t })}
                              onDelete={(t) => {
                                setDeleteError(null);
                                setPendingDelete(t);
                              }}
                              onMove={handleMove}
                            />
                          ))
                        )}
                      </div>
                      <button
                        className="btn btn-ghost column-add"
                        type="button"
                        onClick={() => setForm({ mode: 'create', initialStatus: status })}
                      >
                        + Add task
                      </button>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {form.mode !== 'closed' && (
        <TaskForm
          task={form.mode === 'edit' ? form.task : null}
          initialStatus={form.mode === 'create' ? form.initialStatus : 'todo'}
          onSubmit={(input) =>
            form.mode === 'edit' ? handleUpdate(form.task.id, input) : handleCreate(input)
          }
          onCancel={() => setForm({ mode: 'closed' })}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${pendingDelete.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => !deleteBusy && setPendingDelete(null)}
        />
      )}
    </div>
  );
}
