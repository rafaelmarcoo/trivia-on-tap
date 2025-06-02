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
        ? 'bg-green-100 border-green-500 text-green-800' 
        : 'bg-red-100 border-red-500 text-red-800';
    }
    return 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800';
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-6 pl-11">
          Select whether you think the statement is true or false.
          The question will be displayed here in the actual quiz.
        </p>

        <div className="pl-11">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleButtonClick("True")}
              className={`p-4 rounded-lg border transition-colors font-medium ${getButtonClass("True")}`}
            >
              True
            </button>

            <button
              onClick={() => handleButtonClick("False")}
              className={`p-4 rounded-lg border transition-colors font-medium ${getButtonClass("False")}`}
            >
              False
            </button>
          </div>
        </div>
      </section>

      {selectedOption && (
        <section className="space-y-6 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">How it works:</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-1">
                <p className="text-green-800 font-medium">True Answer</p>
                <p className="text-green-600 text-sm">When you select &quot;True&quot;, the button will be highlighted in green</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-1">
                <p className="text-red-800 font-medium">False Answer</p>
                <p className="text-red-600 text-sm">When you select &quot;False&quot;, the button will be highlighted in red</p>
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
          Continue to Math Questions
        </button>
      </section>
    </div>
  );
}
