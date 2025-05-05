"use client";

import { useState } from "react";

export default function QuestionDisplay({
  question,
  options,
  correctAnswer,
  onAnswer,
  onNextQuestion,
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleAnswer = (answer) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    onAnswer(answer === correctAnswer);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    onNextQuestion();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-red-500">
        THE QUESTION WILL BE DISPLAYED HERE
      </h3>
      <h2 className="text-xl mb-4 text-red-500 text-center">
        SELECT WHAT YOU THINK IS THE CORRECT ANSWER BELOW
        <p className="text-4xl text-center mb-8 text-red-500">↓</p>
      </h2>
      <div className="grid grid-cols-1 gap-3">
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
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full py-3 px-6 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
        >
          Next Question
        </button>
      )}
    </div>
  );
}
