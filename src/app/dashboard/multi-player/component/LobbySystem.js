"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/utils/supabase";
import { generateTriviaQuestions } from "@/utils/openai";

// Available quiz categories
const categories = [
  { id: "general", name: "General" },
  { id: "history", name: "History" },
  { id: "technology", name: "Technology" },
  { id: "geography", name: "Geography" },
  { id: "science", name: "Science" },
  { id: "math", name: "Math" },
];

export default function LobbySystem() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const supabase = getSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userLevel = searchParams.get("level") || 1;
  const [matchFound, setMatchFound] = useState(false);
  const [matchData, setMatchData] = useState(null);

  // Subscribe to waiting_players table in realtime
  useEffect(() => {
    let channel;
    const fetchWaitingPlayers = async () => {
      const { data, error } = await supabase
        .from("waiting_players")
        .select("*");
      if (!error) setWaitingPlayers(data || []);
    };

    fetchWaitingPlayers();

    channel = supabase
      .channel("public:waiting_players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiting_players" },
        (payload) => {
          fetchWaitingPlayers();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId;

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

        // Check if already in waiting_players
        const { data: alreadyWaiting } = await supabase
          .from("waiting_players")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!alreadyWaiting) {
          // Add yourself to waiting_players using upsert
          const { data: insertData, error: insertError } = await supabase
            .from("waiting_players")
            .upsert({ user_id: user.id })
            .select()
            .single();

          if (insertError) {
            setError("Failed to join matchmaking: " + insertError.message);
            console.error("Supabase insert error:", insertError);
            return;
          }
          if (!insertData) {
            setError(
              "Insert succeeded but no data returned. Check Supabase policies."
            );
            return;
          }
          // For debugging: log the inserted row
          console.log("Inserted into waiting_players:", insertData);

          setIsLoading(false);
          return; // Wait for next poll to look for a match
        }

        // Try to find another waiting player (not yourself)
        const { data: waitingPlayers, error: waitingError } = await supabase
          .from("waiting_players")
          .select("*")
          .neq("user_id", user.id)
          .limit(1);

        if (waitingError) throw waitingError;

        if (waitingPlayers && waitingPlayers.length > 0) {
          // Found another waiting player, create a lobby and assign both
          const otherPlayer = waitingPlayers[0];

          // Remove both players from waiting list
          await supabase
            .from("waiting_players")
            .delete()
            .in("user_id", [otherPlayer.user_id, user.id]);

          // Create a new game session
          const { data: newSession, error: sessionError } = await supabase
            .from("game_sessions")
            .insert({
              game_type: "multiplayer",
              total_questions: 10,
              user_id: user.id,
            })
            .select()
            .single();

          if (sessionError) throw sessionError;

          // Generate questions using OpenAI
          const generatedQuestions = await generateTriviaQuestions(
            categories.map((category) => category.id),
            userLevel
          );

          // Insert questions into database
          const { error: insertQuestionsError } = await supabase
            .from("game_questions")
            .insert(
              generatedQuestions.map((q, index) => ({
                game_session_id: newSession.id,
                question_text: q.question,
                question_type: q.type,
                options: q.options,
                correct_answer: q.correctAnswer,
                question_order: index + 1,
              }))
            );

          if (insertQuestionsError) throw insertQuestionsError;

          // Create a new lobby with in_progress status and game session
          const { data: newLobby, error: createError } = await supabase
            .from("game_lobbies")
            .insert({
              host_id: otherPlayer.user_id,
              status: "in_progress",
              max_players: 2,
              current_players: 2,
              game_session_id: newSession.id,
            })
            .select()
            .single();

          if (createError) throw createError;

          // Add both players to the lobby
          await supabase.from("game_lobby_players").insert([
            { lobby_id: newLobby.id, user_id: otherPlayer.user_id },
            { lobby_id: newLobby.id, user_id: user.id },
          ]);

          if (isMounted) {
            // Instead of redirecting, set match data and flag
            setMatchData({
              lobbyId: newLobby.id,
              sessionId: newSession.id,
            });
            setMatchFound(true);
          }
        }
      } catch (error) {
        setError(error.message || "Matchmaking failed");
      } finally {
        setIsLoading(false);
      }
    };

    matchmake();
    intervalId = setInterval(matchmake, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If match is found, update URL and let parent component handle the game
  useEffect(() => {
    if (matchFound && matchData) {
      const url = `/dashboard/multi-player?lobby=${matchData.lobbyId}&session=${matchData.sessionId}`;
      // Update URL without navigation
      window.history.pushState({}, "", url);
      // Force a re-render of the parent component
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [matchFound, matchData]);

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-fourth)] mb-4">
          Finding a match...
        </h1>
        {isLoading && (
          <div className="animate-pulse text-[var(--color-fourth)] text-xl">
            Looking for another player...
          </div>
        )}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mt-4">
            {error}
          </div>
        )}
        {/* Show waiting players for debugging */}
        <div className="mt-4">
          <h2 className="text-lg text-[var(--color-fourth)] mb-2">
            Waiting Players:
          </h2>
          <ul className="text-white">
            {waitingPlayers.map((p) => (
              <li key={p.user_id}>{p.user_id}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
