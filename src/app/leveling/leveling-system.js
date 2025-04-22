import React from "react";

const LevelingSystem = () => {
  const winning = true; // This should be replaced with actual logic to determine if the user has won
  const userLevel = 0;

  const [Level, setLevel] = useState([]);
  const [newLevel, setNewLevel] = useState();
  setNewLevel = 50;
  const id = 0;

  const updateLevel = async () => {
    const newLevelData = {
      level: newLevel,
    };
    const { data, error } = await supabase
      .from("user_level")
      .updateLevel([newLevelData])
      .eq("id", id);

    if (error) {
      console.log("Error adding Level:", error);
    } else {
      setLevel((prev) => [...prev, data]);
      setNewLevel("");
    }
  };
  return (
    <div>
      <h1>Level</h1>
      <div>
        <input
          type="number"
          placeholder="id number..."
          onChange={(e) => id(e.target.value)}
        />
        <button
          style={{
            backgroundColor: "blue",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={addLevel}
        >
          Add Level
        </button>
      </div>
    </div>
  );
};

export default LevelingSystem;
