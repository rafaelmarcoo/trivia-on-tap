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
      return 'bg-white/80 backdrop-blur-sm border-amber-100 hover:bg-white/90 hover:border-amber-200 hover:shadow-md transform hover:-translate-y-0.5';
    }

    if (option === correctAnswer) {
      return 'bg-green-50/90 backdrop-blur-sm border-green-500 shadow-md';
    }

    if (option === selectedAnswer && option !== correctAnswer) {
      return 'bg-red-50/90 backdrop-blur-sm border-red-500 shadow-md';
    }

    return 'bg-white/80 backdrop-blur-sm border-amber-100 opacity-50';
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-semibold shadow-md">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-8 pl-14">
          Select what you think is the correct answer from the options below.
          The question will be displayed here in the actual quiz.
        </p>

        <div className="pl-14 space-y-4">
          {["Option A", "Option B", "Option C", "Option D"].map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={isAnswered && option !== selectedAnswer && option !== correctAnswer}
              className={`w-full p-5 rounded-xl border text-left font-medium transition-all duration-300 ${getButtonClass(option)}`}
            >
              {option}
              {isAnswered && option === correctAnswer && (
                <span className="float-right text-green-600">✓</span>
              )}
              {isAnswered && option === selectedAnswer && option !== correctAnswer && (
                <span className="float-right text-red-600">✗</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {isAnswered && (
        <section className="space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-xl border border-amber-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">How it works:</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50/90 backdrop-blur-sm rounded-xl border border-green-200 transform transition-all duration-300 hover:translate-x-2">
              <div className="flex-1">
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  Correct Answer
                </p>
                <p className="text-green-600 text-sm mt-1">The selected answer matches the correct answer</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-red-50/90 backdrop-blur-sm rounded-xl border border-red-200 transform transition-all duration-300 hover:translate-x-2">
              <div className="flex-1">
                <p className="text-red-800 font-medium flex items-center gap-2">
                  <span className="text-lg">✗</span>
                  Incorrect Answer
                </p>
                <p className="text-red-600 text-sm mt-1">The selected answer is not correct</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <button
          onClick={onNext}
          className="w-full py-4 px-8 rounded-xl text-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
        >
          Continue to True/False Questions
        </button>
      </section>
    </div>
  );
}