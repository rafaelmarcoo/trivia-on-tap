"use client"; // Next.js directive to mark this as a Client Component

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./QuestionDisplay";
import GameSummary from "@/app/dashboard/components/GameSummary";
import { generateTriviaQuestions } from "@/utils/openai";
import { LevelingSystem } from "@/app/leveling/leveling-system";
import LobbySystem from "./LobbySystem";
import { useNotifications } from "@/components/notifications/InGameNotificationProvider";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const lobbyId = searchParams.get("lobby");
  const userLevel = searchParams.get("level") || 1;
  const supabase = getSupabase();
  const { setGameActive } = useNotifications();

  useAutoLogout();

  const [gameState, setGameState] = useState(lobbyId ? "lobby" : "selection");
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

  // Subscribe to lobby and game changes
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

            // If lobby status changed to starting, initialize the game
            if (updatedLobby.status === "starting" && !gameSessionId) {
              await initializeGame(updatedLobby);
            }
          }
        }
      )
      .subscribe();

    setChannel(channel);

    // Fetch initial lobby data
    fetchLobbyData();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [lobbyId]);

  const fetchLobbyData = async () => {
    try {
      const { data, error } = await supabase
        .from("game_lobbies")
        .select("*")
        .eq("id", lobbyId)
        .single();

      if (error) throw error;
      setLobbyData(data);
    } catch (error) {
      console.error("Error fetching lobby data:", error);
      setError("Failed to fetch lobby data");
    }
  };

  const initializeGame = async (lobby) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not authenticated");

      // Create game session
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          user_id: user.id,
          total_questions: 20,
          categories: categories.map((category) => category.id),
          user_level: parseInt(userLevel),
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
            question_order: index + 1,
          }))
        );

      if (insertError) throw insertError;

      // Update lobby with game session
      await supabase
        .from("game_lobbies")
        .update({
          game_session_id: sessionData.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", lobbyId);

      // Fetch questions from database
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
      }));

      setQuestions(formattedQuestions);
      setGameState("playing");
    } catch (error) {
      console.error("Error initializing game:", error);
      setError(error.message || "Failed to initialize the game");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (isCorrect, userAnswer) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    try {
      // Update question in database
      await supabase
        .from("game_questions")
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

  useEffect(() => {
    // Activate notifications when game starts playing
    if (gameState === 'playing') {
      setGameActive(true)
    } else {
      setGameActive(false)
    }

    // Cleanup when component unmounts
    return () => {
      setGameActive(false)
    }
  }, [gameState, setGameActive])

  if (gameState === "selection") {
    return <LobbySystem />;
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--color-fourth)]">
              Game Lobby
            </h1>
            <button
              onClick={async () => {
                try {
                  // Remove player from lobby
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from("game_lobby_players")
                      .delete()
                      .eq("lobby_id", lobbyId)
                      .eq("user_id", user.id);

                    // Update player count
                    await supabase
                      .from("game_lobbies")
                      .update({
                        current_players: lobbyData.current_players - 1,
                        status:
                          lobbyData.current_players <= 1
                            ? "completed"
                            : "waiting",
                      })
                      .eq("id", lobbyId);
                  }
                  router.push("/dashboard/multi-player");
                } catch (error) {
                  console.error("Error leaving lobby:", error);
                  setError("Failed to leave lobby");
                }
              }}
              className="bg-[var(--color-tertiary)] text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
            >
              Leave Lobby
            </button>
          </div>

          {error && (
            <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {lobbyData && (
            <div className="bg-[var(--color-secondary)] p-6 rounded-lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Players in Lobby
                </h2>
                <div className="space-y-2">
                  {lobbyData.current_players === 0 ? (
                    <p className="text-gray-300">No players yet</p>
                  ) : (
                    <p className="text-white">
                      Players: {lobbyData.current_players}/
                      {lobbyData.max_players}
                    </p>
                  )}
                </div>
              </div>

              {currentUserId === lobbyData.host_id && (
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        setError(null);
                        // Check if there are enough players
                        if (lobbyData.current_players < 1) {
                          throw new Error("Need at least 1 player to start");
                        }

                        // Update lobby status to starting
                        const { error: updateError } = await supabase
                          .from("game_lobbies")
                          .update({ status: "starting" })
                          .eq("id", lobbyId);

                        if (updateError) throw updateError;

                        // Initialize the game
                        await initializeGame(lobbyData);
                      } catch (error) {
                        console.error("Error starting game:", error);
                        setError(error.message || "Failed to start game");
                      }
                    }}
                    disabled={lobbyData.current_players < 1}
                    className="bg-[var(--color-fourth)] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {lobbyData.current_players < 1
                      ? "Waiting for Players..."
                      : "Start Game"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] p-8">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-[var(--color-fourth)] text-xl">
              Loading...
            </div>
          </div>
        ) : (
          <QuestionDisplay
            question={currentQuestion}
            timeLeft={timeLeft}
            onAnswer={handleAnswer}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
          />
        )}
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

  return null;
}
