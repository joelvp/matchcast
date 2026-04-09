-- Teams in the league
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL
);

-- Accumulated standings — updated by sync script after each round
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

-- Matches for rounds 1-8 (segunda fase, grupo B)
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 8),
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
  UNIQUE (user_id, match_id)
);

-- -----------------------------------------------------------------------------
-- Reference data — teams never change
-- -----------------------------------------------------------------------------

INSERT INTO teams (name, short_name) VALUES
  ('AD RIMAS',                              'Rimas'),
  ('LINIA 22 STERN MOTOR',                  'Linia 22'),
  ('UNIVERSITAT D''ALACANT - SAN VICENTE',  'Sanvi'),
  ('SPV',                                   'SPV'),
  ('CD GINER DE LOS RIOS',                  'Giner'),
  ('ILURO HC',                              'Iluro'),
  ('RH PRIVÉ BENALMÁDENA',                  'Benalmádena'),
  ('RC JOLASETA',                           'Jolaseta');
