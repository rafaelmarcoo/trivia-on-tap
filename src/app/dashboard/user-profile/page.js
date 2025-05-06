'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/utils/supabase'
import { ArrowLeft, LogOut, Camera, User } from 'lucide-react'

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [userLevel, setUserLevel] = useState(1)
  const [joinedDate, setJoinedDate] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileImage, setProfileImage] = useState(null)

  const fileInputRef = useRef(null)
  const router = useRouter()
  const supabase = getSupabase()

  const getUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
      setJoinedDate(new Date(user.created_at).toLocaleDateString())

      const { data, error } = await supabase
        .from('user')
        .select('user_name, user_level')
        .eq('auth_id', user.id)
        .single()

      if (!error && data) {
        setUserName(data.user_name)
        setUserLevel(data.user_level)
      }
    }
  }, [router, supabase])

  useEffect(() => {
    getUser()
  }, [getUser])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err.message)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  if (!user) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-amber-900">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button onClick={handleLogout} disabled={isLoggingOut} className="text-red-600">
            {isLoggingOut ? 'Logging Out...' : 'Logout'}
          </button>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div onClick={() => fileInputRef.current.click()} className="relative group cursor-pointer">
            <div className="h-32 w-32 rounded-full border-4 border-amber-200 overflow-hidden flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500 hover:scale-105 transition-all">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="object-cover w-full h-full" />
              ) : (
                <User size={64} className="text-white" />
              )}
            </div>
            <div className="absolute bottom-2 right-2 bg-white p-1 rounded-full shadow group-hover:opacity-100 opacity-0 transition-opacity duration-300">
              <Camera size={16} className="text-amber-800" />
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          <h1 className="text-2xl font-bold text-amber-900 mt-4">{userName}</h1>
          <p className="text-amber-700">{user.email}</p>
        </div>

        {/* Info */}
        <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md space-y-4">
          <div className="flex justify-between text-amber-800">
            <span>User ID</span>
            <span className="font-mono">{user.id.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between text-amber-800">
            <span>Joined</span>
            <span>{joinedDate}</span>
          </div>
          <div className="flex justify-between text-amber-800">
            <span>Level</span>
            <span>{userLevel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
