"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/utils/supabase";

export default function LobbySystem() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const supabase = getSupabase();
  const router = useRouter();

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
          // Add yourself to waiting_players
          const { data: insertData, error: insertError } = await supabase
            .from("waiting_players")
            .insert({ user_id: user.id })
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

          // Create a new lobby
          const { data: newLobby, error: createError } = await supabase
            .from("game_lobbies")
            .insert({
              host_id: otherPlayer.user_id,
              status: "starting",
              max_players: 2,
              current_players: 2,
            })
            .select()
            .single();
          if (createError) throw createError;

          // Create a new game session (make sure to set game_type)
          const { data: newSession, error: sessionError } = await supabase
            .from("game_sessions")
            .insert({
              lobby_id: newLobby.id,
              game_type: "multiplayer",
            })
            .select()
            .single();
          if (sessionError) throw sessionError;

          // Insert questions for this session (replace with your logic)
          const { data: questions, error: questionsError } = await supabase
            .from("questions_pool")
            .select("*")
            .order("RANDOM()")
            .limit(10);
          if (questionsError) throw questionsError;

          const formattedQuestions = questions.map((q, idx) => ({
            game_session_id: newSession.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            question_order: idx + 1,
          }));

          const { error: insertQuestionsError } = await supabase
            .from("game_questions")
            .insert(formattedQuestions);
          if (insertQuestionsError) throw insertQuestionsError;

          // Update lobby with the new game session id
          await supabase
            .from("game_lobbies")
            .update({ game_session_id: newSession.id })
            .eq("id", newLobby.id);

          // Add both players to the lobby
          await supabase.from("game_lobby_players").insert([
            { lobby_id: newLobby.id, user_id: otherPlayer.user_id },
            { lobby_id: newLobby.id, user_id: user.id },
          ]);

          // Redirect to the lobby/game
          if (isMounted)
            router.push(`/dashboard/multi-player?lobby=${newLobby.id}`);
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
