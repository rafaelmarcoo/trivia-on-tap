import React from 'react';
import QuestionReview from './QuestionReview';

const GameSummary = ({ 
  gameData, 
  onAction,
  isModal = false,
  actionLabel = 'Close',
  showCategories = false
}) => {
  const { score, totalQuestions, questions, categories } = gameData;
  const percentage = Math.round((score / totalQuestions) * 100);

  const content = (
    <>
      <div className="mb-6 p-4 bg-[var(--color-secondary)] rounded-lg">
        <div className="text-center">
          <div className="text-4xl font-bold text-[var(--color-fourth)] mb-2">
            {score}/{totalQuestions}
          </div>
          <div className="text-[var(--color-fourth)]/80">
            {percentage}% Correct
          </div>
          {showCategories && categories && (
            <div className="mt-2 text-[var(--color-fourth)]/80">
              Categories: {categories.join(', ')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionReview
            key={index}
            questionNumber={index + 1}
            question={q.question}
            userAnswer={q.userAnswer}
            correctAnswer={q.correctAnswer}
            isCorrect={q.isCorrect}
            explanation={q.explanation}
            timeTaken={q.timeTaken}
            showTimeTaken={true}
          />
        ))}
      </div>

      <button
        onClick={onAction}
        className="w-full mt-8 py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
      >
        {actionLabel}
      </button>
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[var(--color-primary)] p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-fourth)]">Game Summary</h2>
            <button
              onClick={onAction}
              className="text-[var(--color-fourth)] hover:text-[var(--color-third)]"
            >
              ✕
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
      <h2 className="text-2xl mb-6 text-[var(--color-fourth)]">Game Summary</h2>
      {content}
    </div>
  );
};

export default GameSummary; 