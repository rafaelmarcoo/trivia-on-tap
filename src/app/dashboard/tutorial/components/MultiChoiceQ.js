"use client";

import { useState } from 'react';

export default function MultiChoiceQ({ onNext }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const correctAnswer = "Option B";

  const handleAnswer = (option) => {
    if (!isAnswered) {
      setSelectedAnswer(option);
      setIsAnswered(true);
    }
  };

  const getButtonClass = (option) => {
    if (!isAnswered) {
      return 'bg-white border-gray-200 hover:bg-gray-50';
    }

    if (option === correctAnswer) {
      return 'bg-green-100 border-green-500';
    }

    if (option === selectedAnswer && option !== correctAnswer) {
      return 'bg-red-100 border-red-500';
    }

    return 'bg-white border-gray-200';
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-6 pl-11">
          Select what you think is the correct answer from the options below.
          The question will be displayed here in the actual quiz.
        </p>

        <div className="pl-11 space-y-3">
          {["Option A", "Option B", "Option C", "Option D"].map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              className={`w-full p-4 rounded-lg border text-left font-medium transition-colors ${getButtonClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {isAnswered && (
        <section className="space-y-6 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">How it works:</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-1">
                <p className="text-green-800 font-medium">Correct Answer</p>
                <p className="text-green-600 text-sm">The selected answer matches the correct answer</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-1">
                <p className="text-red-800 font-medium">Incorrect Answer</p>
                <p className="text-red-600 text-sm">The selected answer is not correct</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <button
          onClick={onNext}
          className="w-full py-4 px-8 rounded-lg text-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors shadow-md"
        >
          Continue to True/False Questions
        </button>
      </section>
    </div>
  );
}