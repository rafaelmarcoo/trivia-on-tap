import React from 'react';
import QuestionReview from './QuestionReview';

const GameSummary = ({ gameData, onClose }) => {
  const { score, totalQuestions, questions } = gameData;
  const percentage = Math.round((score / totalQuestions) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--color-primary)] p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-fourth)]">Game Summary</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-fourth)] hover:text-[var(--color-third)]"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 p-4 bg-[var(--color-secondary)] rounded-lg">
          <div className="text-center">
            <div className="text-4xl font-bold text-[var(--color-fourth)] mb-2">
              {score}/{totalQuestions}
            </div>
            <div className="text-[var(--color-fourth)]/80">
              {percentage}% Correct
            </div>
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
      </div>
    </div>
  );
};

export default GameSummary; 