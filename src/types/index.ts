// src/types/index.ts

export interface Question {
  question: string;
  options: string[];
  answer: string;
}

export interface PlayerAnswer {
  answer: string;
  timeTakenMs: number;
}

export interface MatchState {
  matchId: string;
  player1Id: string;
  player2Id: string;
  mode: 'ranked' | 'casual' | 'friend';
  questions: Question[];
  p1Score: number;
  p2Score: number;
  p1Answers: PlayerAnswer[];
  p2Answers: PlayerAnswer[];
  p1Ready: boolean;
  p2Ready: boolean;
  currentQuestion: number;
  p1Answered: boolean;
  p2Answered: boolean;
  startedAt: number;
}

export interface QueueEntry {
  userId: string;
  socketId: string;
  rating: number;
  mode: 'ranked' | 'casual';
  joinedAt: number;
}

export interface AuthenticatedSocket {
  userId: string;
  name: string;
  rating: number;
  tier: string;
}

export interface EloResult {
  player1NewRating: number;
  player2NewRating: number;
  player1Change: number;
  player2Change: number;
}
