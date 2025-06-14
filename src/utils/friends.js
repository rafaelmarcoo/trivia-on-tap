import { getSupabase } from './supabase'

/**
 * Send a friend request to another user
 * @param {string} receiverId - The UUID of the user to send request to
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const sendFriendRequest = async (receiverId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Check if already friends using correct ordering
    const user1_id = user.id < receiverId ? user.id : receiverId
    const user2_id = user.id < receiverId ? receiverId : user.id
    
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .single()
    
    if (friendship) {
      throw new Error('You are already friends with this user')
    }
    
    // Check for pending friend requests (both directions)
    const { data: existingRequest1 } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .single()
    
    const { data: existingRequest2 } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', receiverId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .single()
    
    if (existingRequest1 || existingRequest2) {
      throw new Error('Friend request already pending')
    }
    
    // Send friend request
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Error sending friend request:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Accept a friend request
 * @param {string} requestId - The ID of the friend request to accept
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const acceptFriendRequest = async (requestId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Step 1: Update request status to 'accepted' (this triggers the database function to create friendship)
    const { data: updatedRequest, error: updateError } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('receiver_id', user.id) // Ensure user can only accept requests sent to them
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError) throw updateError
    if (!updatedRequest) throw new Error('Friend request not found or unauthorized')
    
    // Step 2: Clean up the friend request using database function (bypasses RLS)
    try {
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_accepted_friend_request', { request_uuid: requestId })
      
      console.log('Cleanup result:', { cleanupResult, cleanupError })
      
      if (cleanupError) {
        console.warn('Database function cleanup failed:', cleanupError)
      } else if (!cleanupResult) {
        console.warn('No friend request was cleaned up by database function')
      } else {
        console.log('Successfully cleaned up friend request via database function')
      }
    } catch (cleanupFunctionError) {
      console.log('Database function not available, falling back to direct delete')
      
      // Fallback to direct delete (may fail due to RLS)
      const { data: deletedData, error: deleteError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .select()
      
      console.log('Direct delete result:', { deletedData, deleteError })
      
      if (deleteError) {
        console.warn('Failed to clean up friend request after acceptance:', deleteError)
      } else if (!deletedData || deletedData.length === 0) {
        console.warn('No friend request was deleted - likely due to RLS policy restrictions')
      } else {
        console.log('Successfully cleaned up friend request via direct delete:', deletedData[0])
      }
    }
    
    return { success: true, data: { accepted: updatedRequest } }
  } catch (error) {
    console.error('Error accepting friend request:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reject a friend request
 * @param {string} requestId - The ID of the friend request to reject
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const rejectFriendRequest = async (requestId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Update request status to rejected
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('receiver_id', user.id) // Ensure user can only reject requests sent to them
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Friend request not found or unauthorized')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error rejecting friend request:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel a sent friend request
 * @param {string} requestId - The ID of the friend request to cancel
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const cancelFriendRequest = async (requestId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Delete the friend request
    const { data, error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user.id) // Ensure user can only cancel requests they sent
      .select()
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Friend request not found or unauthorized')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error canceling friend request:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove a friend (delete friendship)
 * @param {string} friendId - The UUID of the friend to remove
 * @returns {Promise<Object>} Result object with success status and data/error
 */
export const removeFriend = async (friendId) => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Respect the database constraint: user1_id < user2_id
    // Determine the correct ordering for the friendship record
    const user1_id = user.id < friendId ? user.id : friendId
    const user2_id = user.id < friendId ? friendId : user.id
    
    // Delete the friendship with correct ordering
    const { data: friendshipData, error: friendshipError } = await supabase
      .from('friendships')
      .delete()
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .select()
    
    if (friendshipError) throw friendshipError
    
    if (!friendshipData || friendshipData.length === 0) {
      throw new Error('Friendship not found or already removed')
    }
    
    return { success: true, data: friendshipData[0] }
  } catch (error) {
    console.error('Error removing friend:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's friends list
 * @returns {Promise<Object>} Result object with success status and friends data/error
 */
export const getFriends = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Try using the database function first
    try {
      const { data, error } = await supabase
        .rpc('get_user_friends', { user_uuid: user.id })
      
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (rpcError) {
      console.log('RPC function failed, using fallback query:', rpcError.message)
      
      // Fallback to manual query - get friendships where user is either user1 or user2
      const { data: friendships1, error: error1 } = await supabase
        .from('friendships')
        .select('*, friend:user2_id(*)')
        .eq('user1_id', user.id)
      
      const { data: friendships2, error: error2 } = await supabase
        .from('friendships')
        .select('*, friend:user1_id(*)')
        .eq('user2_id', user.id)
      
      if (error1 && error2) {
        throw new Error('Failed to fetch friendships')
      }
      
      const allFriendships = [...(friendships1 || []), ...(friendships2 || [])]
      
      // Transform the data to match expected format
      const transformedData = allFriendships.map(friendship => {
        const isFriendUser1 = friendship.user1_id !== user.id
        const friendId = isFriendUser1 ? friendship.user1_id : friendship.user2_id
        
        return {
          friend_id: friendId,
          friend_username: friendship.friend?.user_name || '',
          friend_level: friendship.friend?.user_level || 1,
          friend_status: friendship.friend?.status || '',
          friend_profile_image: friendship.friend?.profile_image || '',
          friendship_created_at: friendship.created_at
        }
      })
      
      return { success: true, data: transformedData }
    }
  } catch (error) {
    console.error('Error fetching friends:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get pending friend requests (both sent and received)
 * @returns {Promise<Object>} Result object with success status and requests data/error
 */
export const getFriendRequests = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Try using the new database function first
    try {
      const { data, error } = await supabase
        .rpc('get_friend_requests_with_users', { user_uuid: user.id })
      
      if (error) throw error
      
      // Transform the data to match expected format
      const received = (data || [])
        .filter(req => req.request_type === 'received')
        .map(req => ({
          id: req.request_id,
          sender_id: req.other_user_id,
          status: req.request_status,
          created_at: req.request_created_at,
          sender: {
            user_name: req.other_user_name,
            user_level: req.other_user_level,
            profile_image: req.other_user_profile_image
          }
        }))
      
      const sent = (data || [])
        .filter(req => req.request_type === 'sent')
        .map(req => ({
          id: req.request_id,
          receiver_id: req.other_user_id,
          status: req.request_status,
          created_at: req.request_created_at,
          receiver: {
            user_name: req.other_user_name,
            user_level: req.other_user_level,
            profile_image: req.other_user_profile_image
          }
        }))
      
      return { 
        success: true, 
        data: { received, sent }
      }
    } catch (rpcError) {
      console.log('RPC function failed, using fallback approach:', rpcError.message)
      
      // Fallback to the previous approach
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          status,
          created_at
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (receivedError) throw receivedError
      
      const { data: sentRequests, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          receiver_id,
          status,
          created_at
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (sentError) throw sentError
      
      // Try to fetch user details for each request
      const enrichedReceived = await Promise.all(
        (receivedRequests || []).map(async (request) => {
          try {
            const { data: senderData } = await supabase
              .from('user')
              .select('user_name, user_level, profile_image')
              .eq('auth_id', request.sender_id)
              .single()
            
            return {
              ...request,
              sender: senderData || { user_name: 'Friend User', user_level: 1, profile_image: '' }
            }
          } catch (error) {
            console.log('Could not fetch sender data:', error.message)
            return {
              ...request,
              sender: { user_name: 'Friend User', user_level: 1, profile_image: '' }
            }
          }
        })
      )
      
      const enrichedSent = await Promise.all(
        (sentRequests || []).map(async (request) => {
          try {
            const { data: receiverData } = await supabase
              .from('user')
              .select('user_name, user_level, profile_image')
              .eq('auth_id', request.receiver_id)
              .single()
            
            return {
              ...request,
              receiver: receiverData || { user_name: 'Friend User', user_level: 1, profile_image: '' }
            }
          } catch (error) {
            console.log('Could not fetch receiver data:', error.message)
            return {
              ...request,
              receiver: { user_name: 'Friend User', user_level: 1, profile_image: '' }
            }
          }
        })
      )
      
      return { 
        success: true, 
        data: {
          received: enrichedReceived,
          sent: enrichedSent
        }
      }
    }
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Search for users to send friend requests to
 * @param {string} searchTerm - The search term to find users
 * @returns {Promise<Object>} Result object with success status and users data/error
 */
export const searchUsers = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return { success: true, data: [] }
    }
    
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Try using the database function first
    try {
      const { data, error } = await supabase
        .rpc('search_users_for_friends', { 
          current_user_uuid: user.id,
          search_term: searchTerm.trim()
        })
      
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (rpcError) {
      console.log('RPC search function failed, using fallback query:', rpcError.message)
      
      // Fallback to manual query if RPC function fails
      const { data: users, error: usersError } = await supabase
        .from('user')
        .select('auth_id, user_name, user_level, profile_image')
        .neq('auth_id', user.id)
        .ilike('user_name', `%${searchTerm.trim()}%`)
        .not('user_name', 'is', null)
        .order('user_name')
        .limit(20)
      
      if (usersError) throw usersError
      
      // For each user, check if they're already friends or have pending requests
      const enrichedUsers = await Promise.all(
        users.map(async (searchUser) => {
          // Check if already friends using correct ordering
          const user1_id = user.id < searchUser.auth_id ? user.id : searchUser.auth_id
          const user2_id = user.id < searchUser.auth_id ? searchUser.auth_id : user.id
          
          const { data: friendship } = await supabase
            .from('friendships')
            .select('id')
            .eq('user1_id', user1_id)
            .eq('user2_id', user2_id)
            .single()
          
          // Check if has pending request
          const { data: request1 } = await supabase
            .from('friend_requests')
            .select('id')
            .eq('sender_id', user.id)
            .eq('receiver_id', searchUser.auth_id)
            .eq('status', 'pending')
            .single()
          
          const { data: request2 } = await supabase
            .from('friend_requests')
            .select('id')
            .eq('sender_id', searchUser.auth_id)
            .eq('receiver_id', user.id)
            .eq('status', 'pending')
            .single()
          
          return {
            user_id: searchUser.auth_id,
            username: searchUser.user_name || '',
            user_level: searchUser.user_level || 1,
            profile_image: searchUser.profile_image || '',
            is_friend: !!friendship,
            has_pending_request: !!(request1 || request2)
          }
        })
      )
      
      return { success: true, data: enrichedUsers }
    }
  } catch (error) {
    console.error('Error searching users:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get friend request counts for notifications
 * @returns {Promise<Object>} Result object with success status and counts data/error
 */
export const getFriendRequestCounts = async () => {
  try {
    const supabase = getSupabase()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')
    
    // Get count of received pending requests
    const { count, error } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    
    if (error) throw error
    
    return { success: true, data: { pendingRequests: count || 0 } }
  } catch (error) {
    console.error('Error fetching friend request counts:', error)
    return { success: false, error: error.message }
  }
} 