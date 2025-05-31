import { getSupabase } from './supabase'

/**
 * Messaging System Utilities
 * User Story: "As a player, I want to send private messages to my friends so that I can communicate with them outside of the game."
 * 
 * Implementation following TDD approach - GREEN phase
 */

/**
 * Send a message to a friend
 * @param {string} receiverId - The UUID of the friend to send message to
 * @param {string} content - The message content
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const sendMessage = async (receiverId, content) => {
  try {
    // Input validation
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Message content cannot be empty' }
    }

    if (content.length > 1000) {
      return { success: false, error: 'Message content exceeds maximum length of 1000 characters' }
    }

    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check if users are friends first
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${user.id})`)
      .single()

    if (!friendship) {
      return { success: false, error: 'You can only send messages to friends' }
    }

    // Send the message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim()
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's conversations list with unread counts
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const getConversations = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use the database function we created
    const { data, error } = await supabase
      .rpc('get_user_conversations', { user_uuid: user.id })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting conversations:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get messages in a conversation between current user and another user
 * @param {string} otherUserId - The UUID of the other user
 * @param {number} limit - Number of messages to retrieve (default: 50)
 * @param {number} offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const getMessagesInConversation = async (otherUserId, limit = 50, offset = 0) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use the database function we created
    const { data, error } = await supabase
      .rpc('get_conversation_messages', {
        user_uuid: user.id,
        other_user_uuid: otherUserId,
        message_limit: limit,
        message_offset: offset
      })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting conversation messages:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark messages from a specific user as read
 * @param {string} otherUserId - The UUID of the user whose messages to mark as read
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const markMessagesAsRead = async (otherUserId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use the database function we created
    const { data, error } = await supabase
      .rpc('mark_messages_as_read', {
        user_uuid: user.id,
        other_user_uuid: otherUserId
      })

    if (error) throw error

    return { success: true, data: { updated_count: data || 0 } }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get total unread message count for current user
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const getUnreadMessageCount = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use the database function we created
    const { data, error } = await supabase
      .rpc('get_user_unread_message_count', { user_uuid: user.id })

    if (error) throw error

    return { success: true, data: { count: data || 0 } }
  } catch (error) {
    console.error('Error getting unread message count:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Soft delete a message for current user
 * @param {string} messageId - The UUID of the message to delete
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const deleteMessage = async (messageId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Update message to mark as deleted for current user
    const { data, error } = await supabase
      .from('messages')
      .update({
        is_deleted_by_sender: true,
        is_deleted_by_receiver: true
      })
      .eq('id', messageId)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return { success: false, error: 'Message not found or unauthorized' }
    }

    return { success: true, data: { deleted: true } }
  } catch (error) {
    console.error('Error deleting message:', error)
    return { success: false, error: error.message || 'Message not found or unauthorized' }
  }
} 