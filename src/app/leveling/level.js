import React, { useEffect, useState } from "react";
import supabase from "./supabase-config";

function Level() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from("user_level").select("*");
      setData(data);
    }

    fetchData();
  }, []);

  return (
    <div>
      <h2>Table Data</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Level;
