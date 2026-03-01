# duelity.in — Backend

Real-time 1v1 math battle platform. Node.js + TypeScript + Socket.io + PostgreSQL + Redis.

---

## Stack (100% Free)

| Service | Provider | Cost |
|---------|----------|------|
| Node.js API | Render.com | Free |
| PostgreSQL | Supabase | Free |
| Redis | Upstash | Free |
| Auth | Firebase | Free |
| Frontend | Vercel | Free |

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in your values (see below)
```

### 3. Set up Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy the **Connection String** from Settings → Database
3. Paste into `DATABASE_URL` in `.env`

### 4. Set up Upstash (Redis)
1. Go to [upstash.com](https://upstash.com) → Create Database
2. Copy the **Redis URL** (starts with `rediss://`)
3. Paste into `REDIS_URL` in `.env`

### 5. Set up Firebase Auth
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Authentication → Enable Email/Password + Google
3. Project Settings → Service Accounts → Generate New Private Key
4. Copy the entire JSON and paste as `FIREBASE_SERVICE_ACCOUNT` in `.env`

### 6. Push database schema
```bash
npm run db:push
```

### 7. Seed colleges
```bash
npx tsx prisma/seed.ts
```

### 8. Run dev server
```bash
npm run dev
```

Server starts on `http://localhost:3001`

---

## API Routes

### Auth
```
POST /api/auth/verify-token          — Login / register, returns onboarding flags
POST /api/auth/complete-assessment   — Save assessment result, set isNewUser=false
POST /api/auth/set-college           — Save college selection
```

### Users
```
GET  /api/users/me                   — Current user profile + ranks
PATCH /api/users/me                  — Update name or college
GET  /api/users/me/matches           — Recent match history
GET  /api/users/:id                  — Public profile
```

### Leaderboard
```
GET /api/leaderboard/india           — Top 100 nationally
GET /api/leaderboard/india/me        — Your rank + surrounding players
GET /api/leaderboard/college/:id     — Top 100 in a college
GET /api/leaderboard/college/:id/me  — Your college rank
```

### Colleges
```
GET  /api/colleges?q=iit             — Search colleges
POST /api/colleges/request           — Request new college
```

### Friend Rooms
```
POST /api/rooms/create               — Create room, get code
POST /api/rooms/join                 — Join by code
GET  /api/rooms/:code                — Get room status
PATCH /api/rooms/:code/settings      — Update settings (host only)
```

---

## Socket.io Events

### Connect
```js
const socket = io('http://localhost:3001', {
  auth: { token: firebaseIdToken }
});
```

### Matchmaking
```
Client → server:
  queue:join    { mode: 'ranked' | 'casual' }
  queue:leave

Server → client:
  match:found   { matchId, questions, opponent }
  queue:waiting { position }
```

### Game
```
Client → server:
  game:ready    { matchId }
  game:answer   { matchId, questionIndex, answer, timeTakenMs }

Server → client:
  game:countdown         { seconds }
  game:start             { matchId, questionIndex }
  game:opponent_answered { questionIndex, correct, timeTakenMs }
  game:question_result   { questionIndex, correctAnswer, p1Score, p2Score }
  game:next_question     { questionIndex }
  game:end               { winnerId, p1Score, p2Score, p1RatingChange, p2RatingChange, isDraw }
```

### Friend Room
```
Client → server:
  room:join    { roomCode }
  room:start   { roomCode }

Server → client:
  room:state         { room object }
  room:guest_joined  { guest }
  room:countdown     { seconds }
  room:match_start   { matchId, questions }
  room:error         { message }
  room:expired
```

---

## Deploy to Render.com (Free)

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Build command: `npm install && npm run build && npm run db:push`
5. Start command: `npm start`
6. Add all environment variables from `.env`
7. Deploy!

---

## Project Structure

```
src/
├── index.ts              # Entry point, Express + Socket.io setup
├── types/index.ts        # Shared TypeScript interfaces
├── middleware/
│   ├── firebase.ts       # Firebase Admin SDK init
│   └── auth.ts           # JWT verification middleware
├── prisma/
│   └── client.ts         # Prisma singleton
├── redis/
│   ├── client.ts         # Redis connection
│   └── leaderboard.ts    # Sorted set helpers
├── routes/
│   ├── auth.ts           # /api/auth/*
│   ├── users.ts          # /api/users/*
│   ├── colleges.ts       # /api/colleges/*
│   ├── leaderboard.ts    # /api/leaderboard/*
│   └── rooms.ts          # /api/rooms/*
├── services/
│   ├── elo.ts            # ELO calculation
│   └── questions.ts      # Question bank (free, no AI)
└── socket/
    ├── matchmaking.ts    # Queue + match finding
    ├── game.ts           # Game state machine
    └── friendRoom.ts     # Friend room events
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # College seeder
```
