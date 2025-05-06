"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabase, useAutoLogout } from "@/utils/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const supabase = getSupabase();

  useAutoLogout();

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    } else {
      setUser(user);

      // Fetch user level and username from the user table
      const { data: userData, error } = await supabase
        .from("user")
        .select("user_name, user_level")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
      } else {
        setUserName(userData?.user_name || "");
        setUserLevel(userData?.user_level || 1);
      }
    }
  }, [router, supabase]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-fourth)] text-xl">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] flex flex-col items-center justify-center relative">
    {/* Profile Section */}
    <div
      onClick={() => router.push('/dashboard/user-profile')}
      className="absolute top-6 left-6 flex items-center gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Profile Icon */}
      <div className="bg-[var(--color-tertiary)] p-3 rounded-full shadow-md transition-all duration-300 transform hover:bg-[var(--color-fourth)] hover:scale-105">
      <Image src="/icons/profile.svg" alt="Profile" width={28} height={28} />
      </div>
      {/* User Info */}
      <div className="text-[var(--color-fourth)]">
        <p className="font-semibold text-lg">{userName}</p>
        <p className="text-sm">Level {userLevel}</p>
      </div>
      {/* Logout Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLogout();
        }}
        className="text-sm text-red-600 hover:text-red-700 transition-colors duration-200 ml-auto"
      >
        Logout
      </button>
    </div>
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold text-[var(--color-fourth)]">
            Welcome to Trivia on Tap
          </h1>
          <p className="text-[var(--color-fourth)]/80 text-lg">
            Test your knowledge and have fun!
          </p>
        </div>

        <div className="flex flex-col items-center space-y-6 w-full">
          <button
            onClick={() =>
              router.push(`/dashboard/single-player?level=${userLevel}`)
            }
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">🎮</span>
            <span>Single Player Mode</span>
          </button>
          <button
            onClick={() =>
              router.push(`/dashboard/multi-player?level=${userLevel}`)
            }
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">👥</span>
            <span>Multiplayer Mode</span>
          </button>
          <button
            onClick={() => router.push("/dashboard/game-history")}
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">📊</span>
            <span>Game History</span>
          </button>
          <button
            onClick={() => router.push("/dashboard/tutorial")}
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">📚</span>
            <span>Tutorial</span>
          </button>
        </div>
      </div>
    </div>
  );
}
