"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./QuestionDisplay";
import GameSummary from "@/app/dashboard/components/GameSummary";
import LobbySystem from "./LobbySystem";

export default function MultiPlayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get("lobby");
  const supabase = getSupabase();

  useAutoLogout();

  // If there's no lobbyId, we start in "selection" state to show LobbySystem
  const [gameState, setGameState] = useState(lobbyId ? "waiting" : "selection");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameSummary, setGameSummary] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(null);
  const [lobbyData, setLobbyData] = useState(null);
  const [channel, setChannel] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id);
    };
    getCurrentUser();
  }, []);

  // Subscribe to lobby changes
  useEffect(() => {
    if (!lobbyId) return;

    const channel = supabase
      .channel(`lobby:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        async (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedLobby = payload.new;
            setLobbyData(updatedLobby);

            // Check if lobby is ready to start
            if (updatedLobby.current_players === 2) {
              try {
                setIsLoading(true);
                // Get game session ID if not already set
                const sessionId = updatedLobby.game_session_id;
                if (sessionId) {
                  // Fetch and start game immediately
                  const { data: dbQuestions, error: fetchError } =
                    await supabase
                      .from("session_questions")
                      .select("*")
                      .eq("game_session_id", sessionId)
                      .order("question_order", { ascending: true });

                  if (fetchError) throw fetchError;

                  if (dbQuestions && dbQuestions.length > 0) {
                    const formattedQuestions = dbQuestions.map((q) => ({
                      id: q.id,
                      question: q.question_text,
                      type: q.question_type,
                      options: q.options,
                      correctAnswer: q.correct_answer,
                    }));

                    setQuestions(formattedQuestions);
                    setGameSessionId(sessionId);
                    setGameState("playing");
                  }
                }
              } catch (error) {
                console.error("Error starting game:", error);
                setError("Failed to start game");
              } finally {
                setIsLoading(false);
              }
            }
          }
        }
      )
      .subscribe();

    setChannel(channel);

    // Initial lobby check
    const checkLobby = async () => {
      try {
        const { data: lobby, error } = await supabase
          .from("game_lobbies")
          .select("*")
          .eq("id", lobbyId)
          .single();

        if (error) throw error;

        if (lobby) {
          setLobbyData(lobby);
          if (lobby.current_players === 2 && lobby.game_session_id) {
            // Start game immediately if lobby is ready
            const { data: dbQuestions, error: fetchError } = await supabase
              .from("session_questions")
              .select("*")
              .eq("game_session_id", lobby.game_session_id)
              .order("question_order", { ascending: true });

            if (fetchError) throw fetchError;

            if (dbQuestions && dbQuestions.length > 0) {
              const formattedQuestions = dbQuestions.map((q) => ({
                id: q.id,
                question: q.question_text,
                type: q.question_type,
                options: q.options,
                correctAnswer: q.correct_answer,
              }));

              setQuestions(formattedQuestions);
              setGameSessionId(lobby.game_session_id);
              setGameState("playing");
            }
          }
        }
      } catch (error) {
        console.error("Error checking lobby:", error);
        setError("Failed to check lobby status");
      }
    };

    checkLobby();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [lobbyId]);

  const handleAnswer = async (isCorrect, userAnswer) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    try {
      // Update question in database
      await supabase
        .from("session_questions")
        .update({
          user_answer: userAnswer,
          is_correct: isCorrect,
          time_taken: 30 - timeLeft,
        })
        .eq("id", currentQuestion.id);

      handleNextQuestion();
    } catch (error) {
      console.error("Error updating answer:", error);
      setError("Failed to update answer");
    }
  };

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(30);
    } else {
      endGame();
    }
  }, [currentQuestionIndex, questions.length]);

  const endGame = async () => {
    try {
      // Update game session
      await supabase
        .from("game_sessions")
        .update({
          ended_at: new Date().toISOString(),
          score: score,
        })
        .eq("id", gameSessionId);

      // Update lobby status
      await supabase
        .from("game_lobbies")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", lobbyId);

      setGameState("summary");
      setGameSummary({
        score,
        totalQuestions: questions.length,
        timeTaken: questions.length * 30 - timeLeft,
      });
    } catch (error) {
      console.error("Error ending game:", error);
      setError("Failed to end game properly");
    }
  };

  // Timer effect
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

  // Render conditions
  if (gameState === "selection") {
    return <LobbySystem />;
  }

  if (gameState === "playing" && questions.length > 0) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] p-8">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        <QuestionDisplay
          question={currentQuestion.question}
          type={currentQuestion.type}
          options={currentQuestion.options}
          correctAnswer={currentQuestion.correctAnswer}
          onAnswer={handleAnswer}
          timeLeft={timeLeft}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          score={score}
        />
      </div>
    );
  }

  if (gameState === "summary") {
    return (
      <GameSummary
        summary={gameSummary}
        onPlayAgain={() => router.push("/dashboard/multi-player")}
      />
    );
  }

  // Default loading state
  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="animate-pulse text-[var(--color-fourth)] text-xl">
        {isLoading ? "Loading game..." : "Waiting for players..."}
      </div>
    </div>
  );
}
