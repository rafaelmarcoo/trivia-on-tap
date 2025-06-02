-- Friend Challenge System Database Schema Updates
-- Run these SQL commands in your Supabase SQL editor to enhance the challenge system

-- 1. Add missing columns to game_lobbies table
ALTER TABLE game_lobbies 
ADD COLUMN IF NOT EXISTS invited_friend_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS categories JSONB,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS lobby_type VARCHAR(50) DEFAULT 'public';

-- 2. Create friend_challenge_answers table to track both players' answers
CREATE TABLE IF NOT EXISTS friend_challenge_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lobby_id UUID NOT NULL REFERENCES game_lobbies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    time_taken INTEGER, -- seconds taken to answer
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one answer per user per question per lobby
    UNIQUE(lobby_id, user_id, question_id)
);

-- 3. Create challenge_results table to store final challenge outcomes
CREATE TABLE IF NOT EXISTS challenge_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lobby_id UUID NOT NULL REFERENCES game_lobbies(id) ON DELETE CASCADE,
    challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenged_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenger_score INTEGER NOT NULL DEFAULT 0,
    challenged_score INTEGER NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES auth.users(id),
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_lobbies_invited_friend ON game_lobbies(invited_friend_id);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_lobby_type ON game_lobbies(lobby_type);
CREATE INDEX IF NOT EXISTS idx_friend_challenge_answers_lobby ON friend_challenge_answers(lobby_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenge_answers_user ON friend_challenge_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_results_lobby ON challenge_results(lobby_id);
CREATE INDEX IF NOT EXISTS idx_challenge_results_challenger ON challenge_results(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenge_results_challenged ON challenge_results(challenged_id);

-- 5. Enable RLS on new tables
ALTER TABLE friend_challenge_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for friend_challenge_answers
CREATE POLICY "Users can view answers from their challenge lobbies" ON friend_challenge_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM game_lobby_players glp 
            WHERE glp.lobby_id = friend_challenge_answers.lobby_id 
            AND glp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own answers" ON friend_challenge_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON friend_challenge_answers
    FOR UPDATE USING (auth.uid() = user_id);

-- 7. Create RLS policies for challenge_results
CREATE POLICY "Users can view results from their challenges" ON challenge_results
    FOR SELECT USING (
        auth.uid() = challenger_id OR auth.uid() = challenged_id
    );

CREATE POLICY "System can create challenge results" ON challenge_results
    FOR INSERT WITH CHECK (true);

-- 8. Create function to get pending friend challenges
CREATE OR REPLACE FUNCTION get_pending_friend_challenges(user_uuid UUID)
RETURNS TABLE (
    lobby_id UUID,
    challenger_id UUID,
    challenger_username TEXT,
    challenger_level INTEGER,
    challenger_profile_image TEXT,
    categories JSONB,
    difficulty TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gl.id as lobby_id,
        gl.host_id as challenger_id,
        COALESCE(u.user_name, '') as challenger_username,
        COALESCE(u.user_level, 1) as challenger_level,
        COALESCE(u.profile_image, '') as challenger_profile_image,
        gl.categories,
        gl.difficulty,
        gl.created_at
    FROM game_lobbies gl
    JOIN "user" u ON gl.host_id = u.auth_id
    WHERE gl.invited_friend_id = user_uuid
    AND gl.lobby_type = 'friend_challenge'
    AND gl.status = 'waiting'
    ORDER BY gl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to calculate challenge results
CREATE OR REPLACE FUNCTION calculate_challenge_results(lobby_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    challenger_score INTEGER := 0;
    challenged_score INTEGER := 0;
    challenger_user_id UUID;
    challenged_user_id UUID;
    total_questions INTEGER := 0;
    winner_user_id UUID := NULL;
    result JSONB;
BEGIN
    -- Get challenger and challenged user IDs
    SELECT host_id, invited_friend_id 
    INTO challenger_user_id, challenged_user_id
    FROM game_lobbies 
    WHERE id = lobby_uuid;
    
    IF challenger_user_id IS NULL OR challenged_user_id IS NULL THEN
        RETURN '{"error": "Invalid lobby or missing participants"}'::JSONB;
    END IF;
    
    -- Calculate scores
    SELECT COUNT(*) INTO challenger_score
    FROM friend_challenge_answers
    WHERE lobby_id = lobby_uuid AND user_id = challenger_user_id AND is_correct = true;
    
    SELECT COUNT(*) INTO challenged_score
    FROM friend_challenge_answers
    WHERE lobby_id = lobby_uuid AND user_id = challenged_user_id AND is_correct = true;
    
    -- Get total questions
    SELECT COUNT(DISTINCT question_id) INTO total_questions
    FROM friend_challenge_answers
    WHERE lobby_id = lobby_uuid;
    
    -- Determine winner
    IF challenger_score > challenged_score THEN
        winner_user_id := challenger_user_id;
    ELSIF challenged_score > challenger_score THEN
        winner_user_id := challenged_user_id;
    -- IF scores are equal, winner_user_id remains NULL (tie)
    END IF;
    
    -- Store results
    INSERT INTO challenge_results (
        lobby_id, challenger_id, challenged_id, 
        challenger_score, challenged_score, winner_id, total_questions
    ) VALUES (
        lobby_uuid, challenger_user_id, challenged_user_id,
        challenger_score, challenged_score, winner_user_id, total_questions
    );
    
    -- Return results
    result := jsonb_build_object(
        'challenger_score', challenger_score,
        'challenged_score', challenged_score,
        'total_questions', total_questions,
        'winner_id', winner_user_id,
        'is_tie', (winner_user_id IS NULL)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update game_lobbies status options to include challenge-specific statuses
-- Add constraint to ensure valid status values
ALTER TABLE game_lobbies DROP CONSTRAINT IF EXISTS game_lobbies_status_check;
ALTER TABLE game_lobbies ADD CONSTRAINT game_lobbies_status_check 
CHECK (status IN ('waiting', 'starting', 'in_progress', 'completed', 'cancelled', 'challenge_accepted')); 