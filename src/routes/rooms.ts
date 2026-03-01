// src/routes/rooms.ts
import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function genRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/rooms/create
router.post('/create', requireAuth, async (req: AuthRequest, res: Response) => {
  const { questionCount = 10, difficulty = 'mixed' } = req.body;

  // Expire in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  let roomCode = genRoomCode();

  // Ensure uniqueness
  while (await prisma.friendRoom.findUnique({ where: { roomCode } })) {
    roomCode = genRoomCode();
  }

  const room = await prisma.friendRoom.create({
    data: {
      roomCode,
      hostId: req.userId!,
      questionCount,
      difficulty,
      expiresAt,
      status: 'waiting',
    },
    include: { host: { select: { name: true, tier: true, rating: true } } }
  });

  return res.json(room);
});

// POST /api/rooms/join
router.post('/join', requireAuth, async (req: AuthRequest, res: Response) => {
  const { roomCode } = req.body;
  if (!roomCode) return res.status(400).json({ error: 'Room code required' });

  const room = await prisma.friendRoom.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
    include: { host: { select: { name: true, tier: true, rating: true } } }
  });

  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'waiting') return res.status(400).json({ error: 'Room is no longer available' });
  if (new Date() > room.expiresAt) return res.status(400).json({ error: 'Room has expired' });
  if (room.hostId === req.userId) return res.status(400).json({ error: 'Cannot join your own room' });

  const updated = await prisma.friendRoom.update({
    where: { id: room.id },
    data: { guestId: req.userId!, status: 'active' },
    include: {
      host: { select: { id: true, name: true, tier: true, rating: true } },
      guest: { select: { id: true, name: true, tier: true, rating: true } },
    }
  });

  return res.json(updated);
});

// GET /api/rooms/:code
router.get('/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  const room = await prisma.friendRoom.findUnique({
    where: { roomCode: req.params.code.toUpperCase() },
    include: {
      host: { select: { id: true, name: true, tier: true, rating: true } },
      guest: { select: { id: true, name: true, tier: true, rating: true } },
    }
  });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  return res.json(room);
});

// PATCH /api/rooms/:code/settings  (host only)
router.patch('/:code/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  const room = await prisma.friendRoom.findUnique({ where: { roomCode: req.params.code } });
  if (!room) return res.status(404).json({ error: 'Not found' });
  if (room.hostId !== req.userId) return res.status(403).json({ error: 'Only host can change settings' });

  const { questionCount, difficulty } = req.body;
  const updated = await prisma.friendRoom.update({
    where: { id: room.id },
    data: {
      ...(questionCount && { questionCount }),
      ...(difficulty && { difficulty }),
    }
  });
  return res.json(updated);
});

export default router;
