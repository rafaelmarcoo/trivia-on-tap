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
      try {
        const { data, error } = await supabase
          .from("waiting_players")
          .select("*");

        if (error) {
          console.error("Error fetching waiting players:", error);
          return;
        }

        setWaitingPlayers(data || []);
        console.log("Updated waiting players:", data); // Debug log
      } catch (err) {
        console.error("Error in fetchWaitingPlayers:", err);
      }
    };

    fetchWaitingPlayers(); // Initial fetch

    channel = supabase
      .channel("public:waiting_players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiting_players" },
        (payload) => {
          console.log("Waiting players changed:", payload); // Debug log
          fetchWaitingPlayers();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const matchmake = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Auth error:", userError);
          throw new Error("Authentication failed");
        }

        if (!user) {
          throw new Error("No user found");
        }

        console.log("Current user:", user.id); // Debug log

        try {
          // Check if player is already in a lobby
          const { data: lobbyPlayer, error: lobbyError } = await supabase
            .from("game_lobby_players")
            .select("lobby_id")
            .eq("user_id", user.id)
            .maybeSingle();

          console.log("Lobby check result:", { lobbyPlayer, lobbyError }); // Debug log

          if (lobbyError) {
            console.error("Lobby check error:", lobbyError);
            throw lobbyError;
          }

          if (lobbyPlayer?.lobby_id) {
            console.log("Redirecting to existing lobby:", lobbyPlayer.lobby_id);
            router.push(
              `/dashboard/multi-player?lobby=${lobbyPlayer.lobby_id}`
            );
            return;
          }
        } catch (lobbyCheckError) {
          console.error("Lobby check failed:", lobbyCheckError);
          setError("Failed to check lobby status");
          return;
        }

        try {
          // Check waiting players
          const { data: waitingPlayer, error: waitingError } = await supabase
            .from("waiting_players")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          console.log("Waiting player check:", { waitingPlayer, waitingError }); // Debug log

          if (waitingError) {
            console.error("Waiting player check error:", waitingError);
            throw waitingError;
          }

          if (!waitingPlayer) {
            // Add to waiting players
            const { data: newPlayer, error: insertError } = await supabase
              .from("waiting_players")
              .insert([{ user_id: user.id }])
              .select()
              .single();

            console.log("Insert result:", { newPlayer, insertError }); // Debug log

            if (insertError) {
              console.error("Insert error:", insertError);
              throw insertError;
            }

            setIsLoading(false);
            return;
          }
        } catch (waitingCheckError) {
          console.error("Waiting player check failed:", waitingCheckError);
          setError("Failed to check/update waiting status");
          return;
        }

        // Get all waiting players (ordered by created_at for fairness)
        const { data: allWaiting, error: waitingError } = await supabase
          .from("waiting_players")
          .select("*")
          .order("created_at", { ascending: true });

        if (waitingError) {
          console.error("Error fetching waiting players:", waitingError);
          throw waitingError;
        }

        // If there are at least 2 players, match the first two
        if (allWaiting && allWaiting.length >= 2) {
          const [player1, player2] = allWaiting;
          // Only proceed if current user is one of the first two (prevents race)
          if (user.id === player1.user_id || user.id === player2.user_id) {
            // Remove both players from waiting list ONLY when matched
            await supabase
              .from("waiting_players")
              .delete()
              .in("user_id", [player1.user_id, player2.user_id]);

            // Create a new lobby
            const { data: newLobby, error: createError } = await supabase
              .from("game_lobbies")
              .insert({
                host_id: player1.user_id,
                status: "in_progress",
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

            // Use game_questions as the source of questions
            const { data: allQuestions, error: questionsError } = await supabase
              .from("game_questions")
              .select("*");
            if (questionsError) {
              console.error("Error fetching questions:", questionsError);
              throw questionsError;
            }
            if (!allQuestions || allQuestions.length === 0) {
              throw new Error("No questions available in the database");
            }

            // Shuffle and pick 10 questions
            function shuffle(array) {
              for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
              }
              return array;
            }
            const shuffledQuestions = shuffle([...allQuestions]);
            const questions = shuffledQuestions.slice(0, 10);

            const formattedQuestions = questions.map((q, idx) => ({
              game_session_id: newSession.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              question_order: idx + 1,
            }));

            console.log("Attempting to insert questions:", {
              sessionId: newSession.id,
              questionCount: formattedQuestions.length,
              sampleQuestion: formattedQuestions[0],
            });

            const { data: insertedQuestions, error: insertQuestionsError } =
              await supabase
                .from("game_questions")
                .insert(formattedQuestions)
                .select();

            if (insertQuestionsError) {
              console.error("Error inserting questions:", {
                error: insertQuestionsError,
                details: insertQuestionsError.details,
                hint: insertQuestionsError.hint,
                code: insertQuestionsError.code,
              });
              throw new Error(
                `Failed to insert questions: ${insertQuestionsError.message}`
              );
            }

            if (!insertedQuestions) {
              console.error("No questions were inserted");
              throw new Error("Failed to insert questions - no data returned");
            }

            console.log("Successfully inserted questions:", {
              count: insertedQuestions.length,
              sessionId: newSession.id,
            });

            // Update lobby with the new game session id and set status to in_progress
            const { error: updateError } = await supabase
              .from("game_lobbies")
              .update({
                game_session_id: newSession.id,
                status: "in_progress",
              })
              .eq("id", newLobby.id);

            if (updateError) throw updateError;

            // Add both players to the lobby
            await supabase.from("game_lobby_players").insert([
              { lobby_id: newLobby.id, user_id: player1.user_id },
              { lobby_id: newLobby.id, user_id: player2.user_id },
            ]);

            // Double-check: only redirect if user is not in waiting_players anymore (prevents duplicate redirects)
            const { data: stillWaiting } = await supabase
              .from("waiting_players")
              .select("*")
              .eq("user_id", user.id)
              .single();
            if (!stillWaiting && isMounted) {
              router.push(`/dashboard/multi-player?lobby=${newLobby.id}`);
            }
            return;
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
        <div className="mt-4">
          <h2 className="text-lg text-[var(--color-fourth)] mb-2">
            Players Waiting:
          </h2>
          <ul className="text-[var(--color-fourth)]">
            {waitingPlayers.map((player) => (
              <li key={player.user_id} className="mb-2">
                {player.user_id}
              </li>
            ))}
            {waitingPlayers.length === 0 && (
              <li className="text-[var(--color-fourth)] italic">
                Waiting for players...
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
