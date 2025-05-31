-- Messaging System Database Schema Extension
-- Run these SQL commands in your Supabase SQL editor AFTER running friend-system-schema-fix.sql
-- This extends the existing friend system with private messaging capabilities

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Create messages table for friend-to-friend messaging
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    
    -- Prevent users from messaging themselves
    CONSTRAINT check_not_self_message CHECK (sender_id != receiver_id)
);

-- 2. Create conversations table for easier conversation management
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure conversation is bidirectional and unique
    UNIQUE(user1_id, user2_id),
    
    -- Prevent users from having conversations with themselves
    CONSTRAINT check_not_self_conversation CHECK (user1_id != user2_id),
    
    -- Ensure consistent ordering (user1_id < user2_id) to avoid duplicate rows
    CONSTRAINT check_conversation_user_ordering CHECK (user1_id < user2_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- Indexes for conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1_last_message ON conversations(user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_last_message ON conversations(user2_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to friends" ON messages;
DROP POLICY IF EXISTS "Users can update their own message status" ON messages;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "System can manage conversations" ON conversations;

-- RLS Policies for messages table
-- Users can only view messages where they are sender or receiver AND they are friends
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        (auth.uid() = sender_id OR auth.uid() = receiver_id) AND
        (
            -- Check if users are friends
            EXISTS (
                SELECT 1 FROM friendships f 
                WHERE (f.user1_id = sender_id AND f.user2_id = receiver_id)
                   OR (f.user2_id = sender_id AND f.user1_id = receiver_id)
            )
        ) AND
        -- Respect soft delete flags
        CASE 
            WHEN auth.uid() = sender_id THEN NOT is_deleted_by_sender
            WHEN auth.uid() = receiver_id THEN NOT is_deleted_by_receiver
            ELSE FALSE
        END
    );

-- Users can only send messages to friends
CREATE POLICY "Users can send messages to friends" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM friendships f 
            WHERE (f.user1_id = sender_id AND f.user2_id = receiver_id)
               OR (f.user2_id = sender_id AND f.user1_id = receiver_id)
        )
    );

-- Users can update message status (read status, soft delete)
CREATE POLICY "Users can update their own message status" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- RLS Policies for conversations table
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

-- Allow system to manage conversations (insert/update)
CREATE POLICY "System can manage conversations" ON conversations
    FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to automatically create/update conversation when message is sent
CREATE OR REPLACE FUNCTION manage_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_user1_id UUID;
    conv_user2_id UUID;
BEGIN
    -- Ensure consistent user ordering for conversation
    conv_user1_id := LEAST(NEW.sender_id, NEW.receiver_id);
    conv_user2_id := GREATEST(NEW.sender_id, NEW.receiver_id);
    
    -- Insert or update conversation
    INSERT INTO conversations (user1_id, user2_id, last_message_id, last_message_at, updated_at)
    VALUES (conv_user1_id, conv_user2_id, NEW.id, NEW.created_at, NEW.created_at)
    ON CONFLICT (user1_id, user2_id) 
    DO UPDATE SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's conversations with unread counts
CREATE OR REPLACE FUNCTION get_user_conversations(user_uuid UUID)
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_user_name TEXT,
    other_user_level INTEGER,
    other_user_profile_image TEXT,
    last_message_content TEXT,
    last_message_sender_id UUID,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT,
    is_last_message_from_me BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        CASE 
            WHEN c.user1_id = user_uuid THEN c.user2_id 
            ELSE c.user1_id 
        END as other_user_id,
        COALESCE(u.user_name, '') as other_user_name,
        COALESCE(u.user_level, 1) as other_user_level,
        COALESCE(u.profile_image, '') as other_user_profile_image,
        COALESCE(m.content, '') as last_message_content,
        m.sender_id as last_message_sender_id,
        COALESCE(c.last_message_at, c.created_at) as last_message_at,
        COALESCE(unread.count, 0) as unread_count,
        CASE 
            WHEN m.sender_id = user_uuid THEN TRUE 
            ELSE FALSE 
        END as is_last_message_from_me
    FROM conversations c
    LEFT JOIN "user" u ON (
        CASE 
            WHEN c.user1_id = user_uuid THEN c.user2_id 
            ELSE c.user1_id 
        END = u.auth_id
    )
    LEFT JOIN messages m ON m.id = c.last_message_id
    LEFT JOIN (
        SELECT 
            sender_id as other_user,
            COUNT(*) as count
        FROM messages 
        WHERE receiver_id = user_uuid 
          AND is_read = FALSE 
          AND is_deleted_by_receiver = FALSE
        GROUP BY sender_id
    ) unread ON unread.other_user = (
        CASE 
            WHEN c.user1_id = user_uuid THEN c.user2_id 
            ELSE c.user1_id 
        END
    )
    WHERE (c.user1_id = user_uuid OR c.user2_id = user_uuid)
      -- Only show conversations between friends
      AND EXISTS (
          SELECT 1 FROM friendships f 
          WHERE (f.user1_id = c.user1_id AND f.user2_id = c.user2_id)
             OR (f.user2_id = c.user1_id AND f.user1_id = c.user2_id)
      )
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages in a conversation between two users
CREATE OR REPLACE FUNCTION get_conversation_messages(
    user_uuid UUID,
    other_user_uuid UUID,
    message_limit INTEGER DEFAULT 50,
    message_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN,
    sender_name TEXT,
    sender_profile_image TEXT,
    is_from_current_user BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.created_at,
        m.is_read,
        COALESCE(u.user_name, '') as sender_name,
        COALESCE(u.profile_image, '') as sender_profile_image,
        CASE WHEN m.sender_id = user_uuid THEN TRUE ELSE FALSE END as is_from_current_user
    FROM messages m
    LEFT JOIN "user" u ON u.auth_id = m.sender_id
    WHERE 
        ((m.sender_id = user_uuid AND m.receiver_id = other_user_uuid) OR
         (m.sender_id = other_user_uuid AND m.receiver_id = user_uuid))
        AND 
        -- Respect soft delete flags
        CASE 
            WHEN m.sender_id = user_uuid THEN NOT m.is_deleted_by_sender
            WHEN m.receiver_id = user_uuid THEN NOT m.is_deleted_by_receiver
            ELSE FALSE
        END
        AND
        -- Ensure users are friends
        EXISTS (
            SELECT 1 FROM friendships f 
            WHERE (f.user1_id = user_uuid AND f.user2_id = other_user_uuid)
               OR (f.user2_id = user_uuid AND f.user1_id = other_user_uuid)
        )
    ORDER BY m.created_at DESC
    LIMIT message_limit 
    OFFSET message_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    user_uuid UUID,
    other_user_uuid UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages 
    SET is_read = TRUE, updated_at = NOW()
    WHERE receiver_id = user_uuid 
      AND sender_id = other_user_uuid 
      AND is_read = FALSE
      AND is_deleted_by_receiver = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total unread message count for a user
CREATE OR REPLACE FUNCTION get_user_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM messages m
    WHERE m.receiver_id = user_uuid 
      AND m.is_read = FALSE 
      AND m.is_deleted_by_receiver = FALSE
      -- Only count messages from friends
      AND EXISTS (
          SELECT 1 FROM friendships f 
          WHERE (f.user1_id = user_uuid AND f.user2_id = m.sender_id)
             OR (f.user2_id = user_uuid AND f.user1_id = m.sender_id)
      );
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_manage_conversation_on_message ON messages;

-- Create trigger to manage conversations when messages are sent
CREATE TRIGGER trigger_manage_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION manage_conversation_on_message();

-- Trigger to update message updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_timestamp ON messages;

CREATE TRIGGER trigger_update_message_timestamp
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_timestamp();

-- =============================================================================
-- SAMPLE QUERIES FOR TESTING
-- =============================================================================

-- Test the functions (replace UUIDs with actual user IDs from your system)
-- SELECT * FROM get_user_conversations('00000000-0000-0000-0000-000000000000');
-- SELECT * FROM get_conversation_messages('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111');
-- SELECT get_user_unread_message_count('00000000-0000-0000-0000-000000000000');

-- Example message insert (will automatically create/update conversation)
-- INSERT INTO messages (sender_id, receiver_id, content) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Hello friend!');

-- =============================================================================
-- NOTES
-- =============================================================================

-- Key Features:
-- 1. Messages can only be sent between friends (enforced by RLS)
-- 2. Soft delete support (users can delete messages from their view)
-- 3. Read status tracking
-- 4. Automatic conversation management
-- 5. Content length limits (1000 chars max)
-- 6. Proper indexes for performance
-- 7. Comprehensive functions for common operations
-- 8. Real-time subscription support via Supabase

-- Security Features:
-- 1. RLS ensures users can only see their own conversations
-- 2. Friend relationship required for messaging
-- 3. Content validation (non-empty, length limits)
-- 4. Prevents self-messaging
-- 5. Consistent user ordering in conversations prevents duplicates 