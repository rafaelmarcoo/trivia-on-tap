-- Fix for Friend Challenge Database Function (Version 2)
-- Run this SQL command in your Supabase SQL editor to fix ALL data type mismatches

-- Drop and recreate the function with correct data types matching your exact schema
DROP FUNCTION IF EXISTS get_pending_friend_challenges(UUID);

CREATE OR REPLACE FUNCTION get_pending_friend_challenges(user_uuid UUID)
RETURNS TABLE (
    lobby_id UUID,
    challenger_id UUID,
    challenger_username TEXT,
    challenger_level SMALLINT,  -- Matches your user.user_level smallint
    challenger_profile_image TEXT,
    categories JSONB,
    difficulty VARCHAR(20),  -- Changed from TEXT to VARCHAR(20) to match your schema
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gl.id as lobby_id,
        gl.host_id as challenger_id,
        COALESCE(u.user_name, '') as challenger_username,
        COALESCE(u.user_level, 1::smallint) as challenger_level,
        COALESCE(u.profile_image, '') as challenger_profile_image,
        gl.categories,
        gl.difficulty,  -- This will now return VARCHAR(20) as expected
        gl.created_at
    FROM game_lobbies gl
    JOIN "user" u ON gl.host_id = u.auth_id
    WHERE gl.invited_friend_id = user_uuid
    AND gl.lobby_type = 'friend_challenge'
    AND gl.status = 'waiting'
    ORDER BY gl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 