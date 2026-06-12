import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import type { Task, TaskStats } from '../types';
import { Board } from './Board';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      listTasks: vi.fn(),
      getStats: vi.fn(),
      deleteTask: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);

function makeTask(id: number, title: string, status: Task['status']): Task {
  return {
    id,
    title,
    description: '',
    status,
    priority: 'medium',
    dueDate: null,
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  };
}

const sampleTasks: Task[] = [
  makeTask(1, 'Write frontend tests', 'todo'),
  makeTask(2, 'Ship to Render', 'in_progress'),
];

const sampleStats: TaskStats = {
  total: 2,
  byStatus: { todo: 1, in_progress: 1, done: 0 },
  overdue: 0,
};

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listTasks.mockResolvedValue({
      data: sampleTasks,
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    mockedApi.getStats.mockResolvedValue(sampleStats);
    mockedApi.deleteTask.mockResolvedValue(undefined);
  });

  it('renders the fetched tasks in their columns', async () => {
    render(<Board onLogout={vi.fn()} />);

    expect(await screen.findByText('Write frontend tests')).toBeInTheDocument();
    expect(screen.getByText('Ship to Render')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To Do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();
  });

  it('opens the confirmation dialog on delete and calls the API on confirm', async () => {
    render(<Board onLogout={vi.fn()} />);
    await screen.findByText('Write frontend tests');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Write frontend tests' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete task?');
    expect(dialog).toHaveTextContent('"Write frontend tests" will be permanently deleted.');
    expect(mockedApi.deleteTask).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockedApi.deleteTask).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText('Write frontend tests')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
