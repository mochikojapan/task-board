import type { TaskStats } from '../types';

interface Props {
  stats: TaskStats | null;
}

export function StatsPanel({ stats }: Props) {
  const items: { label: string; value: number | null; className?: string }[] = [
    { label: 'Total', value: stats?.total ?? null },
    { label: 'To Do', value: stats?.byStatus.todo ?? null },
    { label: 'In Progress', value: stats?.byStatus.in_progress ?? null },
    { label: 'Done', value: stats?.byStatus.done ?? null },
    { label: 'Overdue', value: stats?.overdue ?? null, className: 'stat-overdue' },
  ];

  return (
    <section className="stats-panel" aria-label="Task statistics">
      {items.map((item) => (
        <div key={item.label} className={`stat ${item.className ?? ''}`}>
          <span className="stat-value">{item.value ?? '–'}</span>
          <span className="stat-label">{item.label}</span>
        </div>
      ))}
    </section>
  );
}
