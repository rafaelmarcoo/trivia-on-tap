"use client";

import { useState } from "react";

export default function Maths({ onComplete }) {
  const [answer, setAnswer] = useState("");

  const handleChange = (e) => {
    setAnswer(e.target.value);
  };

  const handleSubmit = () => {
    // Handle answer submission logic here
    console.log("Submitted answer:", answer);
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-6 pl-11">
          The question will be displayed here during the actual quiz.
          Enter your numerical answer in the field below.
        </p>

        <div className="pl-11 space-y-4">
          <div className="space-y-2">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
              Your Answer
            </label>
            <input
              id="answer"
              type="text"
              value={answer}
              onChange={handleChange}
              className="w-full p-4 rounded-lg border border-gray-200 bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
              placeholder="Enter your numerical answer"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={answer.trim() === ""}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              answer.trim() !== ""
                ? "bg-gray-800 text-white hover:bg-gray-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Answer
          </button>
        </div>
      </section>

      <section className="space-y-6 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4">How it works:</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-1">
              <p className="text-green-800 font-medium">Correct Answer</p>
              <p className="text-green-600 text-sm">Your answer matches the expected result</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex-1">
              <p className="text-red-800 font-medium">Incorrect Answer</p>
              <p className="text-red-600 text-sm">The correct answer was: [answer]</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <button
          onClick={onComplete}
          className="w-full py-4 px-8 rounded-lg text-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors shadow-md"
        >
          Complete Tutorial
        </button>
      </section>
    </div>
  );
}
