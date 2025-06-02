-- Fix for Friend Challenge Database Function
-- Run this SQL command in your Supabase SQL editor to fix the data type mismatch

-- Drop and recreate the function with correct data types
DROP FUNCTION IF EXISTS get_pending_friend_challenges(UUID);

CREATE OR REPLACE FUNCTION get_pending_friend_challenges(user_uuid UUID)
RETURNS TABLE (
    lobby_id UUID,
    challenger_id UUID,
    challenger_username TEXT,
    challenger_level SMALLINT,  -- Changed from INTEGER to SMALLINT to match your schema
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
        COALESCE(u.user_level, 1::smallint) as challenger_level,  -- Cast to smallint
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