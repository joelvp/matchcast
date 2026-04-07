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
  home_goals INTEGER, -- NULL until played
  away_goals INTEGER, -- NULL until played
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
-- Seed data
-- -----------------------------------------------------------------------------

INSERT INTO
  teams (name, short_name)
VALUES
  ('AD RIMAS', 'Rimas'),
  ('LINIA 22 STERN MOTOR', 'Linia 22'),
  ('UNIVERSITAT D''ALACANT - SAN VICENTE', 'Sanvi'),
  ('SPV', 'SPV'),
  ('CD GINER DE LOS RIOS', 'Giner'),
  ('ILURO HC', 'Iluro'),
  ('RH PRIVÉ BENALMÁDENA', 'Benalmádena'),
  ('RC JOLASETA', 'Jolaseta');

-- Starting standings after round 4 (points carried over from previous phase)
INSERT INTO
  standings (
    team_id,
    points,
    played,
    won,
    drawn,
    lost,
    goals_for,
    goals_against
  )
SELECT
  t.id,
  v.pts,
  v.pj,
  v.pg,
  v.pe,
  v.pp,
  v.gf,
  v.gc
FROM
  (
    VALUES
      ('AD RIMAS', 19, 4, 6, 1, 3, 30, 16),
      ('LINIA 22 STERN MOTOR', 18, 4, 5, 3, 2, 26, 16),
      ('UNIVERSITAT D''ALACANT - SAN VICENTE', 17, 4, 5, 2, 3, 33, 23),
      ('SPV', 16, 4, 5, 1, 4, 19, 23),
      ('CD GINER DE LOS RIOS', 13, 4, 3, 4, 3, 20, 18),
      ('ILURO HC', 12, 4, 4, 0, 6, 16, 30),
      ('RH PRIVÉ BENALMÁDENA', 11, 4, 3, 2, 5, 21, 28),
      ('RC JOLASETA', 7, 4, 2, 1, 7, 20, 31)
  ) AS v(name, pts, pj, pg, pe, pp, gf, gc)
  JOIN teams t ON t.name = v.name;

-- Round 5 (April 11-12, 2026)
INSERT INTO
  matches (round, match_date, home_team_id, away_team_id)
VALUES
  (
    5,
    '2026-04-11',
    (SELECT id FROM teams WHERE name = 'UNIVERSITAT D''ALACANT - SAN VICENTE'),
    (SELECT id FROM teams WHERE name = 'RH PRIVÉ BENALMÁDENA')
  ),
  (
    5,
    '2026-04-11',
    (SELECT id FROM teams WHERE name = 'CD GINER DE LOS RIOS'),
    (SELECT id FROM teams WHERE name = 'LINIA 22 STERN MOTOR')
  ),
  (
    5,
    '2026-04-11',
    (SELECT id FROM teams WHERE name = 'SPV'),
    (SELECT id FROM teams WHERE name = 'ILURO HC')
  ),
  (
    5,
    '2026-04-12',
    (SELECT id FROM teams WHERE name = 'AD RIMAS'),
    (SELECT id FROM teams WHERE name = 'RC JOLASETA')
  );

-- Round 6 (April 18-19, 2026)
INSERT INTO
  matches (round, match_date, home_team_id, away_team_id)
VALUES
  (
    6,
    '2026-04-18',
    (SELECT id FROM teams WHERE name = 'UNIVERSITAT D''ALACANT - SAN VICENTE'),
    (SELECT id FROM teams WHERE name = 'CD GINER DE LOS RIOS')
  ),
  (
    6,
    '2026-04-18',
    (SELECT id FROM teams WHERE name = 'ILURO HC'),
    (SELECT id FROM teams WHERE name = 'AD RIMAS')
  ),
  (
    6,
    '2026-04-18',
    (SELECT id FROM teams WHERE name = 'RC JOLASETA'),
    (SELECT id FROM teams WHERE name = 'SPV')
  ),
  (
    6,
    '2026-04-19',
    (SELECT id FROM teams WHERE name = 'LINIA 22 STERN MOTOR'),
    (SELECT id FROM teams WHERE name = 'RH PRIVÉ BENALMÁDENA')
  );

-- Round 7 (May 9-10, 2026)
INSERT INTO
  matches (round, match_date, home_team_id, away_team_id)
VALUES
  (
    7,
    '2026-05-09',
    (SELECT id FROM teams WHERE name = 'AD RIMAS'),
    (SELECT id FROM teams WHERE name = 'LINIA 22 STERN MOTOR')
  ),
  (
    7,
    '2026-05-09',
    (SELECT id FROM teams WHERE name = 'RH PRIVÉ BENALMÁDENA'),
    (SELECT id FROM teams WHERE name = 'ILURO HC')
  ),
  (
    7,
    '2026-05-09',
    (SELECT id FROM teams WHERE name = 'SPV'),
    (SELECT id FROM teams WHERE name = 'UNIVERSITAT D''ALACANT - SAN VICENTE')
  ),
  (
    7,
    '2026-05-10',
    (SELECT id FROM teams WHERE name = 'CD GINER DE LOS RIOS'),
    (SELECT id FROM teams WHERE name = 'RC JOLASETA')
  );

-- Round 8 (May 16, 2026)
INSERT INTO
  matches (round, match_date, home_team_id, away_team_id)
VALUES
  (
    8,
    '2026-05-16',
    (SELECT id FROM teams WHERE name = 'UNIVERSITAT D''ALACANT - SAN VICENTE'),
    (SELECT id FROM teams WHERE name = 'AD RIMAS')
  ),
  (
    8,
    '2026-05-16',
    (SELECT id FROM teams WHERE name = 'LINIA 22 STERN MOTOR'),
    (SELECT id FROM teams WHERE name = 'SPV')
  ),
  (
    8,
    '2026-05-16',
    (SELECT id FROM teams WHERE name = 'ILURO HC'),
    (SELECT id FROM teams WHERE name = 'CD GINER DE LOS RIOS')
  ),
  (
    8,
    '2026-05-16',
    (SELECT id FROM teams WHERE name = 'RC JOLASETA'),
    (SELECT id FROM teams WHERE name = 'RH PRIVÉ BENALMÁDENA')
  );
