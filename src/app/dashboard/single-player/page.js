'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAutoLogout } from '@/utils/supabase';
import CategoryChecklist from './components/CategoryChecklist';
import QuestionDisplay from './components/QuestionDisplay';
import { generateTriviaQuestion } from '@/utils/openai';

function SinglePlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userLevel = searchParams.get('level') || 1;
  
  useAutoLogout();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [gameState, setGameState] = useState('selection'); // 'selection' | 'playing' | 'summary'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameSummary, setGameSummary] = useState(null);

  const handleNextQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setTimeLeft(30);
    try {
      const question = await generateTriviaQuestion(selectedCategories, userLevel);
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error generating next question:', error);
      setError('Failed to generate next question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategories, userLevel]);

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
    try {
      const question = await generateTriviaQuestion(selectedCategories, userLevel);
      setCurrentQuestion(question);
      setGameState('playing');
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start the game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const endGame = () => {
    setGameSummary({
      score,
      totalQuestions: score + (currentQuestion ? 1 : 0),
      categories: selectedCategories
    });
    setGameState('summary');
  };

  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>
      
      {gameState === 'selection' ? (
        <>
          <h1 className="text-4xl text-center mb-8 text-[var(--color-fourth)]">
            Single Player Mode
          </h1>
          
          <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
            <h2 className="text-2xl mb-4 text-[var(--color-fourth)]">
              Select Categories
            </h2>
            <p className="text-[var(--color-fourth)]/80 mb-8">
              Choose the categories you want to play with. You can select multiple categories.
            </p>
            
            <CategoryChecklist 
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
            />
            
            <button 
              className={`w-full py-4 px-8 rounded-lg text-lg ${
                selectedCategories.length > 0 
                  ? 'bg-[var(--color-tertiary)] cursor-pointer' 
                  : 'bg-[var(--color-fourth)] cursor-not-allowed'
              } text-[var(--color-primary)]`}
              onClick={startGame}
              disabled={selectedCategories.length === 0 || isLoading}
            >
              {isLoading ? 'Loading...' : 'Start Game'}
            </button>
          </div>
        </>
      ) : gameState === 'summary' ? (
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          <h2 className="text-2xl mb-4 text-[var(--color-fourth)]">Game Summary</h2>
          <div className="space-y-4">
            <p className="text-[var(--color-fourth)]">Score: {gameSummary.score} / {gameSummary.totalQuestions}</p>
            <p className="text-[var(--color-fourth)]">Categories: {gameSummary.categories.join(', ')}</p>
            <button
              onClick={() => setGameState('selection')}
              className="w-full py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl text-[var(--color-fourth)]">
                Score: {score}
              </h2>
              <p className="text-[var(--color-fourth)]">Time left: {timeLeft}s</p>
            </div>
            <button
              onClick={endGame}
              className="px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md"
            >
              End Game
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-fourth)]">Loading next question...</p>
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
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function SinglePlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-fourth)] text-xl">Loading...</div>
      </div>
    }>
      <SinglePlayerGame />
    </Suspense>
  );
}
