// src/index.ts
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { admin } from './middleware/firebase';
import { redis } from './redis/client';
import { seedLeaderboard } from './redis/leaderboard';

import authRouter      from './routes/auth';
import usersRouter     from './routes/users';
import collegesRouter  from './routes/colleges';
import leaderboardRouter from './routes/leaderboard';
import roomsRouter     from './routes/rooms';

import { setupMatchmaking } from './socket/matchmaking';
import { setupGame }        from './socket/game';
import { setupFriendRoom }  from './socket/friendRoom';

const app  = express();
const http = createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/colleges',    collegesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/rooms',       roomsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Socket.io Auth + Event Setup ─────────────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (socket as any).userId   = decoded.uid;
    (socket as any).userName = decoded.name;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const userId = (socket as any).userId as string;
  console.log(`🔌 Connected: ${userId}`);

  // Get user rating for matchmaking
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const rating = user?.rating || 1000;
  await prisma.$disconnect();

  setupMatchmaking(io, socket, userId, rating);
  setupGame(io, socket, userId);
  setupFriendRoom(io, socket, userId);

  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${userId}`);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');

http.listen(PORT, async () => {
  console.log(`\n🚀 duelity.in backend running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);

  try {
    await redis.connect();
    await seedLeaderboard();
  } catch (err) {
    console.warn('Redis not available — leaderboard caching disabled');
  }
});

export { io };
