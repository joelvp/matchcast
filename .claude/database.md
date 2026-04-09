# Database

Schema and seed data live in `supabase/migrations/001_initial.sql`. This file is the human-readable reference; the SQL file is the source of truth.

## Schema

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

## Seed data

### Teams (8)

| Name                                | Short name  |
| ----------------------------------- | ----------- |
| AD RIMAS                            | Rimas       |
| LINIA 22 STERN MOTOR                | Linia 22    |
| UNIVERSITAT D'ALACANT - SAN VICENTE | Sanvi       |
| SPV                                 | SPV         |
| CD GINER DE LOS RIOS                | Giner       |
| ILURO HC                            | Iluro       |
| RH PRIVÉ BENALMÁDENA                | Benalmádena |
| RC JOLASETA                         | Jolaseta    |

### Starting standings (after round 4)

Points carried over from the previous phase. See `001_initial.sql` for the full INSERT.

### Matches

All 16 matches for rounds 5–8 (April–May 2026) — see migration file.
