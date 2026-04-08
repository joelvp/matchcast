-- Add shield_url column to teams table
ALTER TABLE teams ADD COLUMN shield_url TEXT;

-- Paths relativos al bucket team-shields en Supabase Storage
UPDATE teams SET shield_url = 'team-shields/rimas.png'       WHERE short_name = 'Rimas';
UPDATE teams SET shield_url = 'team-shields/linia22.png'    WHERE short_name = 'Linia 22';
UPDATE teams SET shield_url = 'team-shields/sanvi.png'       WHERE short_name = 'Sanvi';
UPDATE teams SET shield_url = 'team-shields/spv.png'         WHERE short_name = 'SPV';
UPDATE teams SET shield_url = 'team-shields/giner.png'       WHERE short_name = 'Giner';
UPDATE teams SET shield_url = 'team-shields/iluro.png'       WHERE short_name = 'Iluro';
UPDATE teams SET shield_url = 'team-shields/benalmadena.png' WHERE short_name = 'Benalmádena';
UPDATE teams SET shield_url = 'team-shields/jolaseta.png'    WHERE short_name = 'Jolaseta';
