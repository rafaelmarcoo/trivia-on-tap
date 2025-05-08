"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./components/QuestionDisplay";
import GameSummary from "../components/GameSummary";
import { generateTriviaQuestions } from "@/utils/openai";

const categories = [
  { id: "general", name: "General" },
  { id: "history", name: "History" },
  { id: "technology", name: "Technology" },
  { id: "geography", name: "Geography" },
  { id: "science", name: "Science" },
  { id: "math", name: "Math" },
];

function MultiPlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userLevel = searchParams.get("level") || 1;
  const supabase = getSupabase();

  useAutoLogout();

  const [gameState, setGameState] = useState("playing");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameSummary, setGameSummary] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(null);

  const currentQuestion = questions[currentQuestionIndex];

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(30);
    } else {
      endGame();
    }
  }, [currentQuestionIndex, questions.length]);

  useEffect(() => {
    let timer;
    if (gameState === "playing" && timeLeft > 0 && !isLoading) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isLoading, handleNextQuestion]);

  const startGame = async () => {
    setIsLoading(true);
    setError(null);
    setTimeLeft(30);
    setScore(0);
    setCurrentQuestionIndex(0);

    try {
      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create game session
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          game_type: "multi_player",
          user_id: user.id,
          total_questions: 20,
          categories: categories.map((category) => category.id),
          difficulty_level: parseInt(userLevel),
          time_per_question: 30,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setGameSessionId(sessionData.id);

      // Generate questions
      const generatedQuestions = await generateTriviaQuestions(
        categories.map((category) => category.id),
        userLevel
      );

      // Store questions in database
      const { error: insertError } = await supabase
        .from("game_questions")
        .insert(
          generatedQuestions.map((q, index) => ({
            game_session_id: sessionData.id,
            question_text: q.question,
            question_type: q.type,
            options: q.options,
            correct_answer: q.correctAnswer,
            explanation: q.explanation,
            question_order: index + 1,
          }))
        );

      if (insertError) throw insertError;

      // Fetch the questions back from the database to ensure consistency
      const { data: dbQuestions, error: fetchError } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_session_id", sessionData.id)
        .order("question_order", { ascending: true });

      if (fetchError) throw fetchError;

      // Map database questions to our expected format
      const formattedQuestions = dbQuestions.map((q) => ({
        id: q.id,
        question: q.question_text,
        type: q.question_type,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        category: q.category,
      }));

      setQuestions(formattedQuestions);
      setGameState("playing");
    } catch (error) {
      console.error("Error starting game:", error);
      setError(error.message || "Failed to start the game. Please try again.");
      setGameState("selection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isCorrect, userAnswer) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    try {
      // Update the question in the database with the user's answer
      await supabase
        .from("game_questions")
        .update({
          user_answer: userAnswer,
          is_correct: isCorrect,
          time_taken: 30 - timeLeft,
          answered_at: new Date().toISOString(),
        })
        .eq("id", questions[currentQuestionIndex].id);
    } catch (error) {
      console.error("Error updating answer:", error);
    }
  };

  const endGame = async () => {
    try {
      // Update game session with final score
      await supabase
        .from("game_sessions")
        .update({
          score: score,
          ended_at: new Date().toISOString(),
        })
        .eq("id", gameSessionId);

      // Get all questions with user answers for the summary
      const { data: answeredQuestions, error: fetchError } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_session_id", gameSessionId)
        .order("question_order", { ascending: true });

      if (fetchError) throw fetchError;

      setGameSummary({
        score,
        totalQuestions: questions.length,
        categories: categories.map((category) => category.name),
        questions: answeredQuestions.map((q) => ({
          ...q,
          question: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          userAnswer: q.user_answer,
          isCorrect: q.is_correct,
        })),
      });
      setGameState("summary");
    } catch (error) {
      console.error("Error ending game:", error);
      setError("Failed to save game results. Please try again.");
    }
  };

  useEffect(() => {
    startGame();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>

      {gameState === "summary" ? (
        <GameSummary
          gameData={gameSummary}
          onAction={() => {
            setGameState("playing");
            startGame();
          }}
          actionLabel="Play Again"
          showCategories={true}
        />
      ) : (
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl text-[var(--color-fourth)]">
                Score: {score}
              </h2>
              <p className="text-[var(--color-fourth)]">
                Time left: {timeLeft}s
              </p>
              <p className="text-[var(--color-fourth)]">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <button
              onClick={endGame}
              className="px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md"
            >
              End Game
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-fourth)]">Loading questions...</p>
            </div>
          ) : currentQuestion ? (
            <QuestionDisplay
              type={currentQuestion.type}
              question={currentQuestion.question}
              options={currentQuestion.options}
              correctAnswer={currentQuestion.correctAnswer}
              explanation={currentQuestion.explanation}
              onAnswer={handleAnswer}
              onNextQuestion={handleNextQuestion}
              isLastQuestion={currentQuestionIndex === questions.length - 1}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function MultiPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
          <div className="animate-pulse text-[var(--color-fourth)] text-xl">
            Loading...
          </div>
        </div>
      }
    >
      <MultiPlayerGame />
    </Suspense>
  );
}
