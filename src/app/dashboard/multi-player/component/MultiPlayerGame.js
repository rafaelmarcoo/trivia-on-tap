"use client"; // Next.js directive to mark this as a Client Component

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAutoLogout, getSupabase } from "@/utils/supabase";
import QuestionDisplay from "./QuestionDisplay";
import GameSummary from "@/app/dashboard/components/GameSummary";
import { generateTriviaQuestions } from "@/utils/openai";
import { LevelingSystem } from "@/app/leveling/leveling-system";
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
  const sessionId = searchParams.get("session");
  const userLevel = searchParams.get("level") || 1;
  const supabase = getSupabase();

  useAutoLogout();

  const [gameState, setGameState] = useState("selection");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameSummary, setGameSummary] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(sessionId);
  const [lobbyData, setLobbyData] = useState(null);
  const [channel, setChannel] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

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

            // Start game immediately if lobby is in_progress and has game session
            if (
              updatedLobby.status === "in_progress" &&
              updatedLobby.game_session_id
            ) {
              try {
                setIsLoading(true);
                const { data: dbQuestions, error: fetchError } = await supabase
                  .from("game_questions")
                  .select("*")
                  .eq("game_session_id", updatedLobby.game_session_id)
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
                  setGameSessionId(updatedLobby.game_session_id);
                  setGameState("playing");
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

    // Check initial lobby state
    const checkInitialLobbyState = async () => {
      try {
        console.log("Checking initial lobby state for lobby:", lobbyId);
        const { data: lobby, error } = await supabase
          .from("game_lobbies")
          .select("*")
          .eq("id", lobbyId)
          .single();

        if (error) {
          console.error("Error fetching lobby:", error);
          throw error;
        }

        console.log("Found lobby:", lobby);
        setLobbyData(lobby);

        if (lobby && lobby.status === "in_progress" && lobby.game_session_id) {
          console.log(
            "Lobby is in progress, fetching questions for session:",
            lobby.game_session_id
          );
          const { data: dbQuestions, error: fetchError } = await supabase
            .from("game_questions")
            .select("*")
            .eq("game_session_id", lobby.game_session_id)
            .order("question_order", { ascending: true });

          if (fetchError) {
            console.error("Error fetching questions:", fetchError);
            throw fetchError;
          }

          if (dbQuestions && dbQuestions.length > 0) {
            console.log("Found questions:", dbQuestions.length);
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
          } else {
            console.log("No questions found for session");
          }
        } else {
          console.log("Lobby not in progress or no game session");
        }
      } catch (error) {
        console.error("Error checking initial lobby state:", error);
        setError("Failed to check game status");
        // Don't rethrow the error, just log it and set the error state
      }
    };

    checkInitialLobbyState();

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

      // Use pre-generated questions if available, otherwise generate new ones
      const generatedQuestions =
        preGeneratedQuestions ||
        (await generateTriviaQuestions(
          categories.map((category) => category.id),
          userLevel
        ));

      // Clear pre-generated questions after using them
      if (preGeneratedQuestions) {
        setPreGeneratedQuestions(null);
      }

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

  // Matchmaking effect
  useEffect(() => {
    const matchmake = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        // Start generating questions in parallel if not already generated
        if (!preGeneratedQuestions && !isGeneratingQuestions) {
          setIsGeneratingQuestions(true);
          generateTriviaQuestions(
            categories.map((category) => category.id),
            userLevel
          )
            .then((questions) => {
              setPreGeneratedQuestions(questions);
              setIsGeneratingQuestions(false);
            })
            .catch((error) => {
              console.error("Error pre-generating questions:", error);
              setIsGeneratingQuestions(false);
            });
        }

        // Try to find a lobby with 1 player and status 'waiting'
        const { data: lobbies, error: findError } = await supabase
          .from("game_lobbies")
          .select("*")
          .eq("status", "waiting")
          .eq("current_players", 1)
          .limit(1);

        let lobby;
        if (findError) throw findError;

        if (lobbies && lobbies.length > 0) {
          // Join the existing lobby
          lobby = lobbies[0];
          await supabase.from("game_lobby_players").insert({
            lobby_id: lobby.id,
            user_id: user.id,
          });
          // Update lobby to 2 players and set status to 'starting'
          await supabase
            .from("game_lobbies")
            .update({ current_players: 2, status: "starting" })
            .eq("id", lobby.id);
          setLobbyId(lobby.id);
        } else {
          // Create a new lobby
          const { data: newLobby, error: createError } = await supabase
            .from("game_lobbies")
            .insert({
              host_id: user.id,
              status: "waiting",
              max_players: 2,
              current_players: 1,
            })
            .select()
            .single();
          if (createError) throw createError;

          await supabase.from("game_lobby_players").insert({
            lobby_id: newLobby.id,
            user_id: user.id,
          });
          setLobbyId(newLobby.id);
        }
      } catch (error) {
        setError(error.message || "Matchmaking failed");
      } finally {
        setIsLoading(false);
      }
    };

    // Only matchmake if not already in a lobby
    if (!lobbyId) {
      matchmake();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  // Listen for lobby status change to start game automatically
  useEffect(() => {
    if (
      lobbyData &&
      (lobbyData.status === "starting" || lobbyData.status === "in_progress") &&
      gameState !== "playing"
    ) {
      const fetchQuestionsAndStart = async () => {
        try {
          setIsLoading(true);
          const { data: dbQuestions, error: fetchError } = await supabase
            .from("game_questions")
            .select("*")
            .eq("game_session_id", lobbyData.game_session_id)
            .order("question_order", { ascending: true });

          if (fetchError) throw fetchError;

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
          setError("Failed to start game");
        } finally {
          setIsLoading(false);
        }
      };

      fetchQuestionsAndStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyData?.status]);

  if (gameState === "selection") {
    return <LobbySystem />;
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
        ) : currentQuestion ? (
          <QuestionDisplay
            type={currentQuestion.type}
            question={currentQuestion.question}
            options={currentQuestion.options}
            correctAnswer={currentQuestion.correctAnswer}
            onAnswer={handleAnswer}
            onNextQuestion={handleNextQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
            timeLeft={timeLeft}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
          />
        ) : (
          <div className="text-center text-[var(--color-fourth)] text-xl">
            No questions available
          </div>
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

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="animate-pulse text-[var(--color-fourth)] text-xl">
        Loading game...
      </div>
    </div>
  );
}
