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
  isLastQuestion = false,
}) {
  // State for tracking user's selected answer
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  // State to track if question has been answered
  const [isAnswered, setIsAnswered] = useState(false);
  // State for user input (for one-word/math questions)
  const [userInput, setUserInput] = useState("");
  // State to track if answer was correct
  const [isCorrect, setIsCorrect] = useState(null);

  /**
   * Handles selection of an answer (for multiple-choice/true-false)
   * @param {string} answer - The selected answer
   */
  const handleAnswer = (answer) => {
    if (isAnswered) return; // Prevent answering again

    setSelectedAnswer(answer);
    setIsAnswered(true);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    onAnswer(correct, answer);
  };

  const handleInputAnswer = (e) => {
    e.preventDefault();
    if (isAnswered) return; // Prevent answering again

    let correct = false;
    if (type === "math") {
      // For math questions, compare numbers with small tolerance
      const userNum = parseFloat(userInput.trim());
      const correctNum = parseFloat(correctAnswer.trim());
      correct = Math.abs(userNum - correctNum) < 0.01;
    } else {
      // For one-word, compare strings (case-insensitive, ignore trailing period)
      const userAns = userInput.trim().toLowerCase().replace(/\.$/, "");
      const correctAns = correctAnswer.trim().toLowerCase().replace(/\.$/, "");
      correct = userAns === correctAns;
    }

    setSelectedAnswer(userInput);
    setIsAnswered(true);
    setIsCorrect(correct);
    onAnswer(correct, userInput);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setUserInput("");
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
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-100 border-green-500" // Correct answer styling
                      : selectedAnswer === option
                      ? "bg-red-100 border-red-500" // Incorrect selected answer
                      : "bg-[var(--color-primary)] border-[var(--color-fourth)]" // Unselected option
                    : "bg-[var(--color-primary)] border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]" // Default state
                }`}
              >
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
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isAnswered
                    ? option === correctAnswer
                      ? "bg-green-100 border-green-500"
                      : selectedAnswer === option
                      ? "bg-red-100 border-red-500"
                      : "bg-[var(--color-primary)] border-[var(--color-fourth)]"
                    : "bg-[var(--color-primary)] border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]"
                }`}
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
              className={`w-full p-4 rounded-lg border-2 bg-[var(--color-primary)] ${
                isAnswered
                  ? isCorrect
                    ? "border-green-500" // Correct answer
                    : "border-red-500" // Incorrect answer
                  : "border-[var(--color-fourth)]" // Default state
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
      {/* Question text */}
      <h3 className="text-xl font-semibold text-[var(--color-fourth)]">
        {question}
      </h3>

      {/* Render the appropriate question type UI */}
      {renderQuestionType()}

      {/* Feedback section after answering */}
      {isAnswered && (
        <div className="space-y-4">
          <div>
            {/* Correct/incorrect feedback */}
            {isCorrect === true && (
              <div className="text-green-700 font-bold">Correct!</div>
            )}
            {isCorrect === false && (
              <div className="text-red-700 font-bold">
                Incorrect. The correct answer was: {correctAnswer}
              </div>
            )}
          </div>

          {/* Explanation if provided */}
          {explanation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{explanation}</p>
            </div>
          )}

          {/* Next question button */}
          <button
            onClick={handleNext}
            className="w-full py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            {isLastQuestion ? "See Results" : "Next Question"}
          </button>
        </div>
      )}
    </div>
  );
}
