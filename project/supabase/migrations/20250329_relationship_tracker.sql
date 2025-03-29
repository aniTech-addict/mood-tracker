-- Create relationship_events table
CREATE TABLE IF NOT EXISTS relationship_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  completion_percentage INTEGER DEFAULT 0,
  column_id TEXT CHECK (column_id IN ('mad', 'ultraMad', 'uDead'))
);

-- Set up RLS (Row Level Security)
ALTER TABLE relationship_events ENABLE ROW LEVEL SECURITY;

-- Create policy to only allow users to see their own entries
CREATE POLICY "Users can only view their own relationship entries"
  ON relationship_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to only allow users to insert their own entries
CREATE POLICY "Users can only insert their own relationship entries"
  ON relationship_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to only allow users to update their own entries
CREATE POLICY "Users can only update their own relationship entries"
  ON relationship_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to only allow users to delete their own entries
CREATE POLICY "Users can only delete their own relationship entries"
  ON relationship_events
  FOR DELETE
  USING (auth.uid() = user_id);
