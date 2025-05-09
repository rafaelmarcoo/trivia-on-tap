"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/utils/supabase";

export default function LobbySystem({ onGameStart }) {
  const [lobbies, setLobbies] = useState([]);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const supabase = getSupabase();

  // Subscribe to lobby changes
  useEffect(() => {
    const channel = supabase
      .channel("lobby_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_lobbies",
          filter: "status=eq.waiting",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLobbies((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setLobbies((prev) =>
              prev.map((lobby) =>
                lobby.id === payload.new.id ? payload.new : lobby
              )
            );
          } else if (payload.eventType === "DELETE") {
            setLobbies((prev) =>
              prev.filter((lobby) => lobby.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Fetch initial lobbies
    fetchLobbies();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLobbies = async () => {
    try {
      const { data, error } = await supabase
        .from("game_lobbies")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLobbies(data);
    } catch (error) {
      console.error("Error fetching lobbies:", error);
      setError("Failed to fetch lobbies");
    }
  };

  const createLobby = async () => {
    try {
      setIsCreatingLobby(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      // Create the lobby
      const { data: lobbyData, error: lobbyError } = await supabase
        .from("game_lobbies")
        .insert({
          host_id: user.id,
          status: "waiting",
          max_players: 2,
          current_players: 1,
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      // Join the lobby as host
      const { error: joinError } = await supabase
        .from("game_lobby_players")
        .insert({
          lobby_id: lobbyData.id,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      // Navigate to the lobby
      router.push(`/dashboard/multi-player?lobby=${lobbyData.id}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      setError(error.message || "Failed to create lobby");
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const joinLobby = async (lobbyId) => {
    try {
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      // Check if already in lobby
      const { data: existingPlayer, error: checkError } = await supabase
        .from("game_lobby_players")
        .select("id")
        .eq("lobby_id", lobbyId)
        .eq("user_id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw checkError;
      }

      if (existingPlayer) {
        // Already in lobby, just navigate
        router.push(`/dashboard/multi-player?lobby=${lobbyId}`);
        return;
      }

      // Check if lobby is full
      const { data: lobby, error: lobbyError } = await supabase
        .from("game_lobbies")
        .select("current_players, max_players, status")
        .eq("id", lobbyId)
        .single();

      if (lobbyError) throw lobbyError;
      if (lobby.status !== "waiting")
        throw new Error("Lobby is no longer available");
      if (lobby.current_players >= lobby.max_players)
        throw new Error("Lobby is full");

      // Join the lobby
      const { error: joinError } = await supabase
        .from("game_lobby_players")
        .insert({
          lobby_id: lobbyId,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      // Update player count
      const { error: updateError } = await supabase
        .from("game_lobbies")
        .update({ current_players: lobby.current_players + 1 })
        .eq("id", lobbyId);

      if (updateError) throw updateError;

      // Navigate to the lobby
      router.push(`/dashboard/multi-player?lobby=${lobbyId}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      setError(error.message || "Failed to join lobby");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-primary)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-fourth)]">
            Multiplayer Lobby
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[var(--color-tertiary)] text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <button
            onClick={createLobby}
            disabled={isCreatingLobby}
            className="bg-[var(--color-secondary)] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {isCreatingLobby ? "Creating..." : "Create New Lobby"}
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--color-fourth)]">
            Available Lobbies
          </h2>
          {lobbies.length === 0 ? (
            <p className="text-[var(--color-fourth)]">No lobbies available</p>
          ) : (
            lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="bg-[var(--color-secondary)] p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="text-white">
                    Players: {lobby.current_players}/{lobby.max_players}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Created: {new Date(lobby.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => joinLobby(lobby.id)}
                  className="bg-[var(--color-fourth)] text-white px-4 py-2 rounded hover:bg-opacity-90"
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
