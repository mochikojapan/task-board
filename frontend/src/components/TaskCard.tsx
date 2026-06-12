import type { Task, TaskStatus } from '../types';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(task: Task): boolean {
  return (
    task.dueDate !== null && task.status !== 'done' && new Date(task.dueDate).getTime() < Date.now()
  );
}

export function TaskCard({ task, onEdit, onDelete, onMove }: Props) {
  const index = STATUS_ORDER.indexOf(task.status);
  const prev = index > 0 ? STATUS_ORDER[index - 1] : null;
  const next = index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;
  const overdue = isOverdue(task);

  return (
    <article className={`task-card ${overdue ? 'task-card-overdue' : ''}`}>
      <header className="task-card-header">
        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
        <div className="task-card-actions">
          <button
            className="icon-btn"
            type="button"
            title="Edit task"
            aria-label={`Edit ${task.title}`}
            onClick={() => onEdit(task)}
          >
            ✎
          </button>
          <button
            className="icon-btn icon-btn-danger"
            type="button"
            title="Delete task"
            aria-label={`Delete ${task.title}`}
            onClick={() => onDelete(task)}
          >
            ✕
          </button>
        </div>
      </header>

      <h3 className="task-card-title">{task.title}</h3>
      {task.description && <p className="task-card-description">{task.description}</p>}

      <footer className="task-card-footer">
        {task.dueDate ? (
          <span className={`due-date ${overdue ? 'due-date-overdue' : ''}`}>
            {overdue ? 'Overdue · ' : 'Due '}
            {formatDueDate(task.dueDate)}
          </span>
        ) : (
          <span className="due-date due-date-none">No due date</span>
        )}
        <div className="task-card-move">
          {prev && (
            <button
              className="icon-btn"
              type="button"
              title="Move left"
              aria-label={`Move ${task.title} back`}
              onClick={() => onMove(task, prev)}
            >
              ←
            </button>
          )}
          {next && (
            <button
              className="icon-btn"
              type="button"
              title="Move right"
              aria-label={`Move ${task.title} forward`}
              onClick={() => onMove(task, next)}
            >
              →
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
