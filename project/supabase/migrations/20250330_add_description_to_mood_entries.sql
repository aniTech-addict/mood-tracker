-- Add description field to mood_entries table
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS description TEXT;
