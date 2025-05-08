"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/utils/supabase";

export default function LobbySystem() {
  const router = useRouter();
  const supabase = getSupabase();
  const [lobbies, setLobbies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

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
    const channel = supabase
      .channel("lobby_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_lobbies",
        },
        () => {
          fetchLobbies();
        }
      )
      .subscribe();

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
      setLobbies(data || []);
    } catch (error) {
      console.error("Error fetching lobbies:", error);
      setError("Failed to fetch lobbies");
    }
  };

  const createLobby = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not authenticated");

      // Check if user is already in a lobby
      const { data: existingLobby, error: checkError } = await supabase
        .from("game_lobby_players")
        .select("lobby_id")
        .eq("user_id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingLobby) {
        throw new Error("You are already in a lobby");
      }

      // Create new lobby
      const { data: lobby, error: lobbyError } = await supabase
        .from("game_lobbies")
        .insert({
          host_id: user.id,
          status: "waiting",
          max_players: 4,
          current_players: 1,
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      // Add host to lobby players
      const { error: playerError } = await supabase
        .from("game_lobby_players")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
        });

      if (playerError) throw playerError;

      // Navigate to the lobby
      router.push(`/dashboard/multi-player?lobby=${lobby.id}`);
    } catch (error) {
      console.error("Error creating lobby:", error);
      setError(error.message || "Failed to create lobby");
    } finally {
      setIsLoading(false);
    }
  };

  const joinLobby = async (lobbyId) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not authenticated");

      // Check if user is already in a lobby
      const { data: existingLobby, error: checkError } = await supabase
        .from("game_lobby_players")
        .select("lobby_id")
        .eq("user_id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingLobby) {
        throw new Error("You are already in a lobby");
      }

      // Get lobby data
      const { data: lobby, error: lobbyError } = await supabase
        .from("game_lobbies")
        .select("*")
        .eq("id", lobbyId)
        .single();

      if (lobbyError) throw lobbyError;

      // Check if lobby is full
      if (lobby.current_players >= lobby.max_players) {
        throw new Error("Lobby is full");
      }

      // Check if lobby is still waiting
      if (lobby.status !== "waiting") {
        throw new Error("Lobby is no longer available");
      }

      // Add player to lobby
      const { error: playerError } = await supabase
        .from("game_lobby_players")
        .insert({
          lobby_id: lobbyId,
          user_id: user.id,
        });

      if (playerError) throw playerError;

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-primary)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-fourth)]">
            Multiplayer Lobbies
          </h1>
          <button
            onClick={createLobby}
            disabled={isLoading}
            className="bg-[var(--color-fourth)] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Lobby"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-[var(--color-secondary)] p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">
            Available Lobbies
          </h2>
          {lobbies.length === 0 ? (
            <p className="text-gray-300">No lobbies available</p>
          ) : (
            <div className="space-y-4">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="flex justify-between items-center bg-[var(--color-primary)] p-4 rounded-lg"
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
                    disabled={isLoading || lobby.current_players >= lobby.max_players}
                    className="bg-[var(--color-tertiary)] text-white px-4 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {isLoading ? "Joining..." : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 