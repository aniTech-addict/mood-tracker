-- Add punishments field to mood_entries table
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS punishments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
