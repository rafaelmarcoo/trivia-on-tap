import React from 'react';
import { CheckCircle, XCircle, Clock, Lightbulb, Hash } from 'lucide-react';

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
      className={`p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-lg ${
        isCorrect 
          ? 'bg-green-50/80 border-green-200/50 hover:bg-green-50/90' 
          : 'bg-red-50/80 border-red-200/50 hover:bg-red-50/90'
      }`}
    >
      {/* Header with question number and status */}
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Hash className="text-amber-600" size={14} />
          </div>
          <span className="text-amber-900 font-semibold text-sm md:text-base">
            Question {questionNumber}
          </span>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium ${
          isCorrect 
            ? 'bg-green-500/20 text-green-700 border border-green-300/30' 
            : 'bg-red-500/20 text-red-700 border border-red-300/30'
        }`}>
          {isCorrect ? (
            <CheckCircle size={14} className="text-green-600" />
          ) : (
            <XCircle size={14} className="text-red-600" />
          )}
          {isCorrect ? 'Correct' : 'Incorrect'}
        </div>
      </div>
      
      {/* Question text */}
      <div className="mb-4 p-3 md:p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/30">
        <p className="text-amber-900 font-medium text-sm md:text-base leading-relaxed">
          {question}
        </p>
      </div>
      
      {/* Answers section */}
      <div className="space-y-3">
        {/* User's answer */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`p-1.5 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
              {isCorrect ? (
                <CheckCircle size={14} className="text-green-600" />
              ) : (
                <XCircle size={14} className="text-red-600" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <span className="text-amber-800 text-sm font-medium">Your answer: </span>
            <span className={`font-semibold text-sm md:text-base ${
              isCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {userAnswer}
            </span>
          </div>
        </div>

        {/* Correct answer (only shown if user was wrong) */}
        {!isCorrect && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CheckCircle size={14} className="text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <span className="text-amber-800 text-sm font-medium">Correct answer: </span>
              <span className="text-green-600 font-semibold text-sm md:text-base">
                {correctAnswer}
              </span>
            </div>
          </div>
        )}

        {/* Time taken */}
        {showTimeTaken && timeTaken !== undefined && (
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-shrink-0">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Clock size={14} className="text-amber-600" />
              </div>
            </div>
            <div className="flex-1">
              <span className="text-amber-800 text-sm font-medium">Time taken: </span>
              <span className="text-amber-900 font-semibold text-sm">
                {timeTaken}s
              </span>
            </div>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <div className="mt-4 p-3 md:p-4 bg-amber-50/80 backdrop-blur-sm rounded-xl border border-amber-200/30">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="p-1.5 bg-amber-200 rounded-lg">
                  <Lightbulb size={14} className="text-amber-700" />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-amber-800 font-semibold text-sm mb-2 block">
                  Explanation:
                </span>
                <p className="text-amber-900 text-xs md:text-sm leading-relaxed">
                  {explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionReview; 