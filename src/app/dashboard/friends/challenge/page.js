'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Trophy, Clock, User, Star, CheckCircle } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'
import { generateTriviaQuestions } from '@/utils/openai'

function FriendChallengeGameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lobbyId = searchParams.get('lobby')
  const supabase = getSupabase()

  const [gameState, setGameState] = useState('loading') // 'loading' | 'waiting' | 'playing' | 'finished'
  const [lobbyData, setLobbyData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [opponentData, setOpponentData] = useState(null)
  const [myAnswers, setMyAnswers] = useState({})
  const [opponentAnswers, setOpponentAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [gameResults, setGameResults] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [userInput, setUserInput] = useState("")

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = 10 // Fixed to 10 questions like single-player with 20 but scaled down

  // Get current user and initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!lobbyId) {
          router.push('/dashboard/friends')
          return
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)
        await loadLobbyData(user.id)
      } catch (err) {
        console.error('Error initializing:', err)
        setError(err.message)
      }
    }

    initialize()
  }, [lobbyId])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!lobbyId || !currentUserId) return

    const channel = supabase
      .channel(`challenge:${lobbyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_challenge_answers',
        filter: `lobby_id=eq.${lobbyId}`
      }, (payload) => {
        // Reload opponent answers when they answer
        if (payload.new && payload.new.user_id !== currentUserId) {
          loadOpponentAnswers()
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_lobbies',
        filter: `id=eq.${lobbyId}`
      }, (payload) => {
        // Handle lobby status changes
        if (payload.new.status === 'in_progress' && gameState === 'waiting') {
          initializeGame()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lobbyId, currentUserId, gameState])

  // Timer for questions
  useEffect(() => {
    let timer
    if (gameState === 'playing' && timeLeft > 0 && !isAnswered) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (gameState === 'playing' && timeLeft === 0 && !isAnswered) {
      // Auto-submit when time runs out
      handleNextQuestion()
    }

    return () => clearTimeout(timer)
  }, [timeLeft, gameState, isAnswered])

  const loadLobbyData = async (userId) => {
    try {
      const { data: lobby, error } = await supabase
        .from('game_lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single()

      if (error) throw error
      if (!lobby) throw new Error('Lobby not found')

      setLobbyData(lobby)

      // Get opponent data
      const opponentId = lobby.host_id === userId ? lobby.invited_friend_id : lobby.host_id
      const { data: opponentUser, error: opponentError } = await supabase
        .from('user')
        .select('user_name, user_level, profile_image')
        .eq('auth_id', opponentId)
        .single()

      if (opponentError) throw opponentError
      setOpponentData({
        id: opponentId,
        username: opponentUser.user_name,
        level: opponentUser.user_level,
        profileImage: opponentUser.profile_image
      })

      // Check if both players are ready
      const { data: players, error: playersError } = await supabase
        .from('game_lobby_players')
        .select('user_id')
        .eq('lobby_id', lobbyId)

      if (playersError) throw playersError

      if (players.length === 2 && lobby.status === 'challenge_accepted') {
        // Start the game automatically if both players are present
        await startGame()
      } else {
        setGameState('waiting')
      }
    } catch (err) {
      console.error('Error loading lobby:', err)
      setError(err.message)
    }
  }

  const startGame = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Only the host generates and stores questions
      if (lobbyData.host_id === currentUserId) {
        // Generate questions - using the selected categories and difficulty from challenge
        const generatedQuestions = await generateTriviaQuestions(
          lobbyData.categories || ['general'],
          lobbyData.difficulty || 'medium',
          totalQuestions
        )

        // Create a game session for this challenge
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .insert({
            game_type: 'friend_challenge',
            lobby_id: lobbyId,
            total_questions: totalQuestions,
            categories: lobbyData.categories,
            difficulty_level: lobbyData.difficulty === 'easy' ? 1 : lobbyData.difficulty === 'hard' ? 3 : 2,
            time_per_question: 30
          })
          .select()
          .single()

        if (sessionError) throw sessionError

        // Insert questions
        const { error: questionsError } = await supabase
          .from('game_questions')
          .insert(
            generatedQuestions.map((q, index) => ({
              game_session_id: sessionData.id,
              question_text: q.question,
              question_type: q.type,
              options: q.options || [],
              correct_answer: q.correctAnswer,
              explanation: q.explanation,
              question_order: index + 1
            }))
          )

        if (questionsError) throw questionsError

        // Update lobby status
        await supabase
          .from('game_lobbies')
          .update({ 
            status: 'in_progress',
            game_session_id: sessionData.id
          })
          .eq('id', lobbyId)
      }

      await initializeGame()
    } catch (err) {
      console.error('Error starting game:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeGame = async () => {
    try {
      // Get the game session and questions
      const { data: lobby } = await supabase
        .from('game_lobbies')
        .select('game_session_id')
        .eq('id', lobbyId)
        .single()

      if (!lobby.game_session_id) {
        setError('Game session not found')
        return
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('game_questions')
        .select('*')
        .eq('game_session_id', lobby.game_session_id)
        .order('question_order')

      if (questionsError) throw questionsError

      setQuestions(questionsData)
      setGameState('playing')
      setTimeLeft(30)
      setCurrentQuestionIndex(0)

      // Load existing answers
      await loadMyAnswers()
      await loadOpponentAnswers()
    } catch (err) {
      console.error('Error initializing game:', err)
      setError(err.message)
    }
  }

  const loadMyAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_challenge_answers')
        .select('question_id, user_answer, is_correct, time_taken')
        .eq('lobby_id', lobbyId)
        .eq('user_id', currentUserId)

      if (error) throw error

      const answersMap = {}
      data.forEach(answer => {
        answersMap[answer.question_id] = answer
      })
      setMyAnswers(answersMap)
    } catch (err) {
      console.error('Error loading my answers:', err)
    }
  }

  const loadOpponentAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_challenge_answers')
        .select('question_id, user_answer, is_correct, time_taken')
        .eq('lobby_id', lobbyId)
        .eq('user_id', opponentData?.id)

      if (error) throw error

      const answersMap = {}
      data.forEach(answer => {
        answersMap[answer.question_id] = answer
      })
      setOpponentAnswers(answersMap)
    } catch (err) {
      console.error('Error loading opponent answers:', err)
    }
  }

  const handleAnswer = async (answer) => {
    if (isAnswered || myAnswers[currentQuestion.id]) return

    const timeTaken = 30 - timeLeft
    const isCorrect = answer === currentQuestion.correct_answer

    setSelectedAnswer(answer)
    setIsAnswered(true)

    try {
      // Save answer to database
      await supabase
        .from('friend_challenge_answers')
        .insert({
          lobby_id: lobbyId,
          user_id: currentUserId,
          question_id: currentQuestion.id,
          user_answer: answer,
          is_correct: isCorrect,
          time_taken: timeTaken
        })

      // Update local state
      setMyAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          user_answer: answer,
          is_correct: isCorrect,
          time_taken: timeTaken
        }
      }))
    } catch (err) {
      console.error('Error saving answer:', err)
      setError('Failed to save answer')
    }
  }

  const handleInputAnswer = (e) => {
    e.preventDefault()
    if (isAnswered || !userInput.trim()) return

    let correct = false
    if (currentQuestion.question_type === "math") {
      const userNum = parseFloat(userInput.trim())
      const correctNum = parseFloat(currentQuestion.correct_answer.trim())
      correct = Math.abs(userNum - correctNum) < 0.01
    } else {
      const userAns = userInput.trim().toLowerCase().replace(/\.$/, "")
      const correctAns = currentQuestion.correct_answer.trim().toLowerCase().replace(/\.$/, "")
      correct = userAns === correctAns
    }

    handleAnswer(userInput)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setTimeLeft(30)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setUserInput("")
    } else {
      finishGame()
    }
  }

  const finishGame = async () => {
    try {
      // Calculate results using the database function
      const { data: results, error } = await supabase
        .rpc('calculate_challenge_results', { lobby_uuid: lobbyId })

      if (error) throw error

      setGameResults(results)
      setGameState('finished')

      // Update lobby status
      await supabase
        .from('game_lobbies')
        .update({ status: 'completed' })
        .eq('id', lobbyId)
    } catch (err) {
      console.error('Error finishing game:', err)
      setError('Failed to calculate results')
    }
  }

  const renderQuestionType = () => {
    if (!currentQuestion) return null

    const answered = myAnswers[currentQuestion.id]
    
    switch (currentQuestion.question_type) {
      case "multiple-choice":
        return (
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  answered
                    ? option === currentQuestion.correct_answer
                      ? "bg-green-100 border-green-500 text-green-800"
                      : answered.user_answer === option
                      ? "bg-red-100 border-red-500 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-600"
                    : "border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                } disabled:cursor-not-allowed`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
                {option}
              </button>
            ))}
          </div>
        )

      case "true-false":
        return (
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  answered
                    ? option === currentQuestion.correct_answer
                      ? "bg-green-100 border-green-500 text-green-800"
                      : answered.user_answer === option
                      ? "bg-red-100 border-red-500 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-600"
                    : "border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                } disabled:cursor-not-allowed`}
              >
                {option}
              </button>
            ))}
          </div>
        )

      case "one-word":
      case "math":
        return (
          <form onSubmit={handleInputAnswer} className="space-y-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-lg border-2 ${
                answered
                  ? answered.is_correct
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                  : "border-amber-200 focus:border-amber-500 focus:outline-none"
              }`}
              placeholder={
                currentQuestion.question_type === "math"
                  ? "Enter your answer (numbers only)"
                  : "Enter your answer"
              }
            />
            <button
              type="submit"
              disabled={isAnswered || !userInput.trim()}
              className="w-full py-3 px-6 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              Submit Answer
            </button>
          </form>
        )

      default:
        return null
    }
  }

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Loading challenge...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard/friends')}
            className="flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back to Friends</span>
          </button>
          <h1 className="text-2xl font-bold text-amber-900">Friend Challenge</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Players Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
                <User size={32} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">You</h3>
                <p className="text-sm text-gray-600">
                  Score: {Object.values(myAnswers).filter(a => a.is_correct).length}/{totalQuestions}
                </p>
              </div>
            </div>

            <div className="text-center">
              <Trophy className="mx-auto mb-2 text-amber-500" size={32} />
              <p className="text-sm text-gray-600">VS</p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-right">
                  {opponentData?.username || 'Opponent'}
                </h3>
                <p className="text-sm text-gray-600 text-right">
                  Score: {Object.values(opponentAnswers).filter(a => a.is_correct).length}/{totalQuestions}
                </p>
              </div>
              <div className="h-16 w-16 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
                {opponentData?.profileImage ? (
                  <img 
                    src={opponentData.profileImage} 
                    alt="Opponent" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-amber-600" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game Content */}
        {gameState === 'waiting' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Trophy className="mx-auto mb-4 text-amber-500" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Waiting for {opponentData?.username}...
            </h2>
            <p className="text-gray-600">
              The challenge will start when both players are ready.
            </p>
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <div className="flex items-center gap-2 text-red-600">
                  <Clock size={16} />
                  <span className="font-mono font-bold">{timeLeft}s</span>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion.question_text}
              </h2>

              {/* Answer Options */}
              {renderQuestionType()}

              {/* Answer Status */}
              {isAnswered && myAnswers[currentQuestion.id] && (
                <div className="mt-6 space-y-4">
                  <div>
                    {myAnswers[currentQuestion.id].is_correct ? (
                      <div className="text-green-700 font-bold text-lg">✅ Correct!</div>
                    ) : (
                      <div className="text-red-700 font-bold text-lg">
                        ❌ Incorrect. The correct answer was: {currentQuestion.correct_answer}
                      </div>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{currentQuestion.explanation}</p>
                    </div>
                  )}
                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3 px-6 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
                  >
                    {currentQuestionIndex === questions.length - 1 ? "See Results" : "Next Question"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'finished' && gameResults && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Trophy className="mx-auto mb-4 text-amber-500" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Challenge Complete!
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900">You</h3>
                  <p className="text-2xl font-bold text-amber-600">
                    {gameResults.challenger_score}/{gameResults.total_questions}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{opponentData?.username}</h3>
                  <p className="text-2xl font-bold text-amber-600">
                    {gameResults.challenged_score}/{gameResults.total_questions}
                  </p>
                </div>
              </div>
            </div>

            {gameResults.is_tie ? (
              <p className="text-lg text-gray-600 mb-6">It's a tie! Great game!</p>
            ) : (
              <p className="text-lg text-gray-600 mb-6">
                {gameResults.winner_id === currentUserId ? 'You won!' : `${opponentData?.username} won!`} 🎉
              </p>
            )}

            <button
              onClick={() => router.push('/dashboard/friends')}
              className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Back to Friends
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FriendChallengePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Loading Challenge...</p>
        </div>
      </div>
    }>
      <FriendChallengeGameContent />
    </Suspense>
  )
} 