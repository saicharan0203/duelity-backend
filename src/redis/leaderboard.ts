// src/redis/leaderboard.ts
import { redis } from './client';
import { prisma } from '../prisma/client';

const INDIA_KEY = 'leaderboard:india';
const COLLEGE_KEY = (id: string) => `leaderboard:college:${id}`;

export async function updateLeaderboard(userId: string, rating: number, collegeId?: string | null) {
  await redis.zadd(INDIA_KEY, rating, userId);
  if (collegeId) {
    await redis.zadd(COLLEGE_KEY(collegeId), rating, userId);
  }
}

export async function getIndiaRank(userId: string): Promise<number> {
  const total = await redis.zcard(INDIA_KEY);
  const rank = await redis.zrevrank(INDIA_KEY, userId);
  return rank !== null ? rank + 1 : total + 1;
}

export async function getCollegeRank(userId: string, collegeId: string): Promise<number> {
  const rank = await redis.zrevrank(COLLEGE_KEY(collegeId), userId);
  return rank !== null ? rank + 1 : 999;
}

// Seed leaderboard from DB (called on server start)
export async function seedLeaderboard() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, rating: true, collegeId: true }
    });
    for (const user of users) {
      await redis.zadd(INDIA_KEY, user.rating, user.id);
      if (user.collegeId) {
        await redis.zadd(COLLEGE_KEY(user.collegeId), user.rating, user.id);
      }
    }
    console.log(`✅ Leaderboard seeded with ${users.length} users`);
  } catch (err) {
    console.error('Failed to seed leaderboard:', err);
  }
}
