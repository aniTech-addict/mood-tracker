/*
  # Create mood entries table

  1. New Tables
    - `mood_entries`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `mood` (text)
      - `event` (text)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `mood_entries` table
    - Add policies for authenticated users to:
      - Read their own entries
      - Create new entries
*/

CREATE TABLE mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  mood text NOT NULL,
  event text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid()
);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entries"
  ON mood_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entries"
  ON mood_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);