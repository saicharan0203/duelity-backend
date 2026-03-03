// src/routes/auth.ts
import { Router, Response } from 'express';
import { admin } from '../middleware/firebase';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getTier } from '../services/elo';
import { updateLeaderboard } from '../redis/leaderboard';
import { z } from 'zod';

const router = Router();

// POST /api/auth/verify-token
// Called on every login — creates user if new, returns onboarding flags
router.post('/verify-token', async (req, res: Response) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decoded;

    let user = await prisma.user.findUnique({ where: { id: uid }, include: { college: true } });

    if (!user) {
      // First time — create user
      user = await prisma.user.create({
        data: {
          id: uid,
          email: email || '',
          name: name || 'Player',
          isNewUser: true,
          collegeSelected: false,
          rating: 1000,
          tier: 'bronze',
        },
        include: { college: true }
      });
    }

    // Update leaderboard in Redis
    await updateLeaderboard(user.id, user.rating, user.collegeId);

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      rating: user.rating,
      tier: user.tier,
      isNewUser: user.isNewUser,
      collegeSelected: user.collegeSelected,
      college: user.college,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/complete-assessment
// Called after skill assessment — saves starting tier + rating, sets isNewUser=false
const AssessmentSchema = z.object({
  correct: z.number().min(0).max(10),
  timeSecs: z.number().positive(),
});

router.post('/complete-assessment', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = AssessmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const { correct, timeSecs } = parsed.data;
  const accuracy = correct / 10;

  let startingRating = 1000;
  if (accuracy >= 0.9 && timeSecs < 60) startingRating = 1400; // Diamond
  else if (accuracy >= 0.7) startingRating = 900;               // Gold
  else if (accuracy >= 0.5) startingRating = 600;               // Silver
  else startingRating = 300;                                     // Bronze

  const tier = getTier(startingRating);

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { rating: startingRating, tier, isNewUser: false, accuracy },
  });

  await updateLeaderboard(user.id, user.rating, user.collegeId);

  return res.json({ rating: user.rating, tier: user.tier });
});

// POST /api/auth/set-college
router.post('/set-college', requireAuth, async (req: AuthRequest, res: Response) => {
  const { collegeId, collegeName, city } = req.body as {
    collegeId?: string;
    collegeName?: string;
    city?: string;
  };

  let resolvedCollegeId: string | null = null;

  if (collegeId) {
    resolvedCollegeId = collegeId;
  } else if (collegeName && typeof collegeName === 'string' && collegeName.trim().length > 0) {
    const name = collegeName.trim();

    // Try to find an existing college by name, otherwise create a minimal record
    let college = await prisma.college.findFirst({ where: { name } });
    if (!college) {
      college = await prisma.college.create({
        data: {
          name,
          city: city || '',
          state: '',
        }
      });
    }

    resolvedCollegeId = college.id;
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      collegeId: resolvedCollegeId,
      collegeSelected: true,
    },
    include: { college: true }
  });

  await updateLeaderboard(user.id, user.rating, user.collegeId);
  return res.json({ college: user.college });
});

export default router;
