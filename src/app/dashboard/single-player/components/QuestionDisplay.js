"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Archive, Loader2, ArrowRight, HelpCircle } from 'lucide-react';

export default function QuestionDisplay({
  type,
  question,
  options,
  correctAnswer,
  explanation,
  onAnswer,
  onNextQuestion,
  onBankQuestion,
  isLastQuestion = false,
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [isBanked, setIsBanked] = useState(false);
  const [isBanking, setIsBanking] = useState(false);

  const handleAnswer = (answer) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    onAnswer(correct, answer);
  };

  const handleInputAnswer = (e) => {
    e.preventDefault();
    if (isAnswered) return;

    let correct = false;
    if (type === "math") {
      const userNum = parseFloat(userInput.trim());
      const correctNum = parseFloat(correctAnswer.trim());
      correct = Math.abs(userNum - correctNum) < 0.01;
    } else {
      const userAns = userInput.trim().toLowerCase().replace(/\.$/, "");
      const correctAns = correctAnswer.trim().toLowerCase().replace(/\.$/, "");
      correct = userAns === correctAns;
    }

    setSelectedAnswer(userInput);
    setIsAnswered(true);
    setIsCorrect(correct);
    onAnswer(correct, userInput);
  };

  const handleBankQuestion = async () => {
    if (isBanked || isBanking) return;
    
    setIsBanking(true);
    try {
      const questionData = {
        question_text: question,
        question_type: type,
        options: options,
        correct_answer: correctAnswer,
        explanations: explanation
      };
      
      await onBankQuestion(questionData);
      setIsBanked(true);
    } catch (error) {
      console.error("Error banking question:", error? error.message : "Unknown error");
      // Optionally show an error message to the user
    } finally {
      setIsBanking(false);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserInput("");
    setIsCorrect(null);
    setIsBanked(false);
    setIsBanking(false);
    onNextQuestion();
  };

  const renderQuestionType = () => {
    switch (type) {
      case "multiple-choice":
        return (
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`group p-4 md:p-5 rounded-xl border-2 text-left transition-all duration-300 backdrop-blur-sm transform hover:scale-[1.02] ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-50/80 border-green-300 text-green-800 shadow-lg"
                      : selectedAnswer === option
                      ? "bg-red-50/80 border-red-300 text-red-800 shadow-lg"
                      : "bg-gray-50/60 border-gray-200 text-gray-500"
                    : "bg-white/70 border-amber-200 hover:border-amber-400 hover:bg-amber-50/80 hover:shadow-md"
                } disabled:cursor-not-allowed disabled:transform-none`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isAnswered
                      ? option === correctAnswer
                        ? "bg-green-200 text-green-800"
                        : selectedAnswer === option
                        ? "bg-red-200 text-red-800"
                        : "bg-gray-200 text-gray-600"
                      : "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-sm md:text-base font-medium leading-relaxed">{option}</span>
                  {isAnswered && option === correctAnswer && (
                    <CheckCircle className="ml-auto text-green-600" size={20} />
                  )}
                  {isAnswered && selectedAnswer === option && option !== correctAnswer && (
                    <XCircle className="ml-auto text-red-600" size={20} />
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case "true-false":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`group p-4 md:p-6 rounded-xl border-2 transition-all duration-300 backdrop-blur-sm transform hover:scale-[1.02] text-center ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-50/80 border-green-300 text-green-800 shadow-lg"
                      : selectedAnswer === option
                      ? "bg-red-50/80 border-red-300 text-red-800 shadow-lg"
                      : "bg-gray-50/60 border-gray-200 text-gray-500"
                    : "bg-white/70 border-amber-200 hover:border-amber-400 hover:bg-amber-50/80 hover:shadow-md"
                } disabled:cursor-not-allowed disabled:transform-none`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-lg md:text-xl font-bold">{option}</span>
                  {isAnswered && option === correctAnswer && (
                    <CheckCircle className="text-green-600" size={24} />
                  )}
                  {isAnswered && selectedAnswer === option && option !== correctAnswer && (
                    <XCircle className="text-red-600" size={24} />
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case "one-word":
      case "math":
        return (
          <form onSubmit={handleInputAnswer} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isAnswered}
                className={`w-full p-4 md:p-5 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 text-base md:text-lg ${
                  isAnswered
                    ? isCorrect
                      ? "border-green-400 bg-green-50/80 text-green-800"
                      : "border-red-400 bg-red-50/80 text-red-800"
                    : "border-amber-200 bg-white/70 focus:border-amber-400 focus:bg-white/90 focus:outline-none focus:ring-4 focus:ring-amber-200/50"
                } disabled:cursor-not-allowed`}
                placeholder={
                  type === "math"
                    ? "Enter your numerical answer..."
                    : "Type your answer here..."
                }
              />
              {isAnswered && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {isCorrect ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : (
                    <XCircle className="text-red-600" size={24} />
                  )}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isAnswered || !userInput.trim()}
              className="w-full py-3 md:py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-amber-300/50 text-sm md:text-base"
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
    <div className="space-y-6 md:space-y-8">
      {/* Question Header */}
      <div className="p-4 md:p-6 bg-gradient-to-r from-amber-50 to-amber-100/50 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-amber-200 rounded-xl">
            <HelpCircle className="text-amber-700" size={20} />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-amber-900 leading-relaxed">
            {question}
          </h2>
        </div>
      </div>

      {/* Answer Options */}
      <div className="space-y-4">
        {renderQuestionType()}
      </div>

      {/* Results and Actions */}
      {isAnswered && (
        <div className="space-y-4 md:space-y-6">
          {/* Result Feedback */}
          <div className={`p-4 md:p-6 rounded-2xl backdrop-blur-sm border-2 shadow-lg ${
            isCorrect 
              ? 'bg-green-50/80 border-green-200' 
              : 'bg-red-50/80 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {isCorrect ? (
                <>
                  <div className="p-2 bg-green-200 rounded-full">
                    <CheckCircle className="text-green-700" size={24} />
                  </div>
                  <div>
                    <div className="text-green-800 font-bold text-lg md:text-xl">Correct!</div>
                    <div className="text-green-700 text-sm">Great job! 🎉</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-red-200 rounded-full">
                    <XCircle className="text-red-700" size={24} />
                  </div>
                  <div>
                    <div className="text-red-800 font-bold text-lg md:text-xl">Incorrect</div>
                    <div className="text-red-700 text-sm md:text-base">
                      The correct answer was: <span className="font-semibold">{correctAnswer}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="p-4 md:p-6 bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200 rounded-2xl shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-blue-200 rounded-xl">
                  <HelpCircle className="text-blue-700" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Explanation:</h4>
                  <p className="text-blue-700 text-sm md:text-base leading-relaxed">{explanation}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Bank Question Section */}
          <div className="p-4 md:p-5 bg-amber-50/80 backdrop-blur-sm border-2 border-amber-200 rounded-2xl shadow-lg">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isBanked}
                  onChange={handleBankQuestion}
                  disabled={isBanked || isBanking}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-300 ${
                  isBanked 
                    ? 'bg-amber-500 border-amber-500' 
                    : 'border-amber-300 group-hover:border-amber-400'
                }`}>
                  {isBanked && <CheckCircle className="text-white" size={24} />}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-1">
                <Archive className="text-amber-600" size={18} />
                <span className="text-amber-800 font-medium text-sm md:text-base">
                  {isBanking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Banking question...
                    </span>
                  ) : isBanked ? (
                    "Question banked for review! ✅"
                  ) : (
                    "Save this question for later review"
                  )}
                </span>
              </div>
            </label>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="w-full py-3 md:py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-amber-300/50 flex items-center justify-center gap-2 text-sm md:text-base"
          >
            {isLastQuestion ? "See Results" : "Next Question"}
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}