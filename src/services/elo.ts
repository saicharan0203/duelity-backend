// src/services/elo.ts
import { EloResult } from '../types';

const K = 32;

export function calculateElo(
  player1Rating: number,
  player2Rating: number,
  player1Won: boolean,
  isDraw: boolean = false
): EloResult {
  const expected1 = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
  const expected2 = 1 - expected1;

  const actual1 = isDraw ? 0.5 : player1Won ? 1 : 0;
  const actual2 = isDraw ? 0.5 : player1Won ? 0 : 1;

  const change1 = Math.round(K * (actual1 - expected1));
  const change2 = Math.round(K * (actual2 - expected2));

  return {
    player1NewRating: Math.max(100, player1Rating + change1),
    player2NewRating: Math.max(100, player2Rating + change2),
    player1Change: change1,
    player2Change: change2,
  };
}

export function getTier(rating: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (rating >= 1400) return 'diamond';
  if (rating >= 1000) return 'platinum';
  if (rating >= 700)  return 'gold';
  if (rating >= 400)  return 'silver';
  return 'bronze';
}
