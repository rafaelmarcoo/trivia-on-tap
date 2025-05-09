import React from 'react';

const QuestionReview = ({ 
  question, 
  userAnswer, 
  correctAnswer, 
  isCorrect, 
  explanation, 
  timeTaken,
  questionNumber,
  showTimeTaken = false 
}) => {
  return (
    <div 
      className={`p-4 rounded-lg ${
        isCorrect 
          ? 'bg-green-500/10 border border-green-500/20' 
          : 'bg-red-500/10 border border-red-500/20'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[var(--color-fourth)] font-medium">
          Question {questionNumber}
        </span>
        <span className={`px-2 py-1 rounded text-sm ${
          isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          {isCorrect ? 'Correct' : 'Incorrect'}
        </span>
      </div>
      
      <p className="text-[var(--color-fourth)] mb-3">{question}</p>
      
      <div className="space-y-2">
        <div>
          <span className="text-[var(--color-fourth)]/80">Your answer: </span>
          <span className={`${
            isCorrect ? 'text-green-500' : 'text-red-500'
          }`}>
            {userAnswer}
          </span>
        </div>
        {!isCorrect && (
          <div>
            <span className="text-[var(--color-fourth)]/80">Correct answer: </span>
            <span className="text-green-500">{correctAnswer}</span>
          </div>
        )}
        {explanation && (
          <div className="mt-2 text-sm text-[var(--color-fourth)]/80">
            <span className="font-medium">Explanation: </span>
            {explanation}
          </div>
        )}
        {showTimeTaken && timeTaken !== undefined && (
          <div className="text-[var(--color-fourth)]/80">
            Time taken: {timeTaken}s
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionReview; 