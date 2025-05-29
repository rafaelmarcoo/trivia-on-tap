'use client'

import { useState } from 'react'
import { X, User, Trophy, Star } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'

export default function FriendChallengeModal({ isOpen, onClose, friend, onChallengeSent }) {
  const [selectedCategories, setSelectedCategories] = useState([])
  const [difficulty, setDifficulty] = useState('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const categories = [
    { id: 'general', name: 'General Knowledge' },
    { id: 'history', name: 'History' },
    { id: 'technology', name: 'Technology' },
    { id: 'geography', name: 'Geography' },
    { id: 'science', name: 'Science' },
    { id: 'math', name: 'Mathematics' }
  ]

  const difficulties = [
    { id: 'easy', name: 'Easy', description: 'Basic questions' },
    { id: 'medium', name: 'Medium', description: 'Moderate challenge' },
    { id: 'hard', name: 'Hard', description: 'Expert level' }
  ]

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const sendChallenge = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      // Create a challenge lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('game_lobbies')
        .insert({
          host_id: user.id,
          invited_friend_id: friend.friend_id,
          status: 'waiting',
          max_players: 2,
          current_players: 1,
          categories: selectedCategories,
          difficulty: difficulty,
          lobby_type: 'friend_challenge'
        })
        .select()
        .single()

      if (lobbyError) throw lobbyError

      // Add host to lobby players
      const { error: joinError } = await supabase
        .from('game_lobby_players')
        .insert({
          lobby_id: lobbyData.id,
          user_id: user.id
        })

      if (joinError) throw joinError

      // Create notification for friend (you might want to implement a notifications system)
      // For now, we'll just close the modal and show success

      onChallengeSent?.(lobbyData)
      onClose()
    } catch (err) {
      console.error('Error sending challenge:', err)
      setError(err.message || 'Failed to send challenge')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !friend) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-amber-900">Challenge Friend</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Friend Info */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
            <div className="h-12 w-12 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
              {friend.friend_profile_image ? (
                <img 
                  src={friend.friend_profile_image} 
                  alt="Profile" 
                  className="h-full w-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              ) : (
                <User size={24} className="text-amber-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">{friend.friend_username}</h3>
              <p className="text-sm text-amber-600">
                <Star className="inline w-4 h-4 mr-1" />
                Level {friend.friend_level}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Categories Selection */}
          <div>
            <h3 className="font-semibold text-amber-900 mb-3">Select Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`p-3 rounded-lg border transition-all duration-200 text-sm ${
                    selectedCategories.includes(category.id)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Select at least one category for the challenge
            </p>
          </div>

          {/* Difficulty Selection */}
          <div>
            <h3 className="font-semibold text-amber-900 mb-3">Difficulty Level</h3>
            <div className="space-y-2">
              {difficulties.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                    difficulty === diff.id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <div className="font-medium">{diff.name}</div>
                  <div className="text-sm opacity-80">{diff.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Challenge Button */}
          <button
            onClick={sendChallenge}
            disabled={isLoading || selectedCategories.length === 0}
            className="w-full bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Trophy size={20} />
            )}
            {isLoading ? 'Sending Challenge...' : 'Send Challenge'}
          </button>
        </div>
      </div>
    </div>
  )
} 