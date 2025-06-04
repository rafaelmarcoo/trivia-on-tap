"use client";

import { useState } from 'react';

export default function TrueFalse({ onNext }) {
  const [selectedOption, setSelectedOption] = useState(null);

  const handleButtonClick = (option) => {
    setSelectedOption(option);
  };

  const getButtonClass = (option) => {
    if (selectedOption === option) {
      return option === "True" 
        ? 'bg-green-50/90 backdrop-blur-sm border-green-500 text-green-800 shadow-md' 
        : 'bg-red-50/90 backdrop-blur-sm border-red-500 text-red-800 shadow-md';
    }
    return 'bg-white/80 backdrop-blur-sm border-amber-100 hover:bg-white/90 hover:border-amber-200 hover:shadow-md text-gray-800 transform hover:-translate-y-0.5';
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-semibold shadow-md">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-8 pl-14">
          Select whether you think the statement is true or false.
          The question will be displayed here in the actual quiz.
        </p>

        <div className="pl-14">
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => handleButtonClick("True")}
              className={`p-5 rounded-xl border transition-all duration-300 font-medium ${getButtonClass("True")}`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">✓</span>
                <span>True</span>
              </div>
            </button>

            <button
              onClick={() => handleButtonClick("False")}
              className={`p-5 rounded-xl border transition-all duration-300 font-medium ${getButtonClass("False")}`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">✗</span>
                <span>False</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {selectedOption && (
        <section className="space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-xl border border-amber-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">How it works:</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50/90 backdrop-blur-sm rounded-xl border border-green-200 transform transition-all duration-300 hover:translate-x-2">
              <div className="flex-1">
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  True Answer
                </p>
                <p className="text-green-600 text-sm mt-1">When you select &quot;True&quot;, the button will be highlighted in green</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-red-50/90 backdrop-blur-sm rounded-xl border border-red-200 transform transition-all duration-300 hover:translate-x-2">
              <div className="flex-1">
                <p className="text-red-800 font-medium flex items-center gap-2">
                  <span className="text-lg">✗</span>
                  False Answer
                </p>
                <p className="text-red-600 text-sm mt-1">When you select &quot;False&quot;, the button will be highlighted in red</p>
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
          Continue to Math Questions
        </button>
      </section>
    </div>
  );
}
