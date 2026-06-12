import { taskRepository } from '../repositories/taskRepository.js';
import { Errors } from '../utils/errors.js';
import type {
  CreateTaskInput,
  ListTasksParams,
  PaginatedTasks,
  Task,
  TaskStats,
  UpdateTaskInput,
} from '../types.js';

export const taskService = {
  list(params: ListTasksParams): PaginatedTasks {
    const { rows, total } = taskRepository.list(params);
    return {
      data: rows,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  },

  getById(id: number): Task {
    const task = taskRepository.findById(id);
    if (!task) throw Errors.notFound('Task');
    return task;
  },

  create(input: CreateTaskInput): Task {
    return taskRepository.create(input);
  },

  update(id: number, input: UpdateTaskInput): Task {
    const updated = taskRepository.update(id, input);
    if (!updated) throw Errors.notFound('Task');
    return updated;
  },

  remove(id: number): void {
    const deleted = taskRepository.remove(id);
    if (!deleted) throw Errors.notFound('Task');
  },

  stats(): TaskStats {
    return taskRepository.stats(new Date().toISOString());
  },
};
