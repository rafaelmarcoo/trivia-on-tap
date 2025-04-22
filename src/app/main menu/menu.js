import React from "react";

export default function MainMenu() {
  return (
    <div className="min-h-screen bg-[#f5f5dc] flex flex-col items-center justify-center relative">
      {/* Profile Icon */}
      <div className="absolute top-4 left-4">
        <button className="bg-[#e0cda9] p-2 rounded-full shadow hover:bg-[#d2b48c] transition">
          <img src="/icons/profile.svg" alt="Profile" className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Options */}
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-[#3e3e3e] mb-6">Main Menu</h1>
        <MenuButton text="Single Player Mode" />
        <MenuButton text="Multiplayer Mode" />
        <MenuButton text="Tutorial" />
      </div>
    </div>
  );
}

function MenuButton({ text }) {
  return (
    <button className="w-64 bg-[#e0cda9] hover:bg-[#d2b48c] text-[#3e3e3e] font-semibold py-3 px-6 rounded-2xl shadow-md transition-all">
      {text}
    </button>
  ); 
} 
