'use client'

import { useState, useEffect } from 'react'
import { Gamepad2, Trophy, Clock, CheckCircle, XCircle, Star, User } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'

export default function ChallengeInvitations({ onChallengeAccepted }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingChallengeId, setProcessingChallengeId] = useState(null)

  useEffect(() => {
    loadChallenges()
    
    // Subscribe to real-time challenge updates
    const supabase = getSupabase()
    const channel = supabase
      .channel('challenge_invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_lobbies',
        filter: 'lobby_type=eq.friend_challenge'
      }, () => {
        loadChallenges()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadChallenges = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Get pending challenges using the database function
      const { data, error } = await supabase.rpc('get_pending_friend_challenges', {
        user_uuid: user.id
      })

      if (error) throw error
      setChallenges(data || [])
    } catch (err) {
      console.error('Error loading challenges:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChallengeResponse = async (lobbyId, accept) => {
    try {
      setProcessingChallengeId(lobbyId)
      setError(null)

      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      if (accept) {
        // Accept the challenge
        // 1. Add user to lobby players
        const { error: joinError } = await supabase
          .from('game_lobby_players')
          .insert({
            lobby_id: lobbyId,
            user_id: user.id
          })

        if (joinError) throw joinError

        // 2. Update lobby status and player count
        const { error: updateError } = await supabase
          .from('game_lobbies')
          .update({
            status: 'challenge_accepted',
            current_players: 2
          })
          .eq('id', lobbyId)

        if (updateError) throw updateError

        // 3. Notify parent component
        onChallengeAccepted?.(lobbyId)
        
        // 4. Navigate to challenge game
        window.location.href = `/dashboard/friends/challenge?lobby=${lobbyId}`
      } else {
        // Reject the challenge
        const { error: updateError } = await supabase
          .from('game_lobbies')
          .update({
            status: 'cancelled'
          })
          .eq('id', lobbyId)

        if (updateError) throw updateError
      }

      // Reload challenges
      loadChallenges()
    } catch (err) {
      console.error('Error responding to challenge:', err)
      setError(err.message)
    } finally {
      setProcessingChallengeId(null)
    }
  }

  const formatCategories = (categories) => {
    if (!categories || !Array.isArray(categories)) return 'Mixed'
    return categories.map(cat => 
      cat.charAt(0).toUpperCase() + cat.slice(1)
    ).join(', ')
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-500" size={24} />
          <h2 className="text-xl font-semibold text-amber-900">
            Challenge Invitations
          </h2>
          {challenges.length > 0 && (
            <span className="bg-amber-500 text-white text-sm px-2 py-1 rounded-full">
              {challenges.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      <div className="p-6">
        {challenges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gamepad2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No pending challenge invitations</p>
            <p className="text-sm">Your friends can challenge you to trivia battles!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.lobby_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Challenge Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
                      {challenge.challenger_profile_image ? (
                        <img 
                          src={challenge.challenger_profile_image} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      ) : (
                        <User size={24} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {challenge.challenger_username}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Star size={14} />
                        Level {challenge.challenger_level}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} />
                    {new Date(challenge.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Challenge Details */}
                <div className="mb-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600">Categories:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCategories(challenge.categories)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Difficulty:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleChallengeResponse(challenge.lobby_id, true)}
                    disabled={processingChallengeId === challenge.lobby_id}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingChallengeId === challenge.lobby_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Accept Challenge
                  </button>
                  
                  <button
                    onClick={() => handleChallengeResponse(challenge.lobby_id, false)}
                    disabled={processingChallengeId === challenge.lobby_id}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingChallengeId === challenge.lobby_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <XCircle size={16} />
                    )}
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 