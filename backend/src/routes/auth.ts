import { Router } from 'express';
import { authService } from '../services/authService.js';
import { validate, validated } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema } from '../validators/schemas.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = validated<{ email: string; password: string }>(req);
    const result = await authService.login(email, password);
    res.json(result);
  }),
);
