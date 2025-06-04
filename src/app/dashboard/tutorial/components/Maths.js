"use client";

import { useState } from "react";

export default function Maths({ onComplete }) {
  const [answer, setAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setAnswer(e.target.value);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-semibold shadow-md">1</span>
          <h2 className="text-2xl font-semibold text-gray-800">Sample Question</h2>
        </div>
        <p className="text-gray-600 mb-8 pl-14">
          The question will be displayed here during the actual quiz.
          Enter your numerical answer in the field below.
        </p>

        <div className="pl-14 space-y-6">
          <div className="space-y-3">
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700">
              Your Answer
            </label>
            <div className="relative">
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={handleChange}
                className="w-full p-5 rounded-xl border border-amber-100 bg-white/80 backdrop-blur-sm focus:border-amber-300 focus:ring-2 focus:ring-amber-200 transition-all duration-300 shadow-sm"
                placeholder="Enter your numerical answer"
              />
              {isSubmitted && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <span className="text-2xl">{Math.random() > 0.5 ? "✓" : "✗"}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={answer.trim() === ""}
            className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
              answer.trim() !== ""
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg transform hover:-translate-y-1"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Submit Answer
          </button>
        </div>
      </section>

      <section className="space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-xl border border-amber-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">How it works:</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-green-50/90 backdrop-blur-sm rounded-xl border border-green-200 transform transition-all duration-300 hover:translate-x-2">
            <div className="flex-1">
              <p className="text-green-800 font-medium flex items-center gap-2">
                <span className="text-lg">✓</span>
                Correct Answer
              </p>
              <p className="text-green-600 text-sm mt-1">Your answer matches the expected result</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-red-50/90 backdrop-blur-sm rounded-xl border border-red-200 transform transition-all duration-300 hover:translate-x-2">
            <div className="flex-1">
              <p className="text-red-800 font-medium flex items-center gap-2">
                <span className="text-lg">✗</span>
                Incorrect Answer
              </p>
              <p className="text-red-600 text-sm mt-1">The correct answer was: [answer]</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <button
          onClick={onComplete}
          className="w-full py-4 px-8 rounded-xl text-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
        >
          Complete Tutorial
        </button>
      </section>
    </div>
  );
}
