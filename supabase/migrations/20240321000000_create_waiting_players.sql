-- Create waiting_players table
CREATE TABLE IF NOT EXISTS public.waiting_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.waiting_players ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all waiting players
CREATE POLICY "Allow authenticated users to view waiting players"
  ON public.waiting_players
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to add themselves to waiting list
CREATE POLICY "Allow authenticated users to add themselves to waiting list"
  ON public.waiting_players
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own waiting player record
CREATE POLICY "Allow authenticated users to update their own waiting player record"
  ON public.waiting_players
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to remove themselves from waiting list
CREATE POLICY "Allow authenticated users to remove themselves from waiting list"
  ON public.waiting_players
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id); 