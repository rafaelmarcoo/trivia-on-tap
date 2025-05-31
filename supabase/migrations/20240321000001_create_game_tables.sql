-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type TEXT NOT NULL CHECK (game_type IN ('single_player', 'multiplayer')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_level INTEGER DEFAULT 1
);

-- Create game_questions table
CREATE TABLE IF NOT EXISTS public.game_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_taken INTEGER,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create game_lobbies table
CREATE TABLE IF NOT EXISTS public.game_lobbies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'starting', 'in_progress', 'completed')),
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER NOT NULL DEFAULT 1,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create game_lobby_players table
CREATE TABLE IF NOT EXISTS public.game_lobby_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID REFERENCES public.game_lobbies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(lobby_id, user_id)
);

-- Add RLS policies
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_lobby_players ENABLE ROW LEVEL SECURITY;

-- Game Sessions policies
CREATE POLICY "Allow users to view their own game sessions"
  ON public.game_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow users to create their own game sessions"
  ON public.game_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own game sessions"
  ON public.game_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Game Questions policies
CREATE POLICY "Allow users to view questions from their sessions"
  ON public.game_questions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs 
    WHERE gs.id = game_session_id 
    AND (gs.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.game_lobby_players glp 
      JOIN public.game_lobbies gl ON gl.id = glp.lobby_id 
      WHERE gl.game_session_id = gs.id 
      AND glp.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Allow users to create questions for their sessions"
  ON public.game_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.game_sessions gs 
    WHERE gs.id = game_session_id 
    AND gs.user_id = auth.uid()
  ));

CREATE POLICY "Allow users to update questions from their sessions"
  ON public.game_questions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs 
    WHERE gs.id = game_session_id 
    AND (gs.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.game_lobby_players glp 
      JOIN public.game_lobbies gl ON gl.id = glp.lobby_id 
      WHERE gl.game_session_id = gs.id 
      AND glp.user_id = auth.uid()
    ))
  ));

-- Game Lobbies policies
CREATE POLICY "Allow users to view all lobbies"
  ON public.game_lobbies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to create lobbies"
  ON public.game_lobbies
  FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Allow users to update lobbies they are in"
  ON public.game_lobbies
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.game_lobby_players glp 
    WHERE glp.lobby_id = id 
    AND glp.user_id = auth.uid()
  ));

-- Game Lobby Players policies
CREATE POLICY "Allow users to view all lobby players"
  ON public.game_lobby_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to join lobbies"
  ON public.game_lobby_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to leave lobbies"
  ON public.game_lobby_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()); 