"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase, useAutoLogout } from "@/utils/supabase"
import { handleLogout, checkAuth } from "@/utils/auth"
import { getUnreadMessageCount } from "@/utils/messages"
import { User } from "lucide-react"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userLevel, setUserLevel] = useState(null)
  const [userName, setUserName] = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const [status, setStatus] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const router = useRouter()
  const supabase = getSupabase()

  useAutoLogout({
    onLogout: () => {
      router.push('/login')
    }
  })

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from('user')
            .select('profile_image')
            .eq('auth_id', user.id)
            .single()

          if (userData?.profile_image) {
            setProfileImage(userData.profile_image)
          }
        }
      } catch (error) {
        console.error('Error loading profile image:', error)
      }
    }

    loadProfileImage()
  }, [supabase])

  const loadUnreadMessageCount = useCallback(async () => {
    try {
      const { isAuthenticated } = await checkAuth()
      if (isAuthenticated) {
        const result = await getUnreadMessageCount()
        if (result.success) {
          setUnreadMessageCount(result.data.count)
        }
      }
    } catch (err) {
      console.error('Failed to load unread message count:', err)
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

      // Load unread message count after user is loaded
      loadUnreadMessageCount()
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }, [router, supabase, loadUnreadMessageCount])

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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
            <div className="text-amber-800 text-xl font-semibold">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-100/20 to-amber-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header with profile */}
      <div className="relative z-10 p-6">
        <div className="relative">
          <div
            onClick={() => router.push('/dashboard/user-profile')}
            className="inline-flex items-center gap-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-amber-200/50"
          >
            <div className="relative">
              <div className="h-14 w-14 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-lg overflow-hidden flex items-center justify-center transition-all duration-300 transform hover:scale-105">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                    onError={() => setProfileImage(null)}
                  />
                ) : (
                  <User size={32} className="text-white" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="text-amber-900">
              <p className="font-bold text-lg">{userName}</p>
              <p className="text-sm text-amber-700 flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                Level {userLevel}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLogout()
              }}
              disabled={isLoggingOut}
              className="text-sm text-red-500 hover:text-red-700 transition-colors duration-200 ml-4 px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          {/* Status bubble */}
          {status && (
            <div className="absolute top-full left-8 mt-2 z-20">
              <div className="relative bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-amber-200/50 max-w-xs">
                <div className="absolute -top-2 left-6 w-4 h-4 bg-white/95 transform rotate-45 border-l border-t border-amber-200/50"></div>
                <p className="text-amber-800 text-sm font-medium">
                  {status}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-8">
        {/* Welcome section */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Trivia on Tap
          </h1>
          <p className="text-amber-700 text-xl font-medium">
            Challenge your mind, one question at a time! 🧠✨
          </p>
        </div>

        {/* Game mode buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <button
            onClick={() => router.push(`/dashboard/single-player?level=${userLevel}`)}
            className="group relative bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-8 px-8 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-amber-300/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-4">
              <span className="text-4xl">🎮</span>
              <div className="text-left">
                <div className="text-xl font-bold">Single Player</div>
                <div className="text-sm opacity-90">Test your knowledge solo</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push(`/dashboard/multi-player?level=${userLevel}`)}
            className="group relative bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-8 px-8 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-amber-400/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-4">
              <span className="text-4xl">🏆</span>
              <div className="text-left">
                <div className="text-xl font-bold">Multiplayer</div>
                <div className="text-sm opacity-90">Challenge your friends</div>
              </div>
            </div>
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mt-8">
          <button
            onClick={() => router.push("/dashboard/game-history")}
            className="group bg-gradient-to-r from-amber-100/80 to-amber-200/80 backdrop-blur-md hover:from-amber-200/90 hover:to-amber-300/90 text-amber-800 font-semibold py-6 px-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-amber-200/50"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📊</span>
              <span className="text-sm font-bold">History</span>
            </div>
          </button>

          <button
            onClick={() => router.push("/dashboard/friends")}
            className="group relative bg-gradient-to-r from-amber-100/80 to-amber-200/80 backdrop-blur-md hover:from-amber-200/90 hover:to-amber-300/90 text-amber-800 font-semibold py-6 px-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-amber-200/50"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">👥</span>
              <span className="text-sm font-bold">Friends</span>
            </div>
            {unreadMessageCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg animate-pulse">
                {unreadMessageCount}
              </div>
            )}
          </button>

          <button
            onClick={() => router.push("/dashboard/friends#messages")}
            className="group relative bg-gradient-to-r from-amber-100/80 to-amber-200/80 backdrop-blur-md hover:from-amber-200/90 hover:to-amber-300/90 text-amber-800 font-semibold py-6 px-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-amber-200/50"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">💬</span>
              <span className="text-sm font-bold">Messages</span>
            </div>
            {unreadMessageCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg animate-pulse">
                {unreadMessageCount}
              </div>
            )}
          </button>

          <button
            onClick={() => router.push("/dashboard/tutorial")}
            className="group bg-gradient-to-r from-amber-100/80 to-amber-200/80 backdrop-blur-md hover:from-amber-200/90 hover:to-amber-300/90 text-amber-800 font-semibold py-6 px-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-amber-200/50"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📚</span>
              <span className="text-sm font-bold">Tutorial</span>
            </div>
          </button>
          <button
            onClick={() => router.push("/dashboard/leaderboard")}
            className="w-72 bg-[var(--color-primary)] hover:bg-white text-[var(--color-fourth)] font-semibold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-xl">🏆</span>
            <span>Leaderboard</span>
          </button>
        </div>

        {/* Fun stats or motivational element */}
        <div className="mt-12 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-amber-200/50 max-w-md text-center">
          <div className="flex items-center justify-center gap-4 text-amber-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">Level {userLevel}</div>
              <div className="text-xs text-amber-700">Current Level</div>
            </div>
            <div className="w-px h-8 bg-amber-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">🔥</div>
              <div className="text-xs text-amber-700">Keep Leveling Up!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}