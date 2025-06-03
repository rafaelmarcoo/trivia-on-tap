'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/utils/supabase'
import { ArrowLeft, LogOut, Camera, User, Pencil, Clock, Trophy, Calendar, Hash, Shield, Eye, EyeOff } from 'lucide-react'
import { handleLogout, checkAuth } from "@/utils/auth"

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [userLevel, setUserLevel] = useState(1)
  const [joinedDate, setJoinedDate] = useState('')
  const [status, setStatus] = useState('')
  const [totalPlaytime, setTotalPlaytime] = useState(0)
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [editingStatus, setEditingStatus] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [isProfilePrivate, setIsProfilePrivate] = useState(false)
  const [loading, setLoading] = useState(true)

  const fileInputRef = useRef(null)
  const statusInputRef = useRef(null)
  const router = useRouter()
  const supabase = getSupabase()

  // Format playtime from seconds to human readable format
  const formatPlaytime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes === 0) {
      return `${seconds}s`
    } else if (minutes < 60) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      
      if (hours < 24) {
        if (remainingMinutes > 0 && seconds > 0) {
          return `${hours}h ${remainingMinutes}m ${seconds}s`
        } else if (remainingMinutes > 0) {
          return `${hours}h ${remainingMinutes}m`
        } else {
          return `${hours}h`
        }
      } else {
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
      }
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.match('image.*')) {
      alert('Please select an image file')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-image')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('profile-image')
        .getPublicUrl(fileName)

      // Update user profile with the new image URL
      const { error: updateError } = await supabase
        .from('user')
        .update({ profile_image: publicUrl })
        .eq('auth_id', user.id)

      if (updateError) throw updateError

      setProfileImage(publicUrl)
    } catch (error) {
      console.error('Error updating profile image:', error)
      alert('Failed to update profile image')
    }
  }

  const getUser = useCallback(async () => {
    try {
      setLoading(true)
      const { isAuthenticated, session } = await checkAuth()
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      setUser(session.user)
      setJoinedDate(new Date(session.user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))

      // Fetch user data including new stats
      const { data, error } = await supabase
        .from('user')
        .select('user_name, user_level, status, profile_image, total_playtime, games_played, is_profile_private')
        .eq('auth_id', session.user.id)
        .single()
      
      if (!error && data) {
        setUserName(data.user_name || 'Anonymous User')
        setUserLevel(data.user_level || 1)
        setStatus(data.status || 'Ready to play!')
        setTotalPlaytime(data.total_playtime || 0)
        setGamesPlayed(data.games_played || 0)
        setIsProfilePrivate(data.is_profile_private || false)
        if (data.profile_image) {
          setProfileImage(data.profile_image)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
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
    } catch (err) {
      console.error('Logout failed:', err.message)
      setIsLoggingOut(false)
    }
  }

  const updateStatus = async (newStatus) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('user')
        .update({ status: newStatus.trim() })
        .eq('auth_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Status update failed:', error.message)
      alert('Failed to update status')
    }
  }

  const handleStatusChange = (e) => {
    setStatus(e.target.value)
  }

  const handleStatusBlur = async () => {
    setEditingStatus(false)
    await updateStatus(status)
  }

  const handleStatusKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStatusBlur()
    } else if (e.key === 'Escape') {
      setEditingStatus(false)
      // Reset status to original value if needed
    }
  }

  const togglePrivacy = async () => {
    if (!user) return
    
    const newPrivacySetting = !isProfilePrivate
    
    try {
      const { error } = await supabase
        .from('user')
        .update({ is_profile_private: newPrivacySetting })
        .eq('auth_id', user.id)

      if (error) throw error
      
      setIsProfilePrivate(newPrivacySetting)
    } catch (error) {
      console.error('Privacy update failed:', error.message)
      alert('Failed to update privacy setting')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="flex items-center gap-2 text-amber-900 hover:text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <button 
            onClick={onLogout} 
            disabled={isLoggingOut} 
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer disabled:hover:bg-transparent"
          >
            <LogOut size={18} />
            {isLoggingOut ? 'Logging Out...' : 'Logout'}
          </button>
        </div>

        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-8 relative">
          
          {/* Privacy Icon in Corner */}
          <div className="absolute top-4 right-4 group">
            <div className="relative">
              <button
                onClick={togglePrivacy}
                className={`p-4 rounded-full transition-all duration-200 cursor-pointer ${
                  isProfilePrivate 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {isProfilePrivate ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              
              {/* Tooltip */}
              <div className="absolute top-12 right-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
                {isProfilePrivate 
                  ? "Profile is Private - Click to make Public" 
                  : "Profile is Public - Click to make Private"
                }
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            
            {/* Profile Image */}
            <div onClick={() => fileInputRef.current.click()} className="relative group cursor-pointer">
              <div className="h-32 w-32 rounded-full border-4 border-amber-200 overflow-hidden flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500 hover:scale-105 transition-all duration-300">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="object-cover w-full h-full"
                    onError={() => setProfileImage(null)}
                  />
                ) : (
                  <User size={64} className="text-white" />
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
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

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-amber-900 mb-2">{userName}</h1>
              <p className="text-amber-700 mb-4">{user.email}</p>
              
              {/* Status */}
              <div className="bg-gradient-to-r from-amber-50 to-white p-4 rounded-xl border border-amber-200 max-w-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-900">Status:</span>
                  {editingStatus ? (
                    <input
                      type="text"
                      value={status}
                      onChange={handleStatusChange}
                      onBlur={handleStatusBlur}
                      onKeyDown={handleStatusKeyPress}
                      ref={statusInputRef}
                      className="border border-amber-300 rounded-lg px-3 py-1 text-sm flex-1 ml-3 text-amber-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none"
                      maxLength={100}
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1 ml-3">
                      <span className="text-amber-800 font-medium flex-1 text-right truncate">{status}</span>
                      <button
                        onClick={() => setEditingStatus(true)}
                        className="text-amber-600 hover:text-amber-800 p-1 rounded-full hover:bg-amber-100 transition-colors duration-200 cursor-pointer"
                        aria-label="Edit status"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Games Played */}
          <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Games Played</p>
                <p className="text-2xl font-bold text-blue-600">{gamesPlayed.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Total Playtime */}
          <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Playtime</p>
                <p className="text-2xl font-bold text-green-600">{formatPlaytime(totalPlaytime)}</p>
              </div>
            </div>
          </div>

          {/* User Level */}
          <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Hash className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold text-purple-600">{userLevel}</p>
              </div>
            </div>
          </div>

          {/* Member Since */}
          <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="text-amber-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-lg font-bold text-amber-600">{joinedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white/70 backdrop-blur p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold text-amber-900 mb-4">Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center py-2 border-b border-amber-100">
              <span className="text-amber-800 font-medium">User ID</span>
              <span className="font-mono text-sm text-amber-700">{user.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-amber-100">
              <span className="text-amber-800 font-medium">Email Verified</span>
              <span className={`text-sm font-medium ${user.email_confirmed_at ? 'text-green-600' : 'text-red-600'}`}>
                {user.email_confirmed_at ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}