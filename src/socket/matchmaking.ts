// src/socket/matchmaking.ts
import { Server, Socket } from 'socket.io';
import { QueueEntry } from '../types';
import { getQuestions } from '../services/questions';
import { prisma } from '../prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { initGame } from './game';

// In-memory queues (use Redis for multi-server prod)
const rankedQueue: QueueEntry[] = [];
const casualQueue: QueueEntry[] = [];

const RATING_RANGE = 300; // Max rating diff for ranked match

function findMatch(entry: QueueEntry, queue: QueueEntry[]): QueueEntry | null {
  for (const other of queue) {
    if (other.userId === entry.userId) continue;
    if (entry.mode === 'ranked') {
      if (Math.abs(other.rating - entry.rating) <= RATING_RANGE) return other;
    } else {
      return other; // casual — any opponent
    }
  }
  return null;
}

export function setupMatchmaking(io: Server, socket: Socket, userId: string, rating: number) {

  socket.on('queue:join', async ({ mode }: { mode: 'ranked' | 'casual' }) => {
    const queue = mode === 'ranked' ? rankedQueue : casualQueue;

    // Remove any existing entry for this user
    const existingIdx = queue.findIndex(e => e.userId === userId);
    if (existingIdx !== -1) queue.splice(existingIdx, 1);

    const entry: QueueEntry = { userId, socketId: socket.id, rating, mode, joinedAt: Date.now() };

    const opponent = findMatch(entry, queue);

    if (opponent) {
      // Remove opponent from queue
      const oppIdx = queue.findIndex(e => e.userId === opponent.userId);
      if (oppIdx !== -1) queue.splice(oppIdx, 1);

      // Create match
      const questions = getQuestions(10, 'mixed');
      const matchId = uuidv4();

      // Get both players from DB
      const [p1, p2] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, tier: true, rating: true } }),
        prisma.user.findUnique({ where: { id: opponent.userId }, select: { id: true, name: true, tier: true, rating: true } }),
      ]);

      // Create match record
      await prisma.match.create({
        data: {
          id: matchId,
          player1Id: userId,
          player2Id: opponent.userId,
          mode,
          questions,
        }
      });

      // Notify both players
      const matchPayload = {
        matchId,
        mode,
        questions: questions.map(q => ({ question: q.question, options: q.options })), // No answer sent!
        opponent: p2,
        playerIndex: 1 as const,
      };

      const oppMatchPayload = {
        matchId,
        mode,
        questions: questions.map(q => ({ question: q.question, options: q.options })),
        opponent: p1,
        playerIndex: 2 as const,
      };

      socket.emit('match:found', matchPayload);
      io.to(opponent.socketId).emit('match:found', oppMatchPayload);

      // Init game state
      initGame(io, matchId, userId, opponent.userId, questions, mode);

    } else {
      // Add to queue and wait
      queue.push(entry);
      socket.emit('queue:waiting', { position: queue.length });

      // Expand rating range after 30s
      setTimeout(() => {
        const stillInQueue = queue.find(e => e.userId === userId);
        if (stillInQueue) {
          stillInQueue.rating = 9999; // Match with anyone after timeout
          socket.emit('queue:waiting', { position: 1, expanding: true });
        }
      }, 30000);
    }
  });

  socket.on('queue:leave', () => {
    rankedQueue.splice(rankedQueue.findIndex(e => e.userId === userId), 1);
    casualQueue.splice(casualQueue.findIndex(e => e.userId === userId), 1);
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    rankedQueue.splice(rankedQueue.findIndex(e => e.userId === userId), 1);
    casualQueue.splice(casualQueue.findIndex(e => e.userId === userId), 1);
  });
}
