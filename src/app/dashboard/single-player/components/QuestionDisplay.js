'use client';

import { useState } from 'react';

export default function QuestionDisplay({ 
  type,
  question, 
  options, 
  correctAnswer, 
  explanation,
  onAnswer, 
  onNextQuestion 
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userInput, setUserInput] = useState('');

  const handleAnswer = (answer) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    onAnswer(answer === correctAnswer);
  };

  const handleInputAnswer = (e) => {
    e.preventDefault();
    if (isAnswered) return;
    
    const normalizedUserAnswer = userInput.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    setSelectedAnswer(userInput);
    setIsAnswered(true);
    onAnswer(normalizedUserAnswer === normalizedCorrectAnswer);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserInput('');
    onNextQuestion();
  };

  const renderQuestionType = () => {
    switch (type) {
      case 'multiple-choice':
        return (
          <div className="grid grid-cols-1 gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isAnswered
                    ? option === correctAnswer
                      ? 'bg-green-100 border-green-500'
                      : selectedAnswer === option
                        ? 'bg-red-100 border-red-500'
                        : 'bg-[var(--color-primary)] border-[var(--color-fourth)]'
                    : 'bg-[var(--color-primary)] border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      
      case 'true-false':
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isAnswered
                    ? option === correctAnswer
                      ? 'bg-green-100 border-green-500'
                      : selectedAnswer === option
                        ? 'bg-red-100 border-red-500'
                        : 'bg-[var(--color-primary)] border-[var(--color-fourth)]'
                    : 'bg-[var(--color-primary)] border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      
      case 'one-word':
      case 'math':
        return (
          <form onSubmit={handleInputAnswer} className="space-y-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isAnswered}
              className="w-full p-4 rounded-lg border-2 border-[var(--color-fourth)] bg-[var(--color-primary)]"
              placeholder={type === 'math' ? 'Enter your answer (numbers only)' : 'Enter your answer'}
            />
            <button
              type="submit"
              disabled={isAnswered || !userInput.trim()}
              className="w-full py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              Submit Answer
            </button>
          </form>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-[var(--color-fourth)]">
        {question}
      </h3>
      
      {renderQuestionType()}

      {isAnswered && (
        <div className="space-y-4">
          {explanation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{explanation}</p>
            </div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
} 