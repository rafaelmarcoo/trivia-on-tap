-- Friend System Database Schema
-- Run these SQL commands in your Supabase SQL editor

-- First, let's check what columns exist in your user table
-- Run this query first to see your actual user table structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user';

-- 1. Create friend_requests table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate friend requests between same users
    UNIQUE(sender_id, receiver_id),
    
    -- Prevent users from sending friend requests to themselves
    CONSTRAINT check_not_self_request CHECK (sender_id != receiver_id)
);

-- 2. Create friendships table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure friendship is bidirectional and unique
    UNIQUE(user1_id, user2_id),
    
    -- Prevent users from being friends with themselves
    CONSTRAINT check_not_self_friendship CHECK (user1_id != user2_id),
    
    -- Ensure consistent ordering (user1_id < user2_id) to avoid duplicate rows
    CONSTRAINT check_user_ordering CHECK (user1_id < user2_id)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user table if not already enabled
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can respond to received friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete their sent friend requests" ON friend_requests;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "System can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

-- Drop existing user table policies for friend system
DROP POLICY IF EXISTS "Users can view their own profile" ON "user";
DROP POLICY IF EXISTS "Users can view basic info for friends" ON "user";
DROP POLICY IF EXISTS "Users can search other users" ON "user";

-- Create RLS policies for friend_requests
CREATE POLICY "Users can view their own friend requests" ON friend_requests
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send friend requests" ON friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can respond to received friend requests" ON friend_requests
    FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent friend requests" ON friend_requests
    FOR DELETE USING (auth.uid() = sender_id);

-- Create RLS policies for friendships
CREATE POLICY "Users can view their friendships" ON friendships
    FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

CREATE POLICY "System can create friendships" ON friendships
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their friendships" ON friendships
    FOR DELETE USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

-- Create RLS policies for user table to support friend system
CREATE POLICY "Users can view their own profile" ON "user"
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can view basic info for friends" ON "user"
    FOR SELECT USING (
        -- Allow viewing basic info if they are friends
        EXISTS (
            SELECT 1 FROM friendships f 
            WHERE (f.user1_id = auth.uid() AND f.user2_id = auth_id)
               OR (f.user2_id = auth.uid() AND f.user1_id = auth_id)
        )
        OR
        -- Allow viewing basic info if there's a pending friend request
        EXISTS (
            SELECT 1 FROM friend_requests fr 
            WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = auth_id)
                OR (fr.sender_id = auth_id AND fr.receiver_id = auth.uid()))
              AND fr.status = 'pending'
        )
    );

CREATE POLICY "Users can search other users" ON "user"
    FOR SELECT USING (
        -- Allow viewing basic info for search purposes (excluding sensitive data)
        auth.uid() IS NOT NULL AND auth_id != auth.uid()
    );

-- 6. Drop existing functions and triggers
DROP TRIGGER IF EXISTS trigger_create_friendship_on_accept ON friend_requests;
DROP FUNCTION IF EXISTS create_friendship_on_accept();
DROP FUNCTION IF EXISTS get_user_friends(UUID);
DROP FUNCTION IF EXISTS search_users_for_friends(UUID, TEXT);

-- 7. Create function to automatically create friendship when request is accepted
CREATE OR REPLACE FUNCTION create_friendship_on_accept()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status changed to 'accepted'
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Create friendship with consistent ordering
        INSERT INTO friendships (user1_id, user2_id)
        VALUES (
            LEAST(NEW.sender_id, NEW.receiver_id),
            GREATEST(NEW.sender_id, NEW.receiver_id)
        )
        ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for automatic friendship creation
CREATE TRIGGER trigger_create_friendship_on_accept
    AFTER UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_friendship_on_accept();

-- 9. Fixed function to get user's friends with flexible column handling
CREATE OR REPLACE FUNCTION get_user_friends(user_uuid UUID)
RETURNS TABLE (
    friend_id UUID,
    friend_username TEXT,
    friend_level INTEGER,
    friend_status TEXT,
    friend_profile_image TEXT,
    friendship_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f.user1_id = user_uuid THEN f.user2_id 
            ELSE f.user1_id 
        END as friend_id,
        COALESCE(u.user_name, '') as friend_username,
        COALESCE(u.user_level, 1) as friend_level,
        COALESCE(u.status, '') as friend_status,
        COALESCE(u.profile_image, '') as friend_profile_image,
        f.created_at as friendship_created_at
    FROM friendships f
    JOIN "user" u ON (
        CASE 
            WHEN f.user1_id = user_uuid THEN f.user2_id 
            ELSE f.user1_id 
        END = u.auth_id
    )
    WHERE f.user1_id = user_uuid OR f.user2_id = user_uuid
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fixed function to search users for friend requests
CREATE OR REPLACE FUNCTION search_users_for_friends(
    current_user_uuid UUID,
    search_term TEXT
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    user_level INTEGER,
    profile_image TEXT,
    is_friend BOOLEAN,
    has_pending_request BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.auth_id as user_id,
        COALESCE(u.user_name, '') as username,
        COALESCE(u.user_level, 1) as user_level,
        COALESCE(u.profile_image, '') as profile_image,
        EXISTS(
            SELECT 1 FROM friendships f 
            WHERE (f.user1_id = current_user_uuid AND f.user2_id = u.auth_id)
               OR (f.user2_id = current_user_uuid AND f.user1_id = u.auth_id)
        ) as is_friend,
        EXISTS(
            SELECT 1 FROM friend_requests fr 
            WHERE ((fr.sender_id = current_user_uuid AND fr.receiver_id = u.auth_id)
                OR (fr.sender_id = u.auth_id AND fr.receiver_id = current_user_uuid))
              AND fr.status = 'pending'
        ) as has_pending_request
    FROM "user" u
    WHERE u.auth_id != current_user_uuid
      AND u.user_name IS NOT NULL
      AND (
          LOWER(u.user_name) LIKE LOWER('%' || search_term || '%')
          OR u.user_name ILIKE '%' || search_term || '%'
      )
    ORDER BY u.user_name
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create a function to get friend request details with user info
DROP FUNCTION IF EXISTS get_friend_requests_with_users(UUID);

CREATE OR REPLACE FUNCTION get_friend_requests_with_users(user_uuid UUID)
RETURNS TABLE (
    request_id UUID,
    request_type TEXT,
    other_user_id UUID,
    other_user_name TEXT,
    other_user_level INTEGER,
    other_user_profile_image TEXT,
    request_status TEXT,
    request_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    -- Get received requests
    SELECT 
        fr.id::UUID as request_id,
        'received'::TEXT as request_type,
        fr.sender_id::UUID as other_user_id,
        COALESCE(u.user_name, '')::TEXT as other_user_name,
        COALESCE(u.user_level, 1)::INTEGER as other_user_level,
        COALESCE(u.profile_image, '')::TEXT as other_user_profile_image,
        COALESCE(fr.status, 'pending')::TEXT as request_status,
        fr.created_at::TIMESTAMP WITH TIME ZONE as request_created_at
    FROM friend_requests fr
    LEFT JOIN "user" u ON u.auth_id = fr.sender_id
    WHERE fr.receiver_id = user_uuid AND fr.status = 'pending'
    
    UNION ALL
    
    -- Get sent requests
    SELECT 
        fr.id::UUID as request_id,
        'sent'::TEXT as request_type,
        fr.receiver_id::UUID as other_user_id,
        COALESCE(u.user_name, '')::TEXT as other_user_name,
        COALESCE(u.user_level, 1)::INTEGER as other_user_level,
        COALESCE(u.profile_image, '')::TEXT as other_user_profile_image,
        COALESCE(fr.status, 'pending')::TEXT as request_status,
        fr.created_at::TIMESTAMP WITH TIME ZONE as request_created_at
    FROM friend_requests fr
    LEFT JOIN "user" u ON u.auth_id = fr.receiver_id
    WHERE fr.sender_id = user_uuid AND fr.status = 'pending'
    
    ORDER BY request_created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Test the functions to make sure they work
-- SELECT * FROM get_user_friends('00000000-0000-0000-0000-000000000000');
-- SELECT * FROM search_users_for_friends('00000000-0000-0000-0000-000000000000', 'test'); 
-- SELECT * FROM get_friend_requests_with_users('00000000-0000-0000-0000-000000000000'); 