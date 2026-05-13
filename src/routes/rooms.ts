import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { createRoom, joinRoom, getRoom, startRoom, getRoomResults } from '../services/roomService';
import { broadcast } from '../ws/broadcaster';
import { AuthRequest } from '../types';

const router = Router();
const auth = authenticate as (req: Request, res: Response, next: NextFunction) => void;

const createRoomSchema = z.object({
  startingBudget: z.number().int().positive().default(100_000_000),
  minIncrement: z.number().int().min(1).default(1_000_000),
  timerDuration: z.number().int().min(5).max(60).default(10),
});

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: parsed.error.issues[0].message }); return; }

  try {
    const room = await createRoom(
      (req as AuthRequest).user.sub,
      parsed.data.startingBudget,
      parsed.data.minIncrement,
      parsed.data.timerDuration,
    );
    res.status(201).json(room);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.post('/:code/join', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await joinRoom((req as AuthRequest).user.sub, param(req, 'code'));
    res.json(room);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.get('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await getRoom(param(req, 'id'));
    res.json(room);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.post('/:id/start', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = param(req, 'id');
    await startRoom((req as AuthRequest).user.sub, roomId);
    broadcast(roomId, { type: 'nomination_open' });
    res.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(err);
  }
});

router.get('/:id/results', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await getRoomResults(param(req, 'id'));
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
