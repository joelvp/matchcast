# matchcast — Implementation plan

Living document tracking what's done and what's next. Update as work progresses.

## ✅ Done

### Project setup

- Next.js 16 + TypeScript + Tailwind scaffold
- Prettier (`printWidth: 100`, `singleQuote`, `semi: false`, `trailingComma: all`) + `prettier-plugin-tailwindcss`
- ESLint + `eslint-config-prettier`
- Vitest 4 (`npm run test` uses `--passWithNoTests`)
- Husky pre-commit hook (tsc, lint, format:check, test)
- `pre-commit` agent skill (detailed pass/fail report)
- GitHub Actions CI on push to `dev` and PRs to `main`/`dev` (tsc → lint → format:check → test → build)
- `.gitignore` for third-party skills (`.agents/`, `.claude/skills/*` with `!pre-commit` exception)
- `skills-lock.json` + README docs for `npx skills install`

### Database

- `supabase/migrations/001_initial.sql` — full schema (teams, standings, matches, users, predictions) + seed data (8 teams with `Sanvi` short name, starting standings after round 4, all 16 matches for rounds 5–8)
- Migration applied to `matchcast-dev` Supabase project

### Domain layer (`feature/domain-layer` branch)

- `domain/types.ts` — Score, TeamStanding, Match, Prediction, User, LeaderboardEntry
- `domain/standings.ts` — `calculateProjectedStandings(baseStandings, predictions, matches)`
- `domain/leaderboard.ts` — `scorePrediction()` (5/2/0) + `calculateLeaderboard()`
- `domain/standings.test.ts` + `domain/leaderboard.test.ts` — 19 tests passing

## 📋 Pending

### 1. Infrastructure layer (`infrastructure/supabase/`)

- `client.ts` — browser client (anon key)
- `server.ts` — server client (service role key)
- `matchRepository.ts` — `getMatches()`, `updateMatchResult()`
- `predictionRepository.ts` — `getPredictions()`, `upsertPrediction()`
- `standingsRepository.ts` — `getStandings()`, `updateStandings()`
- `userRepository.ts` — `getOrCreateUser()`

All repositories return `domain/types.ts` types. Errors handled explicitly.

### 2. API routes (`app/api/`)

- `GET /api/standings` — current standings with team info
- `GET /api/predictions?userId=<uuid>` — all predictions for a user
- `POST /api/predictions` — upsert a prediction
- `GET /api/leaderboard` — accuracy ranking for finished rounds

All routes use the **server** Supabase client (service role).

### 3. UI components (`components/`)

- `StandingsTable.tsx`
- `MatchCard.tsx`
- `PredictionForm.tsx`
- `Leaderboard.tsx`

Pure presentational — no fetching or business logic.

### 4. Pages (`app/`)

- `app/page.tsx` — Home (Server Component): current standings + next upcoming round
- `app/predict/page.tsx` (`'use client'`) — tabs per round (R5–R8), score inputs, save → `POST /api/predictions`
- `app/standings/page.tsx` (`'use client'`) — reads `userId` from localStorage, runs `calculateProjectedStandings()` locally, ↑↓ arrows vs current
- `app/results/page.tsx` (Server Component) — leaderboard with per-round breakdown ✅/🟡/❌

### 5. Auto-sync (`supabase/functions/sync-results/`)

- Edge Function `index.ts` — fetch round pages, parse `MARCADOR` column, update `matches`, recalculate `standings`
- Deploy: `npx supabase functions deploy sync-results`
- pg_cron schedule on **prod only**: Sundays 21:00 UTC

### 6. Production cutover

- Create `matchcast-prod` Supabase project
- Apply migration to prod
- Configure Vercel env vars per environment
- First merge `dev` → `main`
- Enable pg_cron on prod
