"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Maths() {
  const [answer, setAnswer] = useState("");
  const router  = useRouter();

  const handleChange = (e) => {
    setAnswer(e.target.value);
  };

  const handleSubmit = () => {
    // Handle answer submission logic here
    console.log("Submitted answer:", answer);
  };

  return (
    <div className="space-y-4">

      <h2 className="text-xl text-red-500">
        MATHS QUESTION WILL BE DISPLAYED HERE
      </h2>
      <h3 className="text-xl mb-4 font-semibold text-red-500 text-center">
        ENTER YOUR ANSWER BELOW
        <p className="text-4xl text-center mb-8 text-red-500">↓</p>
      </h3>

      <input
        type="text"
        value={answer}
        onChange={handleChange}
        className="w-full p-4 rounded-lg border-2 bg-[var(--color-primary)] border-[var(--color-fourth)]"
        placeholder="Enter your answer (numbers only)"
      />

      <button
        onClick={handleSubmit}
        disabled={answer.trim() === ""}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          answer.trim() !== ""
            ? "bg-[var(--color-tertiary)] text-[var(--color-primary)] hover:bg-opacity-90"
            : "bg-[var(--color-tertiary)] text-[var(--color-primary)] opacity-50 cursor-not-allowed"
        }`}
      >
        Submit Answer
      </button>

      {/* Example result display sections */}
      <div className="flex flex-col items-center">
        <span className="text-sm text-center mb-1">
          IF YOU GET THE CORRECT ANSWER THEN THIS WILL BE DISPLAYED BELOW
        </span>
        <p className="text-2xl text-black-500">↓</p>
        <div className="text-green-700 font-bold">Correct!</div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-sm text-center mb-1">
          IF YOU GET THE WRONG ANSWER THEN THIS WILL BE DISPLAYED BELOW
        </span>
        <p className="text-2xl text-black-500">↓</p>
        <div className="text-red-700 font-bold">
          Incorrect. The correct answer was: _________
        </div>
      </div>
      <button
            onClick={() => router.push('/dashboard/')}
            className="w-full py-3 px-6 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors mt-8"
          >
            END TUTORIAL
          </button>
    </div>
  );
}
