// src/routes/colleges.ts
import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/colleges?q=iit
router.get('/', async (req, res: Response) => {
  const q = (req.query.q as string) || '';
  const colleges = await prisma.college.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
      ]
    } : {},
    orderBy: { name: 'asc' },
    take: 20,
  });
  return res.json(colleges);
});

// POST /api/colleges/request
router.post('/request', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, city } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  await prisma.collegeRequest.create({
    data: { name, city, requestedBy: req.userId! }
  });

  return res.json({ message: 'Request received! We will add your college soon.' });
});

export default router;
