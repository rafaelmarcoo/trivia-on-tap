"use client";

import { useState } from 'react';
import Maths from "./Maths";

export default function TrueFalse() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);

  const handleButtonClick = (option) => {
    setSelectedOption(option);
  };

  const getButtonClass = (option) => {
    if (selectedOption === option) {
      return option === "True" 
        ? 'bg-green-100 border-green-500' 
        : 'bg-red-100 border-red-500';
    }
    return 'bg-[var(--color-primary)] border-[var(--color-fourth)] hover:bg-[var(--color-tertiary)]';
  };

  return (
    <div className="space-y-6 bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
      {!showQuestion ? (
        <>
          <h2 className="text-xl text-red-500">
            TRUE OR FALSE QUESTION WILL BE DISPLAYED HERE
          </h2>
          <h3 className="text-xl mb-4 font-semibold text-red-500 text-center">
            SELECT TRUE OR FALSE
            <p className="text-4xl text-center font-bold mb-8 text-black">↓</p>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleButtonClick("True")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("True")}`}
            >
              True
            </button>

            <button
              onClick={() => handleButtonClick("False")}
              className={`p-4 rounded-lg border-2 transition-colors ${getButtonClass("False")}`}
            >
              False
            </button>
          </div>

          <div className="flex flex-col items-center mt-8 space-y-4">
            <div className="flex flex-col items-center">
              <span className="text-sm text-center mb-1">
                PRESSING TRUE TURNS IT GREEN
              </span>
              <p className="text-2xl text-black-500">↓</p>
              <button className="bg-green-100 border-green-500 p-4 rounded-lg border-2 transition-colors w-full">
                True
              </button>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-sm text-center mb-1">
                PRESSING FALSE TURNS IT RED
              </span>
              <p className="text-2xl text-black-500">↓</p>
              <button className="bg-red-100 border-red-500 p-4 rounded-lg border-2 transition-colors w-full">
                False
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowQuestion(true)}
            className="w-full py-3 px-6 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors mt-8"
          >
            Next Step
          </button>
        </>
      ) : (
        <Maths />
      )}
    </div>
  );
}
