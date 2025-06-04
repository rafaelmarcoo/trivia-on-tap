import React from 'react';
import { Trophy, Target, Award, Clock, BookOpen, X } from 'lucide-react';
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

  // Performance metrics
  const correctQuestions = questions?.filter(q => q.isCorrect).length || score;
  const avgTimePerQuestion = questions?.length ? 
    questions.reduce((sum, q) => sum + (q.timeTaken || 0), 0) / questions.length : 0;

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPerformanceMessage = (percentage) => {
    if (percentage >= 90) return 'Outstanding! 🌟';
    if (percentage >= 80) return 'Excellent work! 🎉';
    if (percentage >= 70) return 'Great job! 👏';
    if (percentage >= 60) return 'Good effort! 👍';
    return 'Keep practicing! 💪';
  };

  const content = (
    <>
      {/* Performance Overview */}
      <div className="mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-amber-50 to-amber-100/50 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-amber-500 rounded-full shadow-lg">
              <Trophy className="text-white" size={32} />
            </div>
          </div>
          
          <div className={`text-4xl md:text-5xl font-bold mb-2 ${getPerformanceColor(percentage)}`}>
            {score}/{totalQuestions}
          </div>
          
          <div className="text-xl md:text-2xl font-semibold text-amber-800 mb-2">
            {percentage}% Correct
          </div>
          
          <div className="text-amber-700 font-medium mb-4">
            {getPerformanceMessage(percentage)}
          </div>

          {showCategories && categories && (
            <div className="mt-4 p-3 bg-white/50 rounded-xl border border-amber-200/30">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BookOpen size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Categories Played</span>
              </div>
              <div className="text-amber-700 text-sm">
                {categories.join(' • ')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-amber-200/50 text-center">
          <Target className="mx-auto mb-2 text-amber-600" size={20} />
          <div className="text-lg md:text-xl font-bold text-amber-900">{correctQuestions}</div>
          <div className="text-xs md:text-sm text-amber-700">Correct</div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-amber-200/50 text-center">
          <X className="mx-auto mb-2 text-red-500" size={20} />
          <div className="text-lg md:text-xl font-bold text-amber-900">{totalQuestions - correctQuestions}</div>
          <div className="text-xs md:text-sm text-amber-700">Incorrect</div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-amber-200/50 text-center">
          <Award className="mx-auto mb-2 text-amber-600" size={20} />
          <div className="text-lg md:text-xl font-bold text-amber-900">{percentage}%</div>
          <div className="text-xs md:text-sm text-amber-700">Accuracy</div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-amber-200/50 text-center">
          <Clock className="mx-auto mb-2 text-amber-600" size={20} />
          <div className="text-lg md:text-xl font-bold text-amber-900">{Math.round(avgTimePerQuestion)}s</div>
          <div className="text-xs md:text-sm text-amber-700">Avg Time</div>
        </div>
      </div>

      {/* Question Reviews */}
      <div className="space-y-3 md:space-y-4">
        <h3 className="text-lg md:text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          Question Review
        </h3>
        {questions?.map((q, index) => (
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
        className="w-full mt-6 md:mt-8 py-3 md:py-4 px-6 md:px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-amber-300/50 text-sm md:text-base"
      >
        {actionLabel}
      </button>
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-amber-200/50">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Trophy className="text-amber-600" size={24} />
              Game Summary
            </h2>
            <button
              onClick={onAction}
              className="p-2 hover:bg-amber-100 rounded-xl transition-colors duration-200"
            >
              <X className="text-amber-700" size={20} />
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-xl border border-amber-200/50">
      <h2 className="text-xl md:text-2xl mb-4 md:mb-6 text-amber-900 font-bold flex items-center gap-2">
        <Trophy className="text-amber-600" size={24} />
        Game Summary
      </h2>
      {content}
    </div>
  );
};

export default GameSummary; 