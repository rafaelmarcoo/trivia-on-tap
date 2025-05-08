"use client"; // Next.js directive to mark this as a Client Component

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./QuestionDisplay";
import GameSummary from "@/app/dashboard/components/GameSummary";
import { generateTriviaQuestions } from "@/utils/openai";
import { LevelingSystem } from "@/app/leveling/leveling-system";

// Available quiz categories
const categories = [
  { id: "general", name: "General" },
  { id: "history", name: "History" },
  { id: "technology", name: "Technology" },
  { id: "geography", name: "Geography" },
  { id: "science", name: "Science" },
  { id: "math", name: "Math" },
];

export default function MultiPlayerGame() {
  // Next.js hooks for routing and query parameters
  const router = useRouter();
  const searchParams = useSearchParams();
  const userLevel = searchParams.get("level") || 1;
  const supabase = getSupabase();

  // Auto logout hook to handle session timeout
  useAutoLogout();

  // Game state management
  const [gameState, setGameState] = useState("playing"); // playing | summary
  const [questions, setQuestions] = useState([]); // Array of questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Current question index
  const [score, setScore] = useState(0); // Player's score
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const [timeLeft, setTimeLeft] = useState(30); // Timer for each question
  const [gameSummary, setGameSummary] = useState(null); // Game summary data
  const [gameSessionId, setGameSessionId] = useState(null); // Current game session ID
  const [opponents, setOpponents] = useState([]); // Opponents in multiplayer (not fully implemented)
  const [channel, setChannel] = useState(null); // Realtime channel for multiplayer

  // Current question being displayed
  const currentQuestion = questions[currentQuestionIndex];

  // Realtime subscription setup for multiplayer functionality
  useEffect(() => {
    if (!gameSessionId) return;

    // Create a new channel for this game session
    const newChannel = supabase
      .channel(`game:${gameSessionId}`)
      // Listen for changes to game questions
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_questions",
          filter: `game_session_id=eq.${gameSessionId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            // Update local state when a question is updated
            const updatedQuestion = payload.new;
            setQuestions((prev) =>
              prev.map((q) =>
                q.id === updatedQuestion.id
                  ? {
                      ...q,
                      user_answer: updatedQuestion.user_answer,
                      is_correct: updatedQuestion.is_correct,
                    }
                  : q
              )
            );
          }
        }
      )
      // Listen for changes to game sessions
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${gameSessionId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            // End game if session is marked as ended
            const updatedSession = payload.new;
            if (updatedSession.ended_at) {
              endGame();
            }
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    // Cleanup function to remove channel when component unmounts
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [gameSessionId]);

  // Handle moving to the next question
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      // Move to next question and reset timer
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(30);

      // Broadcast question change to other players
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "question_change",
          payload: {
            questionIndex: currentQuestionIndex + 1,
          },
        });
      }
    } else {
      // End game if no more questions
      endGame();
    }
  }, [currentQuestionIndex, questions.length, channel]);

  // Timer effect for each question
  useEffect(() => {
    let timer;
    if (gameState === "playing" && timeLeft > 0 && !isLoading) {
      // Countdown timer
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Move to next question when time runs out
      handleNextQuestion();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isLoading, handleNextQuestion]);

  // Initialize and start a new game
  const startGame = async () => {
    setIsLoading(true);
    setError(null);
    setTimeLeft(30);
    setScore(0);
    setCurrentQuestionIndex(0);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create a new game session in database
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

      // Generate trivia questions using OpenAI
      const generatedQuestions = await generateTriviaQuestions(
        categories.map((category) => category.id),
        userLevel
      );

      // Insert questions into database
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

      // Fetch questions from database to get their IDs
      const { data: dbQuestions, error: fetchError } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_session_id", sessionData.id)
        .order("question_order", { ascending: true });

      if (fetchError) throw fetchError;

      // Format questions for local state
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

  // Handle user answering a question
  const handleAnswer = async (isCorrect, userAnswer) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    try {
      // Update question in database with user's answer
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

  // End the current game session
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Get user's current level
        const { data: userData, error: userError } = await supabase
          .from("user")
          .select("user_level")
          .eq("id", user.id)
          .single();

        if (!userError && userData) {
          const currentLevel = userData.user_level;
          let newLevel = currentLevel;

          // Update level based on score
          if (score > 10) {
            newLevel = currentLevel + 1;
          } else {
            newLevel = Math.max(1, currentLevel - 1); // Don't go below level 1
          }

          // Update user's level in database
          await supabase
            .from("user")
            .update({ user_level: newLevel })
            .eq("id", user.id);
        }
      }

      // Get answered questions for summary
      const { data: answeredQuestions, error: fetchError } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_session_id", gameSessionId)
        .order("question_order", { ascending: true });

      if (fetchError) throw fetchError;

      // Prepare game summary data
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

  // Initialize game when component mounts
  useEffect(() => {
    startGame();
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Render the game UI
  return (
    <div className="max-w-3xl mx-auto p-8 min-h-screen bg-[var(--color-primary)]">
      {/* Back button to dashboard */}
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 px-4 py-2 bg-[var(--color-tertiary)] text-[var(--color-primary)] rounded-md flex items-center gap-2"
      >
        <span>←</span> Back to Dashboard
      </button>

      {/* Game summary screen */}
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
        /* Game playing screen */
        <div className="bg-[var(--color-secondary)] p-8 rounded-lg shadow-md">
          {/* Game info header */}
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

          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-fourth)]">Loading questions...</p>
            </div>
          ) : currentQuestion ? (
            /* Question display */
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
