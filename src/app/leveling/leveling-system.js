import React, { useEffect, useState } from "react";
import { getSupabase } from "@/utils/supabase";

const LevelingSystem = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");

  // Fetch all users initially
  const fetchAllUsers = async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await getSupabase
        .from("user")
        .select("id, user_name, user_level");

      if (fetchError) {
        setError("Failed to fetch users.");
        return;
      }

      setUsers(data);
    } catch {
      setError("Something went wrong while fetching users.");
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchAllUsers();

    const channel = getSupabase
      .channel("user-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user",
        },
        (payload) => {
          const updatedUser = payload.new;

          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === updatedUser.id
                ? { ...user, user_level: updatedUser.user_level }
                : user
            )
          );
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      getSupabase.removeChannel(channel);
    };
  }, []);

  const updateLevel = async (userId, currentLevel, username, isWinning) => {
    const newLevel = isWinning
      ? currentLevel + 1
      : Math.max(0, currentLevel - 1);

    try {
      const { error: updateError } = await getSupabase
        .from("user")
        .update({ user_level: newLevel })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError.message);
        return;
      }

      setInfo(`${username}'s level is now ${newLevel}`);
    } catch (err) {
      console.error("Update error:", err.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Leveling System (Realtime Enabled)</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {info && <p style={{ color: "green" }}>{info}</p>}

      <div style={{ marginTop: "20px" }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              padding: "10px",
              borderBottom: "1px solid #ccc",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>{user.user_name}</strong> – Level:{" "}
              <strong>{user.user_level}</strong>
            </p>
            <button
              onClick={() =>
                updateLevel(user.id, user.user_level, user.user_name, true)
              }
            >
              Increase
            </button>
            <button
              onClick={() =>
                updateLevel(user.id, user.user_level, user.user_name, false)
              }
              style={{ marginLeft: "10px" }}
            >
              Decrease
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LevelingSystem;
