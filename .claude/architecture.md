# Architecture

## Folder structure

```
matchcast/
├── app/                              # Next.js routing layer
│   ├── layout.tsx                    # Root layout (navbar, providers)
│   ├── page.tsx                      # Home: current standings + next round
│   ├── predict/page.tsx              # Prediction form per round
│   ├── standings/page.tsx            # Projected standings based on user predictions
│   ├── results/page.tsx              # Leaderboard after real results
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
│       ├── matchRepository.ts
│       ├── predictionRepository.ts
│       ├── standingsRepository.ts
│       └── userRepository.ts
│
├── components/                       # Pure UI — no business logic
│   ├── StandingsTable.tsx
│   ├── MatchCard.tsx
│   ├── PredictionForm.tsx
│   └── Leaderboard.tsx
│
└── supabase/
    ├── migrations/001_initial.sql
    └── functions/sync-results/index.ts
```

## Architecture principles

- `domain/` has **zero external dependencies** — pure TypeScript, no Supabase, no Next.js
- `infrastructure/` depends on `domain/` types but never the other way around
- `app/api/` routes call repositories to fetch data, then domain functions to process it
- Components receive data as props — they don't fetch or compute anything

## Domain logic

### Standings (`domain/standings.ts`)

Scoring: win = +3pts, draw = +1pt each, loss = 0pts.

`calculateProjectedStandings(baseStandings, predictions, matches)`:

1. Start from base standings (real data from `standings` table)
2. Apply each predicted result (resolving matchId → team IDs via `matches`)
3. Return sorted by: points → goal difference → goals scored

### Leaderboard (`domain/leaderboard.ts`)

| Result                                   | Points    |
| ---------------------------------------- | --------- |
| Exact score (predict 3-1, real 3-1)      | **5 pts** |
| Correct 1X2 only (predict 2-0, real 1-0) | **2 pts** |
| Wrong                                    | 0 pts     |

`calculateLeaderboard(allPredictions, realResults, users)` returns users ranked by total points.

## Testing

**Only test the domain layer.** It's the only layer with business logic that can fail silently. Infrastructure (Supabase calls) and UI components are not tested — the cost/benefit doesn't make sense for this project scope.

**Framework:** Vitest

```bash
npm run test        # run all tests (uses --passWithNoTests)
npm run test:watch  # watch mode
```

## Code conventions

- Strict TypeScript, no `any`
- Server Components by default — add `'use client'` only when hooks or browser events are needed
- API routes always use server Supabase client (service role)
- All Supabase queries must handle errors explicitly
- PascalCase for components, camelCase for functions and variables
- Tailwind only for styles — no inline style props
- Prettier enforced (`printWidth: 100`, `singleQuote`, `semi: false`, `trailingComma: all`)

## Quality gates

- **Husky pre-commit hook**: runs `tsc --noEmit`, `lint`, `format:check`, `test`
- **`pre-commit` skill**: detailed pass/fail report (invoke before every commit)
- **GitHub Actions CI**: same checks + `next build` on push to `dev` and PRs to `main`/`dev`

## API routes

| Route              | Method               | Description                          |
| ------------------ | -------------------- | ------------------------------------ |
| `/api/standings`   | GET                  | Current standings with team info     |
| `/api/predictions` | GET `?userId=<uuid>` | All predictions for a user           |
| `/api/predictions` | POST                 | Upsert a prediction                  |
| `/api/leaderboard` | GET                  | Accuracy ranking for finished rounds |

## Pages

### `app/page.tsx` — Home

Server Component: direct Supabase fetch for current standings + next upcoming round.

### `app/predict/page.tsx` — Predictions

`'use client'`. Tabs per round (R5–R8). Score inputs per match. POST to `/api/predictions`. Finished rounds shown read-only.

### `app/standings/page.tsx` — Projected standings

`'use client'`. Reads `userId` from localStorage. Runs `calculateProjectedStandings()` locally. Table with ↑↓ arrows vs current standings.

### `app/results/page.tsx` — Leaderboard

Server Component. Only finished rounds. Per-round breakdown: ✅ exact (5pts) / 🟡 1X2 (2pts) / ❌ miss.
