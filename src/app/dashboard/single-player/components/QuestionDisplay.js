"use client";

import { useState } from "react";

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
          <div className="grid grid-cols-1 gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-100 border-green-500 text-green-800"
                      : selectedAnswer === option
                      ? "bg-red-100 border-red-500 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-600"
                    : "border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                } disabled:cursor-not-allowed`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
                {option}
              </button>
            ))}
          </div>
        );

      case "true-false":
        return (
          <div className="grid grid-cols-2 gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-100 border-green-500 text-green-800"
                      : selectedAnswer === option
                      ? "bg-red-100 border-red-500 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-600"
                    : "border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                } disabled:cursor-not-allowed`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case "one-word":
      case "math":
        return (
          <form onSubmit={handleInputAnswer} className="space-y-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-lg border-2 ${
                isAnswered
                  ? isCorrect
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                  : "border-amber-200 focus:border-amber-500 focus:outline-none"
              }`}
              placeholder={
                type === "math"
                  ? "Enter your answer (numbers only)"
                  : "Enter your answer"
              }
            />
            <button
              type="submit"
              disabled={isAnswered || !userInput.trim()}
              className="w-full py-3 px-6 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {question}
      </h2>

      {renderQuestionType()}

      {isAnswered && (
        <div className="space-y-4">
          <div>
            {isCorrect === true ? (
              <div className="text-green-700 font-bold text-lg">✅ Correct!</div>
            ) : (
              <div className="text-red-700 font-bold text-lg">
                ❌ Incorrect. The correct answer was: {correctAnswer}
              </div>
            )}
          </div>
          {explanation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{explanation}</p>
            </div>
          )}
          
          {/* Bank Question Checkbox */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBanked}
                onChange={handleBankQuestion}
                disabled={isBanked || isBanking}
                className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
              />
              <span className="text-amber-800 font-medium">
                {isBanking ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                    Banking question...
                  </span>
                ) : isBanked ? (
                  "✅ Question banked!"
                ) : (
                  "💾 Bank this question for later review"
                )}
              </span>
            </label>
          </div>

          <button
            onClick={handleNext}
            className="w-full py-3 px-6 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
          >
            {isLastQuestion ? "See Results" : "Next Question"}
          </button>
        </div>
      )}
    </div>
  );
}