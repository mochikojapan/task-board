import { z } from 'zod';

const status = z.enum(['todo', 'in_progress', 'done']);
const priority = z.enum(['low', 'medium', 'high']);

// Accepts a full ISO datetime or a plain YYYY-MM-DD date. Stored as-is.
const dueDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'dueDate must be a valid date',
  })
  .nullable();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().max(2000).optional(),
  status: status.optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
});

// Every field optional, but the body must contain at least one field.
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    status,
    priority,
    dueDate,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listTasksQuerySchema = z.object({
  status: status.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'password is required'),
});
