"use client"; // Next.js directive to mark this as a Client Component

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./QuestionDisplay";
import GameSummary from "@/app/dashboard/components/GameSummary";
import { generateTriviaQuestions } from "@/utils/openai";
import LobbySystem from "./LobbySystem";

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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [channel, setChannel] = useState(null);

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_lobby_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => {
          fetchLobbyData();
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
        .select(`
          *,
          game_lobby_players (
            user_id,
            users (
              email
            )
          )
        `)
        .eq("id", lobbyId)
        .single();

      if (error) throw error;
      setLobbyData(data);

      // If lobby is already in progress, initialize the game
      if (data.status === "in_progress" && data.game_session_id) {
        await initializeGame(data);
      }
    } catch (error) {
      console.error("Error fetching lobby data:", error);
      setError("Failed to fetch lobby data");
      // If there's an error, redirect back to lobby list
      router.push("/dashboard/multi-player");
    }
  };

  const initializeGame = async (lobby) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
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

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(30);
    } else {
      endGame();
    }
  };

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
  }, [gameState, timeLeft, isLoading]);

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
              onClick={() => router.push("/dashboard/multi-player")}
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

          <div className="bg-[var(--color-secondary)] p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Players ({lobbyData.current_players}/{lobbyData.max_players})
            </h2>
            <div className="space-y-2">
              {lobbyData.game_lobby_players?.map((player) => (
                <div
                  key={player.user_id}
                  className="flex items-center gap-2 bg-[var(--color-primary)] p-3 rounded-lg"
                >
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="text-white">
                    {player.users.email}
                    {player.user_id === lobbyData.host_id && " (Host)"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-pulse text-[var(--color-fourth)] text-xl">
              Loading game...
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        ) : currentQuestion ? (
          <QuestionDisplay
            question={currentQuestion}
            onAnswer={handleAnswer}
            timeLeft={timeLeft}
            setTimeLeft={setTimeLeft}
          />
        ) : gameSummary ? (
          <GameSummary
            score={score}
            totalQuestions={questions.length}
            onPlayAgain={() => router.push("/dashboard/multi-player")}
          />
        ) : null}
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
