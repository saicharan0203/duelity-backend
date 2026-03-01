// src/socket/friendRoom.ts
import { Server, Socket } from 'socket.io';
import { prisma } from '../prisma/client';
import { getQuestions } from '../services/questions';
import { initGame } from './game';
import { v4 as uuidv4 } from 'uuid';

export function setupFriendRoom(io: Server, socket: Socket, userId: string) {

  // Host/guest joins the room socket channel
  socket.on('room:join', async ({ roomCode }: { roomCode: string }) => {
    const room = await prisma.friendRoom.findUnique({
      where: { roomCode },
      include: {
        host: { select: { id: true, name: true, tier: true, rating: true } },
        guest: { select: { id: true, name: true, tier: true, rating: true } },
      }
    });

    if (!room) return socket.emit('room:error', { message: 'Room not found' });
    if (room.status === 'expired') return socket.emit('room:error', { message: 'Room expired' });
    if (new Date() > room.expiresAt) {
      await prisma.friendRoom.update({ where: { id: room.id }, data: { status: 'expired' } });
      return socket.emit('room:expired');
    }

    socket.join(`room:${roomCode}`);

    // If guest just joined, notify host
    if (room.guestId && room.guestId === userId) {
      socket.to(`room:${roomCode}`).emit('room:guest_joined', {
        guest: room.guest,
      });
    }

    socket.emit('room:state', room);
  });

  // Host starts the match
  socket.on('room:start', async ({ roomCode }: { roomCode: string }) => {
    const room = await prisma.friendRoom.findUnique({
      where: { roomCode },
      include: { host: true, guest: true }
    });

    if (!room) return socket.emit('room:error', { message: 'Room not found' });
    if (room.hostId !== userId) return socket.emit('room:error', { message: 'Only host can start' });
    if (!room.guestId) return socket.emit('room:error', { message: 'Waiting for opponent' });

    const questions = getQuestions(room.questionCount, room.difficulty as 'easy' | 'mixed' | 'hard');
    const matchId = uuidv4();

    // Create match in DB
    await prisma.match.create({
      data: {
        id: matchId,
        player1Id: room.hostId,
        player2Id: room.guestId,
        mode: 'friend',
        roomCode,
        questions,
      }
    });

    // Update room
    await prisma.friendRoom.update({
      where: { id: room.id },
      data: { status: 'active', matchId }
    });

    // Init game state
    initGame(io, matchId, room.hostId, room.guestId, questions, 'friend');

    // Send countdown to both
    let count = 3;
    const interval = setInterval(() => {
      io.to(`room:${roomCode}`).emit('room:countdown', { seconds: count });
      count--;
      if (count < 0) {
        clearInterval(interval);
        io.to(`room:${roomCode}`).emit('room:match_start', {
          matchId,
          questions: questions.map(q => ({ question: q.question, options: q.options })),
        });
      }
    }, 1000);
  });
}
