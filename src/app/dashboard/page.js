"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase, useAutoLogout } from "@/utils/supabase"
import { handleLogout, checkAuth } from "@/utils/auth"
import { User } from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userLevel, setUserLevel] = useState(null)
  const [userName, setUserName] = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const [status, setStatus] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = getSupabase()

  useAutoLogout({
    onLogout: () => {
      router.push('/login')
    }
  })

  useEffect(() => {
    const savedImage = localStorage.getItem('profileImage')
    if (savedImage) {
      setProfileImage(savedImage)
    }
  }, [])

  const getUser = useCallback(async () => {
    try {
      const { isAuthenticated, session } = await checkAuth()
      
      if (!isAuthenticated) {
        router.push("/login")
        return
      }

      setUser(session.user)

      const { data: userData, error: userError } = await supabase
        .from("user") 
        .select("user_name, user_level, status")
        .eq("auth_id", session.user.id)
        .single()

      if (userError) throw userError

      if (userData) {
        setUserName(userData.user_name || "")
        setUserLevel(userData.user_level || 1)
        setStatus(userData.status || "Feeling smart!")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }, [router, supabase])

  useEffect(() => {
    getUser()
  }, [getUser])

  const onLogout = async () => {
    try {
      setIsLoggingOut(true)
      const { success, error } = await handleLogout(router)
      if (!success) throw new Error(error)
    } catch (error) {
      console.error("Error logging out:", error.message)
      setIsLoggingOut(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-fourth)] text-xl">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] flex flex-col items-center justify-center relative">
      <div
        onClick={() => router.push('/dashboard/user-profile')}
        className="absolute top-6 left-6 flex items-center gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      >
        <div className="h-12 w-12 bg-[var(--color-tertiary)] rounded-full shadow-md overflow-hidden flex items-center justify-center transition-all duration-300 transform hover:scale-105">
          {profileImage ? (
            <img 
              src={profileImage} 
              alt="Profile" 
              className="h-full w-full object-cover"
              onError={() => setProfileImage(null)}
            />
          ) : (
            <User size={28} className="text-white" />
          )}
        </div>
        <div className="text-[var(--color-fourth)]">
          <p className="font-semibold text-lg">{userName}</p>
          <p className="text-sm">Level {userLevel}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onLogout()
          }}
          disabled={isLoggingOut}
          className="text-sm text-red-600 transform hover:text-red-800 transition-colors duration-200 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
      {status && (
        <div className="absolute top-24 left-6 bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg max-w-xs">
          <div className="relative">
            <div className="absolute -top-2 left-4 w-4 h-4 bg-white/90 transform rotate-45"></div>
            <p className="text-[var(--color-fourth)] text-sm">{status}</p>
          </div>
        </div>
      )}
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
            onClick={() => router.push(`/dashboard/single-player?level=${userLevel}`)}
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">🎮</span>
            <span>Single Player Mode</span>
          </button>
          <button
            onClick={() => router.push(`/dashboard/multi-player?level=${userLevel}`)}
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
  )
}