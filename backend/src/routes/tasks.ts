import { Router } from 'express';
import { z } from 'zod';
import { taskService } from '../services/taskService.js';
import { validate, validated } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Errors } from '../utils/errors.js';
import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../validators/schemas.js';
import type {
  CreateTaskInput,
  ListTasksParams,
  UpdateTaskInput,
} from '../types.js';

export const tasksRouter = Router();

const idParam = z.object({ id: z.coerce.number().int().positive() });

function parseId(value: unknown): number {
  const result = idParam.safeParse(value);
  if (!result.success) throw Errors.validation('id must be a positive integer');
  return result.data.id;
}

// GET /api/tasks — list with pagination + optional status filter
tasksRouter.get(
  '/',
  validate(listTasksQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const params = validated<ListTasksParams>(req, 'query');
    res.json(taskService.list(params));
  }),
);

// GET /api/tasks/:id
tasksRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params);
    res.json(taskService.getById(id));
  }),
);

// POST /api/tasks — create
tasksRouter.post(
  '/',
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const input = validated<CreateTaskInput>(req);
    res.status(201).json(taskService.create(input));
  }),
);

// PATCH /api/tasks/:id — partial update
tasksRouter.patch(
  '/:id',
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params);
    const input = validated<UpdateTaskInput>(req);
    res.json(taskService.update(id, input));
  }),
);

// DELETE /api/tasks/:id
tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params);
    taskService.remove(id);
    res.status(204).send();
  }),
);
