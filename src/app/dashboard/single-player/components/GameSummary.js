import React from 'react';

const GameSummary = ({ gameSummary, onPlayAgain }) => {
  return (
    <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
      <h2 className="text-2xl mb-6 text-[var(--color-fourth)]">Game Summary</h2>
      
      {/* Overall Score */}
      <div className="mb-8 p-4 bg-[var(--color-primary)]/10 rounded-lg">
        <p className="text-[var(--color-fourth)] text-xl">
          Final Score: {gameSummary.score} / {gameSummary.totalQuestions}
        </p>
        <p className="text-[var(--color-fourth)]/80">
          Categories: {gameSummary.categories.join(', ')}
        </p>
      </div>

      {/* Questions Review */}
      <div className="space-y-6">
        <h3 className="text-xl text-[var(--color-fourth)]">Question Review</h3>
        {gameSummary.questions.map((q, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg ${
              q.isCorrect 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[var(--color-fourth)] font-medium">Question {index + 1}</span>
              <span className={`px-2 py-1 rounded text-sm ${
                q.isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {q.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            
            <p className="text-[var(--color-fourth)] mb-3">{q.question}</p>
            
            <div className="space-y-2">
              <div>
                <span className="text-[var(--color-fourth)]/80">Your answer: </span>
                <span className={`${
                  q.isCorrect ? 'text-green-500' : 'text-red-500'
                }`}>
                  {q.userAnswer}
                </span>
              </div>
              {!q.isCorrect && (
                <div>
                  <span className="text-[var(--color-fourth)]/80">Correct answer: </span>
                  <span className="text-green-500">{q.correctAnswer}</span>
                </div>
              )}
              {q.explanation && (
                <div className="mt-2 text-sm text-[var(--color-fourth)]/80">
                  <span className="font-medium">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full mt-8 py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
      >
        Play Again
      </button>
    </div>
  );
};

export default GameSummary; 