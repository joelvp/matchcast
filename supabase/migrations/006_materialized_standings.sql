-- Carryover points from the phase prior to round 1 (static, never updated by sync)
CREATE TABLE carryover (
  team_id      INTEGER PRIMARY KEY REFERENCES teams(id),
  points       INTEGER NOT NULL DEFAULT 0,
  played       INTEGER NOT NULL DEFAULT 0,
  won          INTEGER NOT NULL DEFAULT 0,
  drawn        INTEGER NOT NULL DEFAULT 0,
  lost         INTEGER NOT NULL DEFAULT 0,
  goals_for    INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0
);

INSERT INTO carryover (team_id, points, played, won, drawn, lost, goals_for, goals_against) VALUES
  (1, 12, 6, 4, 0, 2, 18,  8),  -- AD RIMAS
  (2, 10, 6, 3, 1, 2, 15,  9),  -- LINIA 22 STERN MOTOR
  (3, 13, 6, 4, 1, 1, 23, 11),  -- UNIVERSITAT D'ALACANT - SAN VICENTE
  (4, 13, 6, 4, 1, 1, 12, 11),  -- SPV
  (5,  8, 6, 2, 2, 2, 10, 10),  -- CD GINER DE LOS RIOS
  (6,  9, 6, 3, 0, 3,  8, 16),  -- ILURO HC
  (7,  1, 6, 0, 1, 5,  9, 20),  -- RH PRIVÉ BENALMÁDENA
  (8,  3, 6, 1, 0, 5, 13, 23);  -- RC JOLASETA

-- Materialized view: carryover + all finished/live match results
-- Refreshed explicitly via refresh_standings() after every sync run
CREATE MATERIALIZED VIEW current_standings AS
WITH match_results AS (
  SELECT
    home_team_id AS team_id,
    CASE WHEN home_goals > away_goals THEN 3 WHEN home_goals = away_goals THEN 1 ELSE 0 END AS points,
    1 AS played,
    CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END AS won,
    CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END AS drawn,
    CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END AS lost,
    home_goals AS goals_for,
    away_goals AS goals_against
  FROM matches
  WHERE is_finished = TRUE OR is_live = TRUE
  UNION ALL
  SELECT
    away_team_id,
    CASE WHEN away_goals > home_goals THEN 3 WHEN away_goals = home_goals THEN 1 ELSE 0 END,
    1,
    CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END,
    CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END,
    CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END,
    away_goals,
    home_goals
  FROM matches
  WHERE is_finished = TRUE OR is_live = TRUE
),
aggregated AS (
  SELECT
    team_id,
    SUM(points)        AS points,
    SUM(played)        AS played,
    SUM(won)           AS won,
    SUM(drawn)         AS drawn,
    SUM(lost)          AS lost,
    SUM(goals_for)     AS goals_for,
    SUM(goals_against) AS goals_against
  FROM match_results
  GROUP BY team_id
)
SELECT
  t.id                                                          AS team_id,
  t.name,
  t.short_name,
  t.shield_url,
  COALESCE(c.points, 0)        + COALESCE(a.points, 0)        AS points,
  COALESCE(c.played, 0)        + COALESCE(a.played, 0)        AS played,
  COALESCE(c.won, 0)           + COALESCE(a.won, 0)           AS won,
  COALESCE(c.drawn, 0)         + COALESCE(a.drawn, 0)         AS drawn,
  COALESCE(c.lost, 0)          + COALESCE(a.lost, 0)          AS lost,
  COALESCE(c.goals_for, 0)     + COALESCE(a.goals_for, 0)     AS goals_for,
  COALESCE(c.goals_against, 0) + COALESCE(a.goals_against, 0) AS goals_against
FROM teams t
LEFT JOIN carryover c ON c.team_id = t.id
LEFT JOIN aggregated a ON a.team_id = t.id;

-- Unique index required for CONCURRENTLY refresh (no read locks during update)
CREATE UNIQUE INDEX current_standings_team_id_idx ON current_standings (team_id);

-- Called by the sync Edge Function after updating match results
CREATE OR REPLACE FUNCTION refresh_standings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_standings;
END;
$$;

DROP TABLE standings;
