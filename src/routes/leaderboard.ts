// src/routes/leaderboard.ts
import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { redis } from '../redis/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const INDIA_KEY = 'leaderboard:india';
const COLLEGE_KEY = (id: string) => `leaderboard:college:${id}`;

async function enrichUsers(ids: string[]) {
  if (!ids.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, tier: true, rating: true, wins: true, college: true }
  });
  // Return in leaderboard order
  return ids.map(id => users.find(u => u.id === id)).filter(Boolean);
}

// GET /api/leaderboard/india
router.get('/india', async (_req, res: Response) => {
  const ids = await redis.zrevrange(INDIA_KEY, 0, 99);
  const users = await enrichUsers(ids);
  return res.json(users);
});

// GET /api/leaderboard/india/me  — returns rank + surrounding 5 players
router.get('/india/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const rank = await redis.zrevrank(INDIA_KEY, req.userId!);
  if (rank === null) return res.json({ rank: null });

  const start = Math.max(0, rank - 2);
  const end = rank + 2;
  const ids = await redis.zrevrange(INDIA_KEY, start, end);
  const users = await enrichUsers(ids);
  const total = await redis.zcard(INDIA_KEY);

  return res.json({ rank: rank + 1, total, surrounding: users });
});

// GET /api/leaderboard/college/:id
router.get('/college/:id', async (req, res: Response) => {
  const ids = await redis.zrevrange(COLLEGE_KEY(req.params.id), 0, 99);
  const users = await enrichUsers(ids);
  return res.json(users);
});

// GET /api/leaderboard/college/:id/me
router.get('/college/:id/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const rank = await redis.zrevrank(COLLEGE_KEY(req.params.id), req.userId!);
  const total = await redis.zcard(COLLEGE_KEY(req.params.id));
  return res.json({ rank: rank !== null ? rank + 1 : null, total });
});

export default router;
