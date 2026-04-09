-- Unique constraint on (round, home, away) so the sync script can upsert fixtures
ALTER TABLE matches ADD CONSTRAINT matches_unique_fixture
  UNIQUE (round, home_team_id, away_team_id);
