'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Clock, User, Star, CheckCircle } from 'lucide-react';
import { useAutoLogout, getSupabase } from '@/utils/supabase';
import CategoryChecklist from './components/CategoryChecklist';
import QuestionDisplay from './components/QuestionDisplay';
import GameSummary from '../components/GameSummary';
import { generateTriviaQuestions } from '@/utils/openai';
import { useNotifications } from '@/components/notifications/InGameNotificationProvider'
import { awardSinglePlayerXP } from '@/utils/levelingSystem'
import LevelUpModal from '@/components/LevelUpModal'

function SinglePlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userLevel = searchParams.get('level') || 1;
  const supabase = getSupabase();
  const { setGameActive } = useNotifications()
  
  useAutoLogout();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [gameState, setGameState] = useState('selection'); // 'selection' | 'playing' | 'summary'
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameSummary, setGameSummary] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(30);
    } else {
      endGame();
    }
  }, [currentQuestionIndex, questions.length]);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0 && !isLoading) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isLoading, handleNextQuestion]);

  useEffect(() => {
    // Activate notifications when game starts
    if (gameState === 'playing') {
      setGameActive(true)
    } else {
      setGameActive(false)
    }

    // Cleanup when component unmounts
    return () => {
      setGameActive(false)
    }
  }, [gameState, setGameActive])

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      }
      return [...prev, category];
    });
  };

  const startGame = async () => {
    setIsLoading(true);
    setError(null);
    setTimeLeft(30);
    setScore(0);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create game session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          game_type: 'single_player',
          user_id: user.id,
          total_questions: 20,
          categories: selectedCategories,
          difficulty_level: parseInt(userLevel),
          time_per_question: 30
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      setGameSessionId(sessionData.id);

      const generatedQuestions = await generateTriviaQuestions(selectedCategories, userLevel);
      setQuestions(generatedQuestions);
      setSessionStartTime(Date.now());
      setGameState('playing');
    } catch (error) {
      console.error('Error starting game:', error);
      setError(error.message || 'Failed to start the game. Please try again.');
      setGameState('selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isCorrect, userAnswer) => {
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Save user's answer
    const currentQ = questions[currentQuestionIndex];
    const answerData = {
      game_session_id: gameSessionId,
      question_text: currentQ.question,
      question_type: currentQ.type,
      options: currentQ.options,
      correct_answer: currentQ.correctAnswer,
      user_answer: userAnswer,
      is_correct: isCorrect,
      time_taken: 30 - timeLeft,
      question_order: currentQuestionIndex + 1
    };

    setUserAnswers(prev => [...prev, answerData]);

    try {
      await supabase
        .from('game_questions')
        .insert(answerData);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleBankQuestion = async (questionData) => {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Check if question already exists in bank to avoid duplicates
      const { data: existingQuestions, error: checkError } = await supabase
        .from('question_bank')
        .select('id')
        .eq('question_text', questionData.question_text)
        .eq('user_id', user.id) 
        .limit(1);

      if (checkError) {
        console.error('Error checking existing questions:', checkError);
        throw checkError;
      }

      if (existingQuestions && existingQuestions.length > 0) {
        console.log('Question already banked');
        return; // Question already exists, don't add duplicate
      }

      // Insert the question into question_bank
      const { data, error } = await supabase
        .from('question_bank')
        .insert({
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          options: questionData.options,
          correct_answer: questionData.correct_answer,
          explanation: questionData.explanations,
          user_id: user.id 
        });

      if (error) {
        console.error('Error banking question:', error);
        throw error;
      }

      console.log('Question banked successfully');
    } catch (error) {
      console.error('Error in handleBankQuestion:', error);
      throw error; // Re-throw to be handled by the component
    }
  };

  const endGame = async () => {
    try {
      // Update game session with final score
      await supabase
        .from('game_sessions')
        .update({
          score: score,
          ended_at: new Date().toISOString()
        })
        .eq('id', gameSessionId);
        
const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds

const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  console.error('User fetch error:', userError?.message || 'User not authenticated');
  return;
}

const { data: userData, error: fetchError } = await supabase
  .from('user')
  .select('games_played, total_playtime')
  .eq('auth_id', user.id)
  .single();

if (fetchError) {
  console.error('Error fetching user data:', fetchError.message);
  return;
}

// Calculate new values
const newGamesPlayed = (userData?.games_played || 0) + 1;
const newTotalPlaytime = (userData?.total_playtime || 0) + sessionDuration; 

// Update the user record
const { error: updateError } = await supabase
  .from('user')
  .update({
    games_played: newGamesPlayed,
    total_playtime: newTotalPlaytime
  })
  .eq('auth_id', user.id);

if (updateError) {
  console.error('Error updating user stats:', updateError.message);
}

      // Prepare detailed questions with timing data
      const detailedQuestions = questions.map((q, index) => {
        const userAnswer = userAnswers[index];
        return {
          ...q,
          userAnswer: userAnswer?.user_answer,
          isCorrect: userAnswer?.is_correct,
          timeTaken: userAnswer?.time_taken || 0
        };
      });

      // Award XP for the game
      try {
        const gameData = {
          score,
          totalQuestions: questions.length,
          questions: detailedQuestions,
          difficulty: userLevel <= 5 ? 'easy' : userLevel <= 15 ? 'medium' : 'hard',
          categories: selectedCategories
        };

        const xpResult = await awardSinglePlayerXP(user.id, gameData);
        
        if (xpResult.success && xpResult.data.leveledUp) {
          // Show level up modal
          setLevelUpData(xpResult.data);
          setShowLevelUpModal(true);
        }
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
      }

      setGameSummary({
        score,
        totalQuestions: questions.length,
        categories: selectedCategories,
        questions: detailedQuestions
      });
      setGameState('summary');
    } catch (error) {
      console.error('Error ending game:', error);
      setError('Failed to save game results. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-amber-900">Single Player</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg mb-4 md:mb-6 text-sm md:text-base">
            {error}
          </div>
        )}
        
        {gameState === 'selection' ? (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
            <div className="text-center mb-6 md:mb-8">
              <Trophy className="mx-auto mb-3 md:mb-4 text-amber-500" size={48} />
              <h2 className="text-2xl md:text-3xl font-bold text-amber-900 mb-2">
                Ready to Test Your Knowledge?
              </h2>
              <p className="text-amber-700 text-base md:text-lg">
                Choose your categories and show us what you know!
              </p>
            </div>
            
            <div className="mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-semibold text-amber-900 mb-3 md:mb-4">
                Select Categories
              </h3>
              <p className="text-amber-700 mb-4 md:mb-6 text-sm md:text-base">
                Choose the categories you want to play with. You can select multiple categories for a diverse challenge.
              </p>
              
              <CategoryChecklist 
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
              />
            </div>
            
            <button 
              className={`w-full py-3 md:py-4 px-6 md:px-8 rounded-lg text-base md:text-lg font-semibold transition-all duration-200 ${
                selectedCategories.length > 0 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md transform hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={startGame}
              disabled={selectedCategories.length === 0 || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                  <span className="text-sm md:text-base">Generating Questions...</span>
                </div>
              ) : (
                `Start Game (${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'})`
              )}
            </button>
          </div>
        ) : gameState === 'summary' ? (
          <GameSummary
            gameData={gameSummary}
            onAction={() => setGameState('selection')}
            actionLabel="Play Again"
            showCategories={true}
          />
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Game Progress Info */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-amber-500" size={20} />
                    <span className="text-lg md:text-xl font-bold text-amber-900">
                      Score: {score}/{questions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <Clock size={18} />
                    <span className="font-mono font-bold text-base md:text-lg">{timeLeft}s</span>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="text-xs md:text-sm text-amber-700 mb-2">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <button
                    onClick={endGame}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs md:text-sm"
                  >
                    End Game
                  </button>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
              {isLoading ? (
                <div className="text-center py-6 md:py-8">
                  <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-amber-600 mx-auto mb-3 md:mb-4"></div>
                  <p className="text-amber-800 font-medium text-sm md:text-base">Loading questions...</p>
                </div>
              ) : currentQuestion ? (
                <QuestionDisplay
                  type={currentQuestion.type}
                  question={currentQuestion.question}
                  options={currentQuestion.options}
                  correctAnswer={currentQuestion.correctAnswer}
                  explanation={currentQuestion.explanation}
                  onAnswer={handleAnswer}
                  onNextQuestion={handleNextQuestion}
                  onBankQuestion={handleBankQuestion}
                  isLastQuestion={currentQuestionIndex === questions.length - 1}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Level Up Modal */}
        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={() => setShowLevelUpModal(false)}
          levelUpData={levelUpData}
        />
      </div>
    </div>
  );
}

export default function SinglePlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Loading Single Player...</p>
        </div>
      </div>
    }>
      <SinglePlayerGame />
    </Suspense>
  );
}