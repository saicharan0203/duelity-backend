// src/socket/game.ts
import { Server, Socket } from 'socket.io';
import { MatchState, Question, PlayerAnswer } from '../types';
import { prisma } from '../prisma/client';
import { calculateElo, getTier } from '../services/elo';
import { updateLeaderboard } from '../redis/leaderboard';

// In-memory game states
const activeGames = new Map<string, MatchState>();

const QUESTION_TIME_MS = 10000; // 10 seconds per question
const RESULT_SHOW_MS   = 2000;  // Show result for 2s before next question

export function initGame(
  io: Server,
  matchId: string,
  player1Id: string,
  player2Id: string,
  questions: Question[],
  mode: 'ranked' | 'casual' | 'friend'
) {
  const state: MatchState = {
    matchId,
    player1Id,
    player2Id,
    mode,
    questions,
    p1Score: 0,
    p2Score: 0,
    p1Answers: [],
    p2Answers: [],
    p1Ready: false,
    p2Ready: false,
    currentQuestion: 0,
    p1Answered: false,
    p2Answered: false,
    startedAt: 0,
  };
  activeGames.set(matchId, state);
}

export function setupGame(io: Server, socket: Socket, userId: string) {

  // Player signals they loaded the battle screen
  socket.on('game:ready', ({ matchId }: { matchId: string }) => {
    const state = activeGames.get(matchId);
    if (!state) return;

    socket.join(matchId);

    if (state.player1Id === userId) state.p1Ready = true;
    if (state.player2Id === userId) state.p2Ready = true;

    if (state.p1Ready && state.p2Ready && state.startedAt === 0) {
      state.startedAt = Date.now();

      // Countdown then start
      let countdown = 3;
      const countInterval = setInterval(() => {
        io.to(matchId).emit('game:countdown', { seconds: countdown });
        countdown--;
        if (countdown < 0) {
          clearInterval(countInterval);
          io.to(matchId).emit('game:start', { matchId, questionIndex: 0 });
          startQuestionTimer(io, matchId);
        }
      }, 1000);
    }
  });

  // Player submits an answer
  socket.on('game:answer', ({ matchId, questionIndex, answer, timeTakenMs }:
    { matchId: string; questionIndex: number; answer: string; timeTakenMs: number }) => {

    const state = activeGames.get(matchId);
    if (!state) return;
    if (state.currentQuestion !== questionIndex) return;

    const isP1 = state.player1Id === userId;
    const isP2 = state.player2Id === userId;
    if (!isP1 && !isP2) return;

    // Prevent double answer
    if (isP1 && state.p1Answered) return;
    if (isP2 && state.p2Answered) return;

    const q = state.questions[questionIndex];
    const correct = answer === q.answer;
    const playerAnswer: PlayerAnswer = { answer, timeTakenMs };

    if (isP1) {
      state.p1Answered = true;
      state.p1Answers.push(playerAnswer);
      if (correct) state.p1Score += 10;
    } else {
      state.p2Answered = true;
      state.p2Answers.push(playerAnswer);
      if (correct) state.p2Score += 10;
    }

    // Tell the opponent that this player answered (without revealing the answer)
    const opponentId = isP1 ? state.player2Id : state.player1Id;
    io.to(matchId).except(socket.id).emit('game:opponent_answered', {
      questionIndex,
      correct,
      timeTakenMs,
    });

    // If both answered, resolve immediately
    if (state.p1Answered && state.p2Answered) {
      resolveQuestion(io, matchId);
    }
  });
}

function startQuestionTimer(io: Server, matchId: string) {
  const state = activeGames.get(matchId);
  if (!state) return;

  // Auto-resolve after 10 seconds
  setTimeout(() => {
    const current = activeGames.get(matchId);
    if (!current) return;
    if (current.currentQuestion === state.currentQuestion) {
      resolveQuestion(io, matchId);
    }
  }, QUESTION_TIME_MS + 500); // +500ms buffer
}

function resolveQuestion(io: Server, matchId: string) {
  const state = activeGames.get(matchId);
  if (!state) return;

  const q = state.questions[state.currentQuestion];

  io.to(matchId).emit('game:question_result', {
    questionIndex: state.currentQuestion,
    correctAnswer: q.answer,
    p1Score: state.p1Score,
    p2Score: state.p2Score,
  });

  state.currentQuestion++;
  state.p1Answered = false;
  state.p2Answered = false;

  if (state.currentQuestion >= state.questions.length) {
    // Match over — resolve after result shown
    setTimeout(() => endMatch(io, matchId), RESULT_SHOW_MS);
  } else {
    // Next question after result shown
    setTimeout(() => {
      io.to(matchId).emit('game:next_question', { questionIndex: state.currentQuestion });
      startQuestionTimer(io, matchId);
    }, RESULT_SHOW_MS);
  }
}

async function endMatch(io: Server, matchId: string) {
  const state = activeGames.get(matchId);
  if (!state) return;

  activeGames.delete(matchId);

  const isDraw   = state.p1Score === state.p2Score;
  const p1Won    = state.p1Score > state.p2Score;
  const winnerId = isDraw ? null : p1Won ? state.player1Id : state.player2Id;

  // ELO only for ranked
  let p1Change = 0, p2Change = 0;
  if (state.mode === 'ranked') {
    const [p1, p2] = await Promise.all([
      prisma.user.findUnique({ where: { id: state.player1Id } }),
      prisma.user.findUnique({ where: { id: state.player2Id } }),
    ]);

    if (p1 && p2) {
      const elo = calculateElo(p1.rating, p2.rating, p1Won, isDraw);
      p1Change = elo.player1Change;
      p2Change = elo.player2Change;

      const p1Accuracy = state.p1Answers.filter((a, i) => a.answer === state.questions[i]?.answer).length / state.questions.length;
      const p2Accuracy = state.p2Answers.filter((a, i) => a.answer === state.questions[i]?.answer).length / state.questions.length;

      // Update both users
      await Promise.all([
        prisma.user.update({
          where: { id: state.player1Id },
          data: {
            rating: elo.player1NewRating,
            tier: getTier(elo.player1NewRating),
            totalMatches: { increment: 1 },
            wins: p1Won ? { increment: 1 } : undefined,
            losses: !p1Won && !isDraw ? { increment: 1 } : undefined,
            accuracy: p1Accuracy,
          }
        }),
        prisma.user.update({
          where: { id: state.player2Id },
          data: {
            rating: elo.player2NewRating,
            tier: getTier(elo.player2NewRating),
            totalMatches: { increment: 1 },
            wins: !p1Won && !isDraw ? { increment: 1 } : undefined,
            losses: p1Won ? { increment: 1 } : undefined,
            accuracy: p2Accuracy,
          }
        }),
        updateLeaderboard(state.player1Id, elo.player1NewRating, p1.collegeId),
        updateLeaderboard(state.player2Id, elo.player2NewRating, p2.collegeId),
      ]);
    }
  } else {
    // Non-ranked — still update match counts
    await Promise.all([
      prisma.user.update({ where: { id: state.player1Id }, data: { totalMatches: { increment: 1 }, wins: p1Won ? { increment: 1 } : undefined, losses: !p1Won && !isDraw ? { increment: 1 } : undefined } }),
      prisma.user.update({ where: { id: state.player2Id }, data: { totalMatches: { increment: 1 }, wins: !p1Won && !isDraw ? { increment: 1 } : undefined, losses: p1Won ? { increment: 1 } : undefined } }),
    ]);
  }

  // Save final match record
  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId,
      p1Score: state.p1Score,
      p2Score: state.p2Score,
      p1RatingChange: p1Change,
      p2RatingChange: p2Change,
      p1Answers: state.p1Answers,
      p2Answers: state.p2Answers,
      durationSecs: Math.round((Date.now() - state.startedAt) / 1000),
    }
  });

  // Emit result to both players
  io.to(matchId).emit('game:end', {
    winnerId,
    p1Score: state.p1Score,
    p2Score: state.p2Score,
    p1RatingChange: p1Change,
    p2RatingChange: p2Change,
    isDraw,
  });
}
