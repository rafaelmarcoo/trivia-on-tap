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
          filter: "status=eq.waiting"
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("game_lobbies")
        .insert({
          host_id: user.id,
          status: "waiting",
          max_players: 2,
          current_players: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Join the lobby as host
      await supabase.from("game_lobby_players").insert({
        lobby_id: data.id,
        user_id: user.id
      });

      router.push(`/dashboard/multi-player?lobby=${data.id}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      setError("Failed to create lobby");
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const joinLobby = async (lobbyId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      // Check if lobby is full
      const { data: lobby } = await supabase
        .from("game_lobbies")
        .select("current_players, max_players")
        .eq("id", lobbyId)
        .single();

      if (lobby.current_players >= lobby.max_players) {
        throw new Error("Lobby is full");
      }

      // Join the lobby
      await supabase.from("game_lobby_players").insert({
        lobby_id: lobbyId,
        user_id: user.id
      });

      // Update player count
      await supabase
        .from("game_lobbies")
        .update({ current_players: lobby.current_players + 1 })
        .eq("id", lobbyId);

      router.push(`/dashboard/multi-player?lobby=${lobbyId}`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      setError("Failed to join lobby");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-primary)] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--color-fourth)] mb-8">
          Multiplayer Lobby
        </h1>

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