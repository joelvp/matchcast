@AGENTS.md

# matchcast — CLAUDE.md

## What is this project

**matchcast** is a league prediction app — built for a specific field hockey competition,
designed to be configurable for any league or sport.

Users predict match results for the remaining rounds of the season. The app shows:

- A projected standings table based on each user's predictions
- A leaderboard ranking users by prediction accuracy once real results are in

**Target league:** División de Honor B Masculina — Segunda Fase Grupo B (field hockey)
**League results URL:** https://resultadoshockey.isquad.es/competicion.php?id=8205&id_ambito=0&id_superficie=1&id_territorial=9999&seleccion=0

---

## Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 14 (App Router) + TypeScript                  |
| Styles             | Tailwind CSS + shadcn/ui                              |
| Database / Backend | Supabase (PostgreSQL + Edge Functions)                |
| Deployment         | Vercel                                                |
| Auto-sync          | Supabase Edge Function + pg_cron (every Sunday night) |

---

## Repository & branch strategy

```
main   → production (auto-deploy to Vercel prod)
dev    → development (auto-deploy to Vercel preview)
```

- All work branches off `dev`
- Open PRs into `dev`
- Merge `dev` → `main` to release to production

---

## Environments

|          | Dev                               | Prod                                  |
| -------- | --------------------------------- | ------------------------------------- |
| Frontend | Vercel preview URL                | `matchcast.vercel.app`                |
| Database | Supabase project: `matchcast-dev` | Supabase project: `matchcast-prod`    |
| pg_cron  | Disabled — trigger manually       | Enabled — runs every Sunday 22:00 CET |

Each environment has its own Supabase project with separate credentials.
Vercel environment variables are configured per-environment pointing to the correct Supabase project.

---

## Folder structure

```
matchcast/
├── app/                              # Next.js routing layer
│   ├── layout.tsx                    # Root layout (navbar, providers)
│   ├── page.tsx                      # Home: current standings + next round
│   ├── predict/
│   │   └── page.tsx                  # Prediction form per round
│   ├── standings/
│   │   └── page.tsx                  # Projected standings based on user predictions
│   ├── results/
│   │   └── page.tsx                  # Leaderboard after real results
│   └── api/
│       ├── predictions/route.ts      # GET + POST /api/predictions
│       ├── standings/route.ts        # GET /api/standings
│       └── leaderboard/route.ts      # GET /api/leaderboard
│
├── domain/                           # Core logic — no external dependencies
│   ├── types.ts                      # Match, Prediction, TeamStanding, User
│   ├── standings.ts                  # calculateProjectedStandings()
│   └── leaderboard.ts                # calculateLeaderboard(), scorePrediction()
│
├── infrastructure/                   # Everything that touches the outside world
│   └── supabase/
│       ├── client.ts                 # Browser Supabase client (anon key)
│       ├── server.ts                 # Server Supabase client (service role key)
│       ├── matchRepository.ts        # getMatches(), updateMatchResult()
│       ├── predictionRepository.ts   # getPredictions(), upsertPrediction()
│       ├── standingsRepository.ts    # getStandings(), updateStandings()
│       └── userRepository.ts         # getOrCreateUser()
│
├── components/                       # Pure UI — no business logic
│   ├── StandingsTable.tsx
│   ├── MatchCard.tsx
│   ├── PredictionForm.tsx
│   └── Leaderboard.tsx
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql
│   └── functions/
│       └── sync-results/
│           └── index.ts              # Edge Function scraper
│
└── CLAUDE.md
```

### Architecture principles

- `domain/` has **zero external dependencies** — pure TypeScript, no Supabase, no Next.js
- `infrastructure/` depends on `domain/` types but never the other way around
- `app/api/` routes are the entry point: they call repositories to fetch data, then domain functions to process it
- Components receive data as props — they don't fetch or compute anything

---

## Testing

**Only test the domain layer.** It's the only layer with business logic that can fail silently.

```
domain/standings.test.ts    ← projected standings calculation
domain/leaderboard.test.ts  ← prediction scoring logic
```

Infrastructure (Supabase calls) and UI components are not tested — the cost/benefit doesn't make sense for this project scope.

**Framework:** Vitest

```bash
npm run test        # run all tests
npm run test:watch  # watch mode
```

### Example tests

```ts
// domain/leaderboard.test.ts
import { describe, it, expect } from 'vitest'
import { scorePrediction } from './leaderboard'

describe('scorePrediction', () => {
  it('returns 5 points for exact result', () => {
    expect(scorePrediction({ home: 3, away: 1 }, { home: 3, away: 1 })).toBe(5)
  })

  it('returns 2 points for correct 1X2', () => {
    expect(scorePrediction({ home: 2, away: 0 }, { home: 1, away: 0 })).toBe(2)
  })

  it('returns 0 points for wrong prediction', () => {
    expect(scorePrediction({ home: 0, away: 1 }, { home: 2, away: 0 })).toBe(0)
  })
})
```

---

## Supabase schema

```sql
-- Teams in the league
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL
);

-- Accumulated standings (carried over from previous phase + real results from rounds 5-8)
-- Updated automatically after each round via Edge Function
CREATE TABLE standings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches for rounds 5-8
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  round INTEGER NOT NULL CHECK (round BETWEEN 5 AND 8),
  match_date DATE NOT NULL,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  home_goals INTEGER,   -- NULL until played
  away_goals INTEGER,   -- NULL until played
  is_finished BOOLEAN DEFAULT FALSE
);

-- Users (name only, no complex auth — UUID stored in localStorage)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User predictions per match
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  match_id INTEGER REFERENCES matches(id),
  home_goals INTEGER NOT NULL,
  away_goals INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);
```

---

## Seed data

### Teams

```sql
INSERT INTO teams (name, short_name) VALUES
  ('AD RIMAS', 'Rimas'),
  ('LINIA 22 STERN MOTOR', 'Linia 22'),
  ('UNIVERSITAT D''ALACANT - SAN VICENTE', 'Alacant'),
  ('SPV', 'SPV'),
  ('CD GINER DE LOS RIOS', 'Giner'),
  ('ILURO HC', 'Iluro'),
  ('RH PRIVÉ BENALMÁDENA', 'Benalmádena'),
  ('RC JOLASETA', 'Jolaseta');
```

### Starting standings (after round 4, points carried over from previous phase)

```sql
INSERT INTO standings (team_id, points, played, won, drawn, lost, goals_for, goals_against)
SELECT t.id, v.pts, v.pj, v.pg, v.pe, v.pp, v.gf, v.gc
FROM (VALUES
  ('AD RIMAS',                              19, 4, 6, 1, 3, 30, 16),
  ('LINIA 22 STERN MOTOR',                  18, 4, 5, 3, 2, 26, 16),
  ('UNIVERSITAT D''ALACANT - SAN VICENTE',  17, 4, 5, 2, 3, 33, 23),
  ('SPV',                                   16, 4, 5, 1, 4, 19, 23),
  ('CD GINER DE LOS RIOS',                  13, 4, 3, 4, 3, 20, 18),
  ('ILURO HC',                              12, 4, 4, 0, 6, 16, 30),
  ('RH PRIVÉ BENALMÁDENA',                  11, 4, 3, 2, 5, 21, 28),
  ('RC JOLASETA',                            7, 4, 2, 1, 7, 20, 31)
) AS v(name, pts, pj, pg, pe, pp, gf, gc)
JOIN teams t ON t.name = v.name;
```

### Matches (rounds 5–8)

```sql
-- Round 5 (April 11-12, 2026)
INSERT INTO matches (round, match_date, home_team_id, away_team_id) VALUES
  (5, '2026-04-11', (SELECT id FROM teams WHERE name='UNIVERSITAT D''ALACANT - SAN VICENTE'), (SELECT id FROM teams WHERE name='RH PRIVÉ BENALMÁDENA')),
  (5, '2026-04-11', (SELECT id FROM teams WHERE name='CD GINER DE LOS RIOS'),                 (SELECT id FROM teams WHERE name='LINIA 22 STERN MOTOR')),
  (5, '2026-04-11', (SELECT id FROM teams WHERE name='SPV'),                                  (SELECT id FROM teams WHERE name='ILURO HC')),
  (5, '2026-04-12', (SELECT id FROM teams WHERE name='AD RIMAS'),                             (SELECT id FROM teams WHERE name='RC JOLASETA'));

-- Round 6 (April 18-19, 2026)
INSERT INTO matches (round, match_date, home_team_id, away_team_id) VALUES
  (6, '2026-04-18', (SELECT id FROM teams WHERE name='UNIVERSITAT D''ALACANT - SAN VICENTE'), (SELECT id FROM teams WHERE name='CD GINER DE LOS RIOS')),
  (6, '2026-04-18', (SELECT id FROM teams WHERE name='ILURO HC'),                             (SELECT id FROM teams WHERE name='AD RIMAS')),
  (6, '2026-04-18', (SELECT id FROM teams WHERE name='RC JOLASETA'),                          (SELECT id FROM teams WHERE name='SPV')),
  (6, '2026-04-19', (SELECT id FROM teams WHERE name='LINIA 22 STERN MOTOR'),                 (SELECT id FROM teams WHERE name='RH PRIVÉ BENALMÁDENA'));

-- Round 7 (May 9-10, 2026)
INSERT INTO matches (round, match_date, home_team_id, away_team_id) VALUES
  (7, '2026-05-09', (SELECT id FROM teams WHERE name='AD RIMAS'),                             (SELECT id FROM teams WHERE name='LINIA 22 STERN MOTOR')),
  (7, '2026-05-09', (SELECT id FROM teams WHERE name='RH PRIVÉ BENALMÁDENA'),                 (SELECT id FROM teams WHERE name='ILURO HC')),
  (7, '2026-05-09', (SELECT id FROM teams WHERE name='SPV'),                                  (SELECT id FROM teams WHERE name='UNIVERSITAT D''ALACANT - SAN VICENTE')),
  (7, '2026-05-10', (SELECT id FROM teams WHERE name='CD GINER DE LOS RIOS'),                 (SELECT id FROM teams WHERE name='RC JOLASETA'));

-- Round 8 (May 16, 2026)
INSERT INTO matches (round, match_date, home_team_id, away_team_id) VALUES
  (8, '2026-05-16', (SELECT id FROM teams WHERE name='UNIVERSITAT D''ALACANT - SAN VICENTE'), (SELECT id FROM teams WHERE name='AD RIMAS')),
  (8, '2026-05-16', (SELECT id FROM teams WHERE name='LINIA 22 STERN MOTOR'),                 (SELECT id FROM teams WHERE name='SPV')),
  (8, '2026-05-16', (SELECT id FROM teams WHERE name='ILURO HC'),                             (SELECT id FROM teams WHERE name='CD GINER DE LOS RIOS')),
  (8, '2026-05-16', (SELECT id FROM teams WHERE name='RC JOLASETA'),                          (SELECT id FROM teams WHERE name='RH PRIVÉ BENALMÁDENA'));
```

---

## Domain logic

### Standings (`domain/standings.ts`)

Scoring system: win = +3pts, draw = +1pt each, loss = 0pts.

`calculateProjectedStandings(baseStandings, predictions)`:

1. Start from base standings (real data from `standings` table)
2. Apply each predicted result
3. Return projected standings sorted by: points → goal difference → goals scored

### Leaderboard (`domain/leaderboard.ts`)

| Result                                        | Points    |
| --------------------------------------------- | --------- |
| Exact score (e.g. predict 3-1, real 3-1)      | **5 pts** |
| Correct 1X2 only (e.g. predict 2-0, real 1-0) | **2 pts** |
| Wrong                                         | 0 pts     |

`calculateLeaderboard(allPredictions, realResults)` returns users ranked by total points.

---

## User flow

### Regular user

1. Enter name → creates entry in `users` (UUID saved to localStorage as `userId`)
2. View current standings on Home
3. Go to Predictions → fill in scores for each match in rounds 5-8
4. View projected standings based on their predictions
5. After each real round, view leaderboard in Results

### Admin (you)

- No admin panel needed: real results sync automatically via Edge Function every Sunday
- If scraper fails: update `matches.home_goals / away_goals / is_finished` directly in Supabase Dashboard

---

## API routes

| Route              | Method               | Description                          |
| ------------------ | -------------------- | ------------------------------------ |
| `/api/standings`   | GET                  | Current standings with team info     |
| `/api/predictions` | GET `?userId=<uuid>` | All predictions for a user           |
| `/api/predictions` | POST                 | Upsert a prediction                  |
| `/api/leaderboard` | GET                  | Accuracy ranking for finished rounds |

API routes always use `infrastructure/supabase/server.ts` (service role). Never the public client.

---

## Edge Function: sync-results

Path: `supabase/functions/sync-results/index.ts`

**What it does:**

1. Fetch each round page from resultadoshockey.isquad.es
2. Parse HTML to extract finished match scores
3. Update `matches` with `home_goals`, `away_goals`, `is_finished = true`
4. Recalculate `standings` by applying new results

**URLs to scrape:**

```
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=5&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=6&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=7&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=8&id_ambito=0&id_superficie=1
```

**Score format in HTML:** column `MARCADOR` — pending: `-`, finished: `X - Y`

**pg_cron schedule (prod only):**

```sql
SELECT cron.schedule(
  'sync-match-results',
  '0 21 * * 0',  -- Sundays 21:00 UTC = 22:00 CET (summer: change to 20:00 UTC)
  $$SELECT net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/sync-results',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  )$$
);
```

---

## Environment variables

### `.env.local` (Next.js)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # Server only — never exposed to client
```

### Supabase Edge Function secrets

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Pages

### `app/page.tsx` — Home

- Server Component: direct Supabase fetch for current standings
- Next upcoming round with its 4 matches

### `app/predict/page.tsx` — Predictions

- `'use client'` — needs state and user interaction
- Tabs per round (R5, R6, R7, R8)
- Score inputs per match (home / away)
- Save button → POST to `/api/predictions`
- Finished rounds shown as read-only

### `app/standings/page.tsx` — Projected standings

- `'use client'` — reads `userId` from localStorage
- Fetches user predictions, runs `calculateProjectedStandings()` locally
- Table with ↑↓ arrows vs current standings

### `app/results/page.tsx` — Leaderboard

- Server Component — only shows finished rounds
- Users ranked by total prediction points
- Per-round breakdown: ✅ exact (5pts) / 🟡 1X2 (2pts) / ❌ miss

---

## Code conventions

- Strict TypeScript, no `any`
- Server Components by default — add `'use client'` only when hooks or browser events are needed
- API routes always use server Supabase client (service role)
- All Supabase queries must handle errors explicitly
- PascalCase for components, camelCase for functions and variables
- Tailwind only for styles — no inline style props

---

## Useful commands

```bash
# Create project
npx create-next-app@latest matchcast --typescript --tailwind --app

# Add shadcn/ui
npx shadcn@latest init

# Add Vitest
npm install -D vitest

# Local dev
npm run dev

# Run tests
npm run test

# Deploy Edge Function
npx supabase functions deploy sync-results

# Trigger sync manually (dev)
curl -X POST https://<PROJECT-REF>.supabase.co/functions/v1/sync-results \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

---

## ⚠️ TODO: Migrate this file to modular structure

This file is intentionally kept as a single document to bootstrap the project quickly.
Once the project is up and running (after ~1 week of development), split it into:

```
matchcast/
├── CLAUDE.md                        # < 50 lines — project overview + @imports only
└── .claude/
    ├── architecture.md              # @import — folder structure, domain/infra principles, code conventions
    ├── database.md                  # @import — full schema + seed SQL
    ├── deployment.md                # @import — environments, Vercel, pg_cron, Edge Function
    └── commands/
        ├── sync.md                  # /sync — manually trigger the scraper
        └── test.md                  # /test — run Vitest
```

The root `CLAUDE.md` should then contain only:

```markdown
# matchcast

League prediction app — [one line description]

## Stack

[4-line table]

## Folder structure

[tree, no explanations]

@.claude/architecture.md
@.claude/database.md
@.claude/deployment.md
```

**Why:** Claude Code works best with CLAUDE.md files under 200 lines.
Splitting into `@imports` keeps each file focused and reduces context noise per session.
Reference: https://github.com/shanraisshan/claude-code-best-practice
