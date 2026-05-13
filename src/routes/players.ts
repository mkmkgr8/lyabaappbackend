import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../db/prisma';

const router = Router();
const auth = authenticate as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : undefined;

    if (roomId) {
      const aps = await prisma.auctionPlayer.findMany({
        where: { roomId },
        include: { player: true },
        orderBy: { player: { rating: 'desc' } },
      });
      res.json(aps.map((ap) => ({
        id: ap.player.id,
        name: ap.player.name,
        position: ap.player.position,
        team: ap.player.team,
        rating: ap.player.rating,
        photoUrl: ap.player.photoUrl,
        status: ap.status,
        ownedBy: ap.ownedBy,
      })));
      return;
    }

    const players = await prisma.player.findMany({ orderBy: { rating: 'desc' } });
    res.json(players.map((p) => ({
      id: p.id, name: p.name, position: p.position, team: p.team,
      rating: p.rating, photoUrl: p.photoUrl, status: 'available', ownedBy: null,
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.params['id'] as string } });
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json({ ...player, status: 'available', ownedBy: null });
  } catch (err) {
    next(err);
  }
});

export default router;
