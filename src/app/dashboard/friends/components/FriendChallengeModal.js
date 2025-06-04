'use client'

import { useState } from 'react'
import { X, User, Trophy, Star, Gamepad2, Clock, Target, Zap, Globe, Computer, Microscope, Calculator, BookOpen, Sparkles } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'

export default function FriendChallengeModal({ isOpen, onClose, friend, onChallengeSent }) {
  const [selectedCategories, setSelectedCategories] = useState([])
  const [difficulty, setDifficulty] = useState('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const categories = [
    { id: 'general', name: 'General', icon: Sparkles, color: 'text-purple-600 bg-purple-100' },
    { id: 'history', name: 'History', icon: BookOpen, color: 'text-indigo-600 bg-indigo-100' },
    { id: 'technology', name: 'Technology', icon: Computer, color: 'text-blue-600 bg-blue-100' },
    { id: 'geography', name: 'Geography', icon: Globe, color: 'text-emerald-600 bg-emerald-100' },
    { id: 'science', name: 'Science', icon: Microscope, color: 'text-cyan-600 bg-cyan-100' },
    { id: 'math', name: 'Math', icon: Calculator, color: 'text-orange-600 bg-orange-100' }
  ]

  const difficulties = [
    { id: 'easy', name: 'Easy', description: 'Basic questions', icon: '🌱', color: 'text-green-600 bg-green-100/80 border-green-300' },
    { id: 'medium', name: 'Medium', description: 'Moderate challenge', icon: '⚡', color: 'text-amber-600 bg-amber-100/80 border-amber-300' },
    { id: 'hard', name: 'Hard', description: 'Expert level', icon: '🔥', color: 'text-red-600 bg-red-100/80 border-red-300' }
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

      console.log('Sending challenge from:', user.id, 'to:', friend.friend_id)
      console.log('Challenge details:', {
        categories: selectedCategories,
        difficulty: difficulty,
        friend: friend
      })

      // Create a new game lobby for the challenge
      const { data: lobbyData, error: lobbyError } = await supabase
        .from('game_lobbies')
        .insert({
          host_id: user.id,
          status: 'waiting',
          max_players: 2,
          current_players: 1,
          invited_friend_id: friend.friend_id,
          categories: selectedCategories,
          difficulty: difficulty,
          lobby_type: 'friend_challenge'
        })
        .select()
        .single()

      if (lobbyError) {
        console.error('Error creating lobby:', lobbyError)
        throw lobbyError
      }

      console.log('Lobby created successfully:', lobbyData)

      // Add host to lobby players
      const { error: joinError } = await supabase
        .from('game_lobby_players')
        .insert({
          lobby_id: lobbyData.id,
          user_id: user.id
        })

      if (joinError) {
        console.error('Error joining lobby:', joinError)
        throw joinError
      }

      console.log('Successfully joined lobby as host')

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-200/50 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100/50 rounded-xl">
                <Gamepad2 className="text-amber-700" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900">
                  Challenge Battle
                </h2>
                <p className="text-sm text-amber-700">vs {friend.friend_username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-amber-100/50 rounded-xl transition-colors duration-200 text-amber-600"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100/80 backdrop-blur-sm border border-red-200 text-red-700 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {/* Challenge Details */}
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-amber-600" size={20} />
              <h3 className="font-semibold text-amber-800">Battle Format</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-amber-700">
                <Target size={16} />
                <span>10 Questions</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <Clock size={16} />
                <span>30 sec/question</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <Star size={16} />
                <span>Same Questions</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <Zap size={16} />
                <span>Highest Score Wins</span>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-amber-900 flex items-center gap-2">
              <Target className="text-amber-600" size={20} />
              Categories
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon
                const isSelected = selectedCategories.includes(category.id)
                return (
                  <label 
                    key={category.id} 
                    className={`flex items-center gap-4 cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-amber-100/70 backdrop-blur-sm border-amber-400 shadow-lg'
                        : 'bg-white/60 backdrop-blur-sm border-amber-200/50 hover:border-amber-300 hover:bg-amber-50/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(category.id)}
                      className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 focus:ring-2"
                    />
                    <div className={`p-2 rounded-lg ${isSelected ? category.color : 'bg-gray-100 text-gray-500'} transition-colors duration-200`}>
                      <IconComponent size={20} />
                    </div>
                    <span className="flex-1 font-medium text-amber-900">
                      {category.name}
                    </span>
                    {isSelected && (
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    )}
                  </label>
                )
              })}
            </div>
            {selectedCategories.length === 0 && (
              <div className="mt-3 p-3 bg-red-50/80 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <Target size={16} className="text-red-500" />
                  Please select at least one category
                </p>
              </div>
            )}
          </div>

          {/* Difficulty Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-amber-900 flex items-center gap-2">
              <Zap className="text-amber-600" size={20} />
              Difficulty Level
            </h3>
            <div className="space-y-3">
              {difficulties.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setDifficulty(level.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] text-left ${
                    difficulty === level.id
                      ? `${level.color} border-current shadow-md`
                      : 'bg-white/50 backdrop-blur-sm border-amber-200/50 hover:border-amber-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{level.icon}</span>
                      <div>
                        <div className="font-semibold capitalize">{level.name}</div>
                        <div className="text-sm opacity-75">{level.description}</div>
                      </div>
                    </div>
                    {difficulty === level.id && (
                      <div className="w-3 h-3 bg-current rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50/50 backdrop-blur-sm transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={sendChallenge}
              disabled={selectedCategories.length === 0 || isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Gamepad2 size={16} />
                  <span>Send Challenge</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 