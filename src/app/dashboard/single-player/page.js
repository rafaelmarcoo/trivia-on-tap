'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CategoryChecklist from './components/CategoryChecklist';
import QuestionDisplay from './components/QuestionDisplay';
import { generateTriviaQuestion } from '@/utils/openai';

export default function SinglePlayerPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [gameState, setGameState] = useState('selection'); // 'selection' | 'playing'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      const question = await generateTriviaQuestion(selectedCategories);
      setCurrentQuestion(question);
      setGameState('playing');
    } catch (error) {
      console.error('Error starting game:', error);
      // TODO: Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    setIsLoading(true);
    try {
      const question = await generateTriviaQuestion(selectedCategories);
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error generating next question:', error);
      // TODO: Handle error appropriately
    } finally {
      setIsLoading(false);
    }
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
      ) : (
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-[var(--color-fourth)]">
              Score: {score}
            </h2>
            <button
              onClick={() => setGameState('selection')}
              className="px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md"
            >
              End Game
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-fourth)]">Loading next question...</p>
            </div>
          ) : currentQuestion ? (
            <QuestionDisplay
              question={currentQuestion.question}
              options={currentQuestion.options}
              correctAnswer={currentQuestion.correctAnswer}
              onAnswer={handleAnswer}
              onNextQuestion={handleNextQuestion}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
