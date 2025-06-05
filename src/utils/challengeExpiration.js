import { getSupabase } from './supabase'

// Expire challenges that haven't been accepted after 2 minutes
const CHALLENGE_EXPIRATION_MINUTES = 2

/**
 * Clean up expired challenges from the database
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const expireOldChallenges = async () => {
  try {
    const supabase = getSupabase()
    
    // Calculate expiration time (2 minutes ago)
    const expirationTime = new Date()
    expirationTime.setMinutes(expirationTime.getMinutes() - CHALLENGE_EXPIRATION_MINUTES)
    
    console.log('Checking for challenges older than:', expirationTime.toISOString())
    
    // Find expired challenges that are still waiting
    const { data: expiredChallenges, error: findError } = await supabase
      .from('game_lobbies')
      .select('id, host_id, invited_friend_id, created_at')
      .eq('lobby_type', 'friend_challenge')
      .eq('status', 'waiting')
      .lt('created_at', expirationTime.toISOString())
    
    if (findError) {
      console.error('Error finding expired challenges:', findError)
      return { success: false, error: findError.message }
    }
    
    console.log('Found expired challenges:', expiredChallenges?.length || 0)
    
    if (!expiredChallenges || expiredChallenges.length === 0) {
      return { success: true, data: { expiredCount: 0 } }
    }
    
    // Get the IDs of expired challenges
    const expiredLobbyIds = expiredChallenges.map(c => c.id)
    
    // Delete associated lobby players first (foreign key constraint)
    const { error: playersDeleteError } = await supabase
      .from('game_lobby_players')
      .delete()
      .in('lobby_id', expiredLobbyIds)
    
    if (playersDeleteError) {
      console.error('Error deleting expired challenge players:', playersDeleteError)
    }
    
    // Delete the expired challenges
    const { error: deleteError } = await supabase
      .from('game_lobbies')
      .delete()
      .in('id', expiredLobbyIds)
    
    if (deleteError) {
      console.error('Error deleting expired challenges:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    console.log(`Successfully expired ${expiredChallenges.length} old challenges`)
    
    return {
      success: true,
      data: {
        expiredCount: expiredChallenges.length,
        expiredChallenges: expiredChallenges
      }
    }
  } catch (err) {
    console.error('Error in expireOldChallenges:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Set up automatic challenge expiration that runs periodically
 * This should be called once when the app starts
 */
export const setupChallengeExpiration = () => {
  // Run expiration check every 30 seconds for quick testing
  const EXPIRATION_CHECK_INTERVAL = 30 * 1000 // 30 seconds in milliseconds
  
  // Initial run
  console.log('Setting up challenge expiration system...')
  expireOldChallenges()
  
  // Set up interval for periodic cleanup
  const intervalId = setInterval(() => {
    console.log('Running periodic challenge expiration check...')
    expireOldChallenges()
  }, EXPIRATION_CHECK_INTERVAL)
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up challenge expiration system...')
    clearInterval(intervalId)
  }
} 