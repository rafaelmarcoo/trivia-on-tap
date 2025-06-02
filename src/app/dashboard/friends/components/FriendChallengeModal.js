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
    { id: 'general', name: 'General' },
    { id: 'history', name: 'History' },
    { id: 'technology', name: 'Technology' },
    { id: 'geography', name: 'Geography' },
    { id: 'science', name: 'Science' },
    { id: 'math', name: 'Math' }
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

      // Create a new game lobby for the challenge
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('game_lobbies')
        .insert({
          host_id: user.id,
          status: 'waiting',
          max_players: 2,
          current_players: 1,
          invited_friend_id: friend.id,
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Challenge {friend.username}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Challenge Details */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">Challenge Format</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 10 trivia questions</li>
              <li>• Both players answer the same questions</li>
              <li>• 30 seconds per question</li>
              <li>• Highest score wins!</li>
            </ul>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Please select at least one category</p>
            )}
          </div>

          {/* Difficulty Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Difficulty</h3>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    difficulty === level
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={sendChallenge}
              disabled={selectedCategories.length === 0 || isLoading}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 