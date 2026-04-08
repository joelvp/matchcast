-- Change match_date from DATE to TIMESTAMPTZ to store kickoff time
ALTER TABLE matches
  ALTER COLUMN match_date TYPE TIMESTAMPTZ USING match_date::TIMESTAMPTZ;
