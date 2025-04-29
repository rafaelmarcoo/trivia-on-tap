import React, { useState } from "react";
import supabase from "./supabase-config";

const LevelingSystem = () => {
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [currentLevel, setCurrentLevel] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");

  // Fetch user data (username + level)
  const fetchUserLevel = async () => {
    if (!userId) return;

    setError(null);
    setInfo("");
    setCurrentLevel(null);
    setUsername("");

    try {
      const { data, error: fetchError } = await supabase
        .from("user_level")
        .select("user, level")
        .eq("id", userId)
        .single();

      if (fetchError || !data) {
        setError("Invalid user ID.");
        return;
      }

      setUsername(data.user);
      setCurrentLevel(data.level);
    } catch (err) {
      setError("Something went wrong.");
    }
  };

  // Update the user's level
  // isWinning: true for increase, false for decrease
  const updateLevel = async (isWinning) => {
    if (currentLevel === null || !userId) return;

    const newLevel = isWinning
      ? currentLevel + 1
      : Math.max(0, currentLevel - 1);

    try {
      await supabase
        .from("user_level")
        .update({ level: newLevel })
        .eq("id", userId.trim());

      setCurrentLevel(newLevel);
      setInfo(`${username}'s level is now ${newLevel}`);
    } catch (err) {
      console.error("Update error:", err.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Leveling System (Test Page)</h2>

      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{ padding: "5px", marginRight: "10px" }}
      />

      <button onClick={fetchUserLevel}>Fetch Level</button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      {currentLevel !== null && (
        <div style={{ marginTop: "15px" }}>
          <p>
            {username}'s Current Level: <strong>{currentLevel}</strong>
          </p>
          <button onClick={() => updateLevel(true)}>Increase</button>
          <button
            onClick={() => updateLevel(false)}
            style={{ marginLeft: "10px" }}
          >
            Decrease
          </button>
        </div>
      )}
    </div>
  );
};

export default LevelingSystem;
