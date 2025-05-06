"use client";

import { useState } from "react";
import Categories from "./components/Categories";
import Question from "./components/MultiChoiceQ";
import { useRouter, useSearchParams } from 'next/navigation';


export default function TutorialPage() {
  const [showQuestion, setShowQuestion] = useState(false);
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
            <button
        onClick={() =>  router.push('/dashboard')}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>
      {!showQuestion ? (
        <>
          <h1 className="text-4xl text-center font-bold mb-8 text-red-500">
            HELLO WELCOME TO TUTORIAL PAGE
          </h1>

          <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
            <h2 className="text-2xl mb-4 text-red-500">
              STEP 1: SELECT A CATEGORY
            </h2>
            <p className="text-red-500/80 mb-8">
              CLICK ON THE CATEGORY OR CATEGORIES THAT YOU WOULD LIKE TO INCLUDE
              IN YOUR QUIZ.
            </p>

            <Categories />
            
            <h2 className="text-2xl mb-4 text-red-500">
              STEP 2: CLICK ON THE START GAME BUTTON BELOW
              <p className="text-4xl text-center mb-8 text-red-500">↓</p>
            </h2>
            <button
              className="w-full py-4 px-8 rounded-lg text-lg bg-red-500 cursor-pointer text-[var(--color-white)]"
              onClick={() => setShowQuestion(true)}
            >
              Start Game
            </button>
          </div>
        </>
      ) : (
        <Question />
      )}
    </div>
  );
}