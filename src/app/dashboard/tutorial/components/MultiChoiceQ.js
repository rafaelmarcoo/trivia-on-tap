"use client";

import { useState } from 'react';
import TrueFalse from "./TrueFalse";

export default function MultiChoiceQ() {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const correctAnswer = "Option B";
  const [showQuestion, setShowQuestion] = useState(false);


  const handleAnswer = (option) => {
    if (!isAnswered) {
      setSelectedAnswer(option);
      setIsAnswered(true);
    }
  };

  const getButtonClass = (option) => {
    if (!isAnswered) {
      return 'bg-gray-100 border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]';
    }

    if (option === correctAnswer) {
      return 'bg-green-100 border-green-500';
    }

    if (option === selectedAnswer && option !== correctAnswer) {
      return 'bg-red-100 border-red-500';
    }

    return 'bg-gray-100 border-[var(--color-fourth)]';
  };

  return (
    
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
                <h1 className="text-4xl text-center font-bold mb-8 text-red-500">
            HOW TO ANSWER QUIZ QUESTIONS
          </h1>

    <div className="space-y-6 bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
      {!showQuestion ? (
        <>
          <h2 className="text-xl text-red-500">
            THE QUESTION WILL BE DISPLAYED HERE
          </h2>
          <h3 className="text-xl mb-4 font-semibold text-red-500 text-center">
            THIS IS A MULTIPLE CHOICE QUESTION
          </h3>
          <h3 className="text-xl mb-4 font-semibold text-red-500 text-center">
            SELECT WHAT YOU THINK IS THE CORRECT ANSWER BELOW
            <p className="text-4xl text-center font-bold mb-8 text-black">↓</p>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleAnswer("Option A")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("Option A")}`}
            >
              Option A
            </button>

            <button
              onClick={() => handleAnswer("Option B")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("Option B")}`}
            >
              Option B
            </button>

            <button
              onClick={() => handleAnswer("Option C")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("Option C")}`}
            >
              Option C
            </button>

            <button
              onClick={() => handleAnswer("Option D")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("Option D")}`}
            >
              Option D
            </button>
          </div>

          {isAnswered && (
            <div className="flex flex-col items-center mt-4 space-y-4">
              <div className="flex flex-col items-center">
                <span className="text-sm text-center mb-1">
                  IF YOU GET THE CORRECT ANSWER THEN THE BOX YOU SELECTED WILL TURN GREEN
                </span>
                <p className="text-2xl text-black-500">↓</p>
                <button className="bg-green-100 border-green-500 p-4 rounded-lg border-2 transition-colors">
                  Option C
                </button>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-sm text-center mb-1">
                  IF YOU GET THE WRONG ANSWER IT WILL TURN RED
                </span>
                <p className="text-2xl text-black-500">↓</p>
                <button className="bg-red-100 border-red-500 p-4 rounded-lg border-2 transition-colors">
                  Option A
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowQuestion(true)}
            className="w-full py-3 px-6 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Next Step
          </button>
        </>
      ) : (
        <TrueFalse />
      )}
    </div>
    </div>

  );
}