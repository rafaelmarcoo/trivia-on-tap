import supabase from "./supabase-config";
import { useState } from "react";

function display() {
  const [name, setName] = useState([]);
  const [newName, setNewName] = useState("");

  const addName = async () => {
    const newNameData = {
      user: newName,
      level: 10,
    };
    const { data, error } = await supabase
      .from("user_level")
      .insert([newNameData])
      .single();

    if (error) {
      console.log("Error adding name:", error);
    } else {
      setName((prev) => [...prev, data]);
      setNewName("");
    }
  };

  return (
    <div>
      <h1>Name</h1>
      <div>
        <input
          type="text"
          placeholder="Name..."
          onChange={(e) => setNewName(e.target.value)}
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
          onClick={addName}
        >
          Add Name
        </button>
      </div>
    </div>
  );
}

export default display;
