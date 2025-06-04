'use client'

import { useState, useEffect } from 'react'
import { Gamepad2, Trophy, Clock, CheckCircle, XCircle, Star, User, Target, Zap, Calendar } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'
import Image from 'next/image'

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

      console.log('Loading challenges for user:', user.id)

      // Get pending challenges with manual join to avoid foreign key issues
      const { data: lobbies, error: lobbiesError } = await supabase
        .from('game_lobbies')
        .select('*')
        .eq('invited_friend_id', user.id)
        .eq('lobby_type', 'friend_challenge')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (lobbiesError) {
        console.error('Error loading lobbies:', lobbiesError)
        throw lobbiesError
      }

      console.log('Raw lobbies data:', lobbies)

      // Get challenger details separately for each lobby
      const challengesWithUserData = await Promise.all(
        (lobbies || []).map(async (lobby) => {
          const { data: challenger, error: challengerError } = await supabase
            .from('user')
            .select('user_name, user_level, profile_image')
            .eq('auth_id', lobby.host_id)
            .single()

          if (challengerError) {
            console.warn('Could not load challenger data for lobby:', lobby.id, challengerError)
          }

          return {
            lobby_id: lobby.id,
            challenger_id: lobby.host_id,
            challenger_username: challenger?.user_name || 'Unknown User',
            challenger_level: challenger?.user_level || 1,
            challenger_profile_image: challenger?.profile_image || null,
            categories: lobby.categories,
            difficulty: lobby.difficulty,
            created_at: lobby.created_at
          }
        })
      )

      console.log('Transformed challenges:', challengesWithUserData)
      setChallenges(challengesWithUserData)
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
      case 'easy': return 'text-green-600 bg-green-100/80 border-green-200'
      case 'medium': return 'text-amber-600 bg-amber-100/80 border-amber-200'
      case 'hard': return 'text-red-600 bg-red-100/80 border-red-200'
      default: return 'text-gray-600 bg-gray-100/80 border-gray-200'
    }
  }

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '🌱'
      case 'medium': return '⚡'
      case 'hard': return '🔥'
      default: return '🎯'
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 bg-amber-200 rounded"></div>
            <div className="h-6 bg-amber-200 rounded w-1/3"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-amber-100/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100/50 rounded-xl">
              <Trophy className="text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-900">
                Battle Invitations
              </h2>
              <p className="text-sm text-amber-700">
                Friends challenging you to trivia battles
              </p>
            </div>
          </div>
          {challenges.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm px-3 py-1.5 rounded-full font-medium shadow-lg animate-pulse">
              {challenges.length} {challenges.length === 1 ? 'Challenge' : 'Challenges'}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100/80 backdrop-blur-sm border-l-4 border-red-500 text-red-700">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            {error}
          </div>
        </div>
      )}

      <div className="p-6">
        {challenges.length === 0 ? (
          <div className="text-center py-12 text-amber-600">
            <div className="relative">
              <Gamepad2 size={64} className="mx-auto mb-4 opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl animate-bounce">🎮</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Pending Challenges</h3>
            <p className="text-amber-700">
              Your friends can challenge you to trivia battles!
            </p>
            <p className="text-sm text-amber-600 mt-2">
              Get ready to show off your knowledge 🧠
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.lobby_id}
                className="bg-white/80 backdrop-blur-sm border border-amber-200/50 p-5 rounded-xl transition-all duration-300 hover:bg-white/90 hover:shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Challenge Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl overflow-hidden border-2 border-amber-200/50 shadow-sm">
                        {challenge.challenger_profile_image ? (
                          <Image 
                            src={challenge.challenger_profile_image} 
                            alt="Profile" 
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={24} className="sm:w-7 sm:h-7 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        VS
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-amber-900 text-base sm:text-lg truncate mb-1">
                        {challenge.challenger_username}
                      </h3>
                      <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <Trophy size={14} className="text-amber-500" />
                        <span className="text-sm font-medium">Level {challenge.challenger_level}</span>
                        <span className="text-amber-400">•</span>
                        <span className="text-sm text-amber-600">{formatTimeAgo(challenge.created_at)}</span>
                      </div>
                      <div className="text-sm text-amber-700">
                        <span className="font-medium">{formatCategories(challenge.categories)}</span>
                        <span className="text-amber-500 mx-2">•</span>
                        <span className="capitalize">{challenge.difficulty || 'Medium'} difficulty</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 sm:flex-shrink-0">
                    <button
                      onClick={() => handleChallengeResponse(challenge.lobby_id, true)}
                      disabled={processingChallengeId === challenge.lobby_id}
                      className="flex-1 sm:flex-initial bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {processingChallengeId === challenge.lobby_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      <span className="text-sm">Accept</span>
                    </button>
                    
                    <button
                      onClick={() => handleChallengeResponse(challenge.lobby_id, false)}
                      disabled={processingChallengeId === challenge.lobby_id}
                      className="flex-1 sm:flex-initial bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      {processingChallengeId === challenge.lobby_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <XCircle size={16} />
                      )}
                      <span className="text-sm">Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 