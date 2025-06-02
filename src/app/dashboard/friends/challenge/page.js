'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Trophy, Clock, User, Star, CheckCircle } from 'lucide-react'
import { getSupabase } from '@/utils/supabase'
import { generateTriviaQuestions } from '@/utils/openai'

function FriendChallengeGameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lobbyId = searchParams.get('lobby')
  const supabase = getSupabase()

  const [gameState, setGameState] = useState('loading') // 'loading' | 'waiting' | 'playing' | 'waiting_for_opponent' | 'finished'
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
  const [currentUserProfileImage, setCurrentUserProfileImage] = useState(null)
  
  const pollIntervalRef = useRef(null)

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

        console.log('Initializing challenge for user:', user.id)
        setCurrentUserId(user.id)
        
        // Load current user's profile image
        const { data: userData } = await supabase
          .from('user')
          .select('profile_image')
          .eq('auth_id', user.id)
          .single()
        
        if (userData?.profile_image) {
          setCurrentUserProfileImage(userData.profile_image)
        }
        
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
        console.log('Challenge answer update:', payload)
        // Reload opponent answers when they answer
        if (payload.new && payload.new.user_id !== currentUserId) {
          // Get opponent ID from lobby data
          if (lobbyData) {
            const opponentId = lobbyData.host_id === currentUserId 
              ? lobbyData.invited_friend_id 
              : lobbyData.host_id
            loadOpponentAnswers(opponentId)
          } else if (opponentData?.id) {
            loadOpponentAnswers(opponentData.id)
          }
        }
        
        // If we're waiting for opponent and they just answered, check if both are done
        if (gameState === 'waiting_for_opponent' && payload.new && payload.new.user_id !== currentUserId) {
          console.log('Opponent answered while we are waiting, checking if both finished...')
          setTimeout(() => {
            checkIfBothPlayersFinished()
          }, 500) // Small delay to ensure database is updated
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_lobbies',
        filter: `id=eq.${lobbyId}`
      }, (payload) => {
        console.log('Lobby status update:', payload)
        // Handle lobby status changes
        if (payload.new.status === 'challenge_accepted' && gameState === 'loading') {
          console.log('Challenge was accepted, starting game...')
          loadLobbyData(currentUserId) // Reload lobby data and start game
        } else if (payload.new.status === 'in_progress' && gameState === 'waiting') {
          console.log('Game started by host, initializing...')
          initializeGame(currentUserId, opponentData?.id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lobbyId, currentUserId, gameState, lobbyData, opponentData])

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

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  const loadLobbyData = async (userId) => {
    try {
      const { data: lobby, error } = await supabase
        .from('game_lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single()

      if (error) throw error
      if (!lobby) throw new Error('Lobby not found')

      console.log('Loaded lobby data:', lobby)
      setLobbyData(lobby)

      // Get opponent data
      const opponentId = lobby.host_id === userId ? lobby.invited_friend_id : lobby.host_id
      console.log('Loading opponent data for:', opponentId)
      
      const { data: opponentUser, error: opponentError } = await supabase
        .from('user')
        .select('user_name, user_level, profile_image')
        .eq('auth_id', opponentId)
        .single()

      const opponentInfo = {
        id: opponentId,
        username: opponentUser?.user_name || 'Unknown User',
        level: opponentUser?.user_level || 1,
        profileImage: opponentUser?.profile_image || null
      }

      if (opponentError) {
        console.warn('Could not load opponent data:', opponentError)
      }
      
      setOpponentData(opponentInfo)

      // Check if both players are ready
      const { data: players, error: playersError } = await supabase
        .from('game_lobby_players')
        .select('user_id')
        .eq('lobby_id', lobbyId)

      if (playersError) {
        console.warn('Could not load players:', playersError)
        // Continue based on lobby status
      }

      console.log('Lobby status:', lobby.status)
      console.log('Players in lobby:', players?.length || 0)
      console.log('Am I the host?', lobby.host_id === userId)
      console.log('Current userId:', userId)
      console.log('State currentUserId:', currentUserId)

      if (lobby.status === 'in_progress') {
        // Game already started, initialize it
        console.log('Game already in progress, initializing...')
        await initializeGame(userId, opponentId)
      } else if (lobby.status === 'challenge_accepted') {
        // Challenge was accepted, start the game
        if (lobby.host_id === userId) {
          console.log('I am the host and challenge was accepted, starting game...')
          // Make sure currentUserId is set before starting game
          if (!currentUserId) {
            console.log('Setting currentUserId before starting game...')
            setCurrentUserId(userId)
          }
          await startGame(lobby, userId)
        } else {
          console.log('I am not the host, waiting for host to start game...')
          setGameState('waiting')
        }
      } else if (lobby.status === 'waiting') {
        console.log('Challenge not yet accepted, waiting...')
        setGameState('waiting')
      } else {
        console.log('Unknown lobby status:', lobby.status)
        setGameState('waiting')
      }
    } catch (err) {
      console.error('Error loading lobby:', err)
      setError(err.message)
    }
  }

  const startGame = async (passedLobbyData = null, userId) => {
    try {
      setIsLoading(true)
      setError(null)

      // Use passed lobby data or state lobby data
      const lobby = passedLobbyData || lobbyData
      if (!lobby) {
        throw new Error('No lobby data available')
      }

      console.log('Starting game with lobby:', lobby)
      console.log('Current user ID:', userId)
      console.log('Lobby host ID:', lobby.host_id)
      console.log('Host check result:', lobby.host_id === userId)

      // Only the host generates and stores questions
      if (lobby.host_id === userId) {
        console.log('I am the host, generating questions...')
        
        // Generate questions - using the selected categories and difficulty from challenge
        const generatedQuestions = await generateTriviaQuestions(
          lobby.categories || ['general'],
          lobby.difficulty || 'medium',
          totalQuestions
        )

        console.log('Generated questions:', generatedQuestions.length)

        // Create a game session for this challenge
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .insert({
            game_type: 'friend_challenge',
            lobby_id: lobbyId,
            total_questions: totalQuestions,
            categories: lobby.categories,
            difficulty_level: lobby.difficulty === 'easy' ? 1 : lobby.difficulty === 'hard' ? 3 : 2,
            time_per_question: 30
          })
          .select()
          .single()

        if (sessionError) throw sessionError

        console.log('Created game session:', sessionData.id)

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

        console.log('Inserted questions successfully')

        // Update lobby status
        await supabase
          .from('game_lobbies')
          .update({ 
            status: 'in_progress',
            game_session_id: sessionData.id
          })
          .eq('id', lobbyId)

        console.log('Updated lobby to in_progress')
      } else {
        console.log('I am not the host, waiting for game setup...')
        console.log('Expected host ID:', lobby.host_id)
        console.log('My user ID:', userId)
      }

      // Get opponent ID for initialization
      const opponentId = lobby.host_id === userId ? lobby.invited_friend_id : lobby.host_id
      await initializeGame(userId, opponentId)
    } catch (err) {
      console.error('Error starting game:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeGame = async (userId = null, opponentId = null) => {
    try {
      // Use passed parameters or fall back to state
      const myUserId = userId || currentUserId
      const theirUserId = opponentId || opponentData?.id

      console.log('Initializing game with user IDs:', { myUserId, theirUserId })

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

      // Load existing answers - pass user IDs directly
      await loadMyAnswers(myUserId)
      await loadOpponentAnswers(theirUserId)
    } catch (err) {
      console.error('Error initializing game:', err)
      setError(err.message)
    }
  }

  const loadMyAnswers = async (userId) => {
    try {
      if (!userId) {
        console.warn('No user ID provided to loadMyAnswers')
        return
      }

      const { data, error } = await supabase
        .from('friend_challenge_answers')
        .select('question_id, user_answer, is_correct, time_taken')
        .eq('lobby_id', lobbyId)
        .eq('user_id', userId)

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

  const loadOpponentAnswers = async (opponentUserId) => {
    try {
      if (!opponentUserId) {
        console.warn('No opponent user ID provided to loadOpponentAnswers')
        return
      }

      const { data, error } = await supabase
        .from('friend_challenge_answers')
        .select('question_id, user_answer, is_correct, time_taken')
        .eq('lobby_id', lobbyId)
        .eq('user_id', opponentUserId)

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

    // Use currentUserId from state, but ensure it exists
    const userId = currentUserId
    if (!userId) {
      console.error('No user ID available for saving answer')
      setError('Unable to save answer - please refresh the page')
      return
    }

    const timeTaken = 30 - timeLeft
    const isCorrect = answer === currentQuestion.correct_answer

    setSelectedAnswer(answer)
    setIsAnswered(true)

    try {
      // Save answer to database with ON CONFLICT to handle duplicates
      const { error } = await supabase
        .from('friend_challenge_answers')
        .upsert({
          lobby_id: lobbyId,
          user_id: userId,
          question_id: currentQuestion.id,
          user_answer: answer,
          is_correct: isCorrect,
          time_taken: timeTaken
        }, {
          onConflict: 'lobby_id,user_id,question_id'
        })

      if (error) throw error

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
    let finalAnswer = userInput.trim() // Store the user's trimmed input
    
    if (currentQuestion.question_type === "math") {
      const userNum = parseFloat(userInput.trim())
      const correctNum = parseFloat(currentQuestion.correct_answer.trim())
      correct = Math.abs(userNum - correctNum) < 0.01
    } else {
      // Case-insensitive comparison with whitespace and period handling
      const userAns = userInput.trim().toLowerCase().replace(/\.$/, "")
      const correctAns = currentQuestion.correct_answer.trim().toLowerCase().replace(/\.$/, "")
      correct = userAns === correctAns
      
      // Debug logging
      console.log('Answer comparison:', {
        userInput: userInput,
        userAns: userAns,
        correctAns: correctAns,
        correct: correct
      })
    }

    // Pass the user's actual input, but the function will use the correct boolean we calculated
    setSelectedAnswer(finalAnswer)
    setIsAnswered(true)

    const timeTaken = 30 - timeLeft
    
    // Save answer directly here instead of calling handleAnswer to avoid confusion
    if (!currentUserId) {
      console.error('No user ID available for saving answer')
      setError('Unable to save answer - please refresh the page')
      return
    }

    // Update UI immediately
    setMyAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        user_answer: finalAnswer,
        is_correct: correct,
        time_taken: timeTaken
      }
    }))

    // Save to database
    supabase
      .from('friend_challenge_answers')
      .upsert({
        lobby_id: lobbyId,
        user_id: currentUserId,
        question_id: currentQuestion.id,
        user_answer: finalAnswer,
        is_correct: correct,
        time_taken: timeTaken
      }, {
        onConflict: 'lobby_id,user_id,question_id'
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error saving answer:', error)
          setError('Failed to save answer')
        }
      })
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setTimeLeft(30)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setUserInput("")
    } else {
      // Player finished all questions - check if opponent is also done
      checkIfBothPlayersFinished()
    }
  }

  const checkIfBothPlayersFinished = async () => {
    try {
      console.log('Checking if both players finished...')
      
      // Force refresh opponent answers first
      if (opponentData?.id) {
        await loadOpponentAnswers(opponentData.id)
      }
      
      // Count how many answers each player has with fresh data
      const { data: allAnswers, error } = await supabase
        .from('friend_challenge_answers')
        .select('user_id, question_id')
        .eq('lobby_id', lobbyId)

      if (error) throw error

      // Count unique question IDs answered by each player
      const myQuestionIds = new Set(
        allAnswers
          .filter(a => a.user_id === currentUserId)
          .map(a => a.question_id)
      )
      const opponentQuestionIds = new Set(
        allAnswers
          .filter(a => a.user_id === opponentData?.id)
          .map(a => a.question_id)
      )

      const myAnswerCount = myQuestionIds.size
      const opponentAnswerCount = opponentQuestionIds.size

      console.log(`Fresh answer counts - Me: ${myAnswerCount}, Opponent: ${opponentAnswerCount}, Total questions: ${totalQuestions}`)
      console.log('All answers:', allAnswers)

      if (myAnswerCount >= totalQuestions && opponentAnswerCount >= totalQuestions) {
        // Both players finished - show results
        console.log('Both players finished, showing results...')
        // Clear any existing polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        finishGame()
      } else if (gameState !== 'waiting_for_opponent') {
        // Only start waiting/polling if we're not already doing it
        console.log('Waiting for opponent to finish...')
        setGameState('waiting_for_opponent')
        
        // Clear any existing interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        
        // Start polling for opponent completion
        pollIntervalRef.current = setInterval(async () => {
          try {
            console.log('Polling for opponent completion...')
            const { data: updatedAnswers, error: pollError } = await supabase
              .from('friend_challenge_answers')
              .select('user_id, question_id')
              .eq('lobby_id', lobbyId)

            if (pollError) throw pollError

            // Count unique question IDs answered by each player
            const updatedMyQuestionIds = new Set(
              updatedAnswers
                .filter(a => a.user_id === currentUserId)
                .map(a => a.question_id)
            )
            const updatedOpponentQuestionIds = new Set(
              updatedAnswers
                .filter(a => a.user_id === opponentData?.id)
                .map(a => a.question_id)
            )

            const updatedMyCount = updatedMyQuestionIds.size
            const updatedOpponentCount = updatedOpponentQuestionIds.size
            
            console.log(`Polling - Me: ${updatedMyCount}, Opponent: ${updatedOpponentCount}`)

            if (updatedMyCount >= totalQuestions && updatedOpponentCount >= totalQuestions) {
              console.log('Opponent finished! Showing results...')
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
              finishGame()
            }
          } catch (err) {
            console.error('Error polling for opponent completion:', err)
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            // Show results anyway on error to prevent infinite waiting
            finishGame()
          }
        }, 2000) // Poll every 2 seconds

        // Clear interval after 5 minutes to avoid infinite polling
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            console.log('Polling timeout - showing results anyway')
            finishGame()
          }
        }, 300000) // 5 minutes
      }
    } catch (err) {
      console.error('Error checking player completion:', err)
      // Fallback to showing results
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
                {currentUserProfileImage ? (
                  <Image 
                    src={currentUserProfileImage} 
                    alt="Your profile" 
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  <User size={32} className="text-amber-600" />
                )}
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
                  <Image 
                    src={opponentData.profileImage} 
                    alt="Opponent" 
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
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

        {gameState === 'waiting_for_opponent' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-pulse mb-4">
              <Trophy className="mx-auto text-amber-500" size={64} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Waiting for {opponentData?.username} to finish...
            </h2>
            <p className="text-gray-600 mb-4">
              You&apos;ve completed all questions! Waiting for your opponent to finish their game.
            </p>
            <div className="text-sm text-amber-600">
              <p>Your Score: {Object.values(myAnswers).filter(a => a.is_correct).length}/{totalQuestions}</p>
            </div>
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
              <p className="text-lg text-gray-600 mb-6">It&apos;s a tie! Great game!</p>
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