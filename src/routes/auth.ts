import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { register, login, getMe } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.issues[0].message }); return; }

  try {
    const result = await register(parsed.data.email, parsed.data.password, parsed.data.displayName);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.issues[0].message }); return; }

  try {
    const result = await login(parsed.data.email, parsed.data.password);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.get('/me', authenticate as (req: Request, res: Response, next: NextFunction) => void, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getMe((req as AuthRequest).user.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
