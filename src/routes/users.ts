// src/routes/users.ts
import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getIndiaRank, getCollegeRank } from '../redis/leaderboard';

const router = Router();

// GET /api/users/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { college: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const indiaRank = await getIndiaRank(user.id);
  const collegeRank = user.collegeId ? await getCollegeRank(user.id, user.collegeId) : null;

  return res.json({ ...user, indiaRank, collegeRank });
});

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, collegeId } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(name && { name }),
      ...(collegeId !== undefined && { collegeId, collegeSelected: true }),
    },
    include: { college: true }
  });
  return res.json(user);
});

// GET /api/users/me/matches
router.get('/me/matches', requireAuth, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ player1Id: req.userId! }, { player2Id: req.userId! }]
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      player1: { select: { id: true, name: true, tier: true } },
      player2: { select: { id: true, name: true, tier: true } },
    }
  });

  return res.json(matches);
});

// GET /api/users/:id  (public profile)
router.get('/:id', async (req, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, tier: true, rating: true,
      wins: true, losses: true, totalMatches: true,
      accuracy: true, bestStreak: true, college: true,
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

export default router;
