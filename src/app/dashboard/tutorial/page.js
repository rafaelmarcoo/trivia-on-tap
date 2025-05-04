"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Categories from "./components/Categories";
import Question from "./components/Question";
import { generateTriviaQuestion } from "@/utils/openai";

export default function TutorialPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [gameState, setGameState] = useState("selection"); // 'selection' | 'playing'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((cat) => cat !== category);
      }
      return [...prev, category];
    });
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      const question = await generateTriviaQuestion(selectedCategories);
      setCurrentQuestion(question);
      setGameState("playing");
    } catch (error) {
      console.error("Error starting game:", error);
      // TODO: Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    setIsLoading(true);
    try {
      const question = await generateTriviaQuestion(selectedCategories);
      setCurrentQuestion(question);
    } catch (error) {
      console.error("Error generating next question:", error);
      // TODO: Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>

      {gameState === "selection" ? (
        <>
          <h1 className="text-4xl text-center mb-8 text-red-500">
            HELLO WELCOME TO TUTORIAL PAGE
          </h1>

          <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
            <h2 className="text-2xl mb-4 text-red-500">
              STEP 1: SELECT A CATEGORY
            </h2>
            <p className="text-red-500/80 mb-8">
              CLICK ON THE CATEGORY OR CATORIES THAT YOU WOULD LIKE TO INCLUDE
              IN YOUR QUIZ.
            </p>

            <Categories
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
            />
            <h2 className="text-2xl mb-4 text-red-500">
              STEP 2: CLICK ON THE START GAME BUTTON BELOW
              <p className="text-4xl text-center mb-8 text-red-500">↓</p>
            </h2>
            <button
              className={`w-full py-4 px-8 rounded-lg text-lg ${
                selectedCategories.length > 0
                  ? "bg-red-500 cursor-pointer"
                  : "bg-red-300 cursor-not-allowed"
              } text-[var(--color-white)]`}
              onClick={startGame}
              disabled={selectedCategories.length === 0 || isLoading}
            >
              {isLoading ? "Loading..." : "Start Game"}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-[var(--color-fourth)]">
              Score: {score}
            </h2>
            <button
              onClick={() => setGameState("selection")}
              className="px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md"
            >
              End Game
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-fourth)]">
                Loading next question...
              </p>
            </div>
          ) : currentQuestion ? (
            <Question
              question={currentQuestion.question}
              options={currentQuestion.options}
              correctAnswer={currentQuestion.correctAnswer}
              onAnswer={handleAnswer}
              onNextQuestion={handleNextQuestion}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
