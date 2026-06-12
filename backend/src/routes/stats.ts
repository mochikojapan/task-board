import { Router } from 'express';
import { taskService } from '../services/taskService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const statsRouter = Router();

// GET /api/stats — counts per status + overdue count
statsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(taskService.stats());
  }),
);
