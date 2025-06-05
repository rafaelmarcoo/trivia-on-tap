'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/utils/supabase'
import { getUnreadMessageCount } from '@/utils/messages'
import { setupChallengeExpiration } from '@/utils/challengeExpiration'
import Image from 'next/image'
import { Trophy, User, Target, Clock, Gamepad2 } from 'lucide-react'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Global notification provider - shows notifications everywhere in the app
export default function InGameNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isGameActive, setIsGameActive] = useState(false) // Kept for backward compatibility
  
  // Global challenge acceptance modal state
  const [acceptedChallengeModal, setAcceptedChallengeModal] = useState({ 
    isOpen: false, 
    challenge: null, 
    opponentName: '', 
    opponentImage: null 
  })

  // Get current user ID on mount and setup challenge expiration
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
    
    // Setup challenge expiration system
    const cleanupExpiration = setupChallengeExpiration()
    
    // Cleanup on unmount
    return cleanupExpiration
  }, [])

  // Check for accepted challenges globally
  const checkAcceptedChallenges = useCallback(async () => {
    if (!currentUserId) return
    
    try {
      const supabase = getSupabase()
      
      // Check for challenges where I'm the host and status is 'challenge_accepted'
      // but exclude challenges that are already in progress or completed
      const { data: acceptedChallenges, error } = await supabase
        .from('game_lobbies')
        .select('id, invited_friend_id, created_at, status')
        .eq('host_id', currentUserId)
        .eq('lobby_type', 'friend_challenge')
        .eq('status', 'challenge_accepted')

      if (error) {
        console.error('Error checking accepted challenges:', error)
        return
      }

      if (acceptedChallenges && acceptedChallenges.length > 0) {
        console.log('Found accepted challenges:', acceptedChallenges)
        const challenge = acceptedChallenges[0] // Take the first one
        
        // Get opponent data for the modal
        const { data: opponentData } = await supabase
          .from('user')
          .select('user_name, profile_image')
          .eq('auth_id', challenge.invited_friend_id)
          .single()
        
        setAcceptedChallengeModal({
          isOpen: true,
          challenge: challenge,
          opponentName: opponentData?.user_name || 'Your friend',
          opponentImage: opponentData?.profile_image
        })
      }
    } catch (err) {
      console.error('Error checking accepted challenges:', err)
    }
  }, [currentUserId])

  // Periodic check for accepted challenges
  useEffect(() => {
    if (!currentUserId) return
    
    // Initial check
    checkAcceptedChallenges()
    
    // Check every 5 seconds
    const interval = setInterval(() => {
      checkAcceptedChallenges()
    }, 5000)

    return () => clearInterval(interval)
  }, [currentUserId, checkAcceptedChallenges])

  // Load initial unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadMessageCount()
      if (result.success) {
        setUnreadMessageCount(result.data.count)
      }
    } catch (error) {
      console.error('Failed to load unread message count:', error)
    }
  }, [])

  // Challenge acceptance modal handlers
  const handleStartAcceptedChallenge = useCallback(() => {
    if (acceptedChallengeModal.challenge) {
      window.location.href = `/dashboard/friends/challenge?lobby=${acceptedChallengeModal.challenge.id}`
    }
  }, [acceptedChallengeModal.challenge])

  const handleDismissAcceptedChallenge = useCallback(() => {
    setAcceptedChallengeModal({ isOpen: false, challenge: null, opponentName: '', opponentImage: null })
  }, [])

  // Set up real-time subscriptions for global notifications
  useEffect(() => {
    if (!currentUserId) return

    const supabase = getSupabase()
    loadUnreadCount()

    // Subscribe to lobby status changes to dismiss modal when game starts
    const lobbyStatusChannel = supabase
      .channel('lobby_status_changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'game_lobbies',
          filter: `host_id=eq.${currentUserId}`
        }, 
        (payload) => {
          const updatedLobby = payload.new
          
          // If this is the lobby in our modal and it's now in progress, dismiss the modal
          if (acceptedChallengeModal.isOpen && 
              acceptedChallengeModal.challenge && 
              acceptedChallengeModal.challenge.id === updatedLobby.id &&
              updatedLobby.status === 'in_progress') {
            setAcceptedChallengeModal({ isOpen: false, challenge: null, opponentName: '', opponentImage: null })
          }
        }
      )
      .subscribe()

    // Subscribe to new messages - now shows everywhere
    const messagesChannel = supabase
      .channel('new_messages_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        }, 
        async (payload) => {
          const newMessage = payload.new
          
          // Show notification everywhere in the app
          // Get sender info
          const { data: senderData } = await supabase
            .from('user')
            .select('user_name, profile_image')
            .eq('auth_id', newMessage.sender_id)
            .single()

          const notification = {
            id: `message_${newMessage.id}`,
            type: 'message',
            title: 'New Message',
            message: `${senderData?.user_name || 'Someone'} sent you a message`,
            data: {
              messageId: newMessage.id,
              senderId: newMessage.sender_id,
              senderName: senderData?.user_name,
              content: newMessage.content
            },
            timestamp: new Date(newMessage.created_at),
            onClick: () => navigateToMessages(newMessage.sender_id)
          }

          addNotification(notification)

          // Update unread count
          loadUnreadCount()
        }
      )
      .subscribe()

    // Subscribe to friend requests - shows everywhere
    const friendRequestsChannel = supabase
      .channel('friend_requests_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'friend_requests',
          filter: `receiver_id=eq.${currentUserId}`
        }, 
        async (payload) => {
          const newRequest = payload.new
          
          // Get sender info
          const { data: senderData } = await supabase
            .from('user')
            .select('user_name, profile_image')
            .eq('auth_id', newRequest.sender_id)
            .single()

          const notification = {
            id: `friend_request_${newRequest.id}`,
            type: 'friend_request',
            title: 'Friend Request',
            message: `${senderData?.user_name || 'Someone'} sent you a friend request`,
            data: {
              requestId: newRequest.id,
              senderId: newRequest.sender_id,
              senderName: senderData?.user_name
            },
            timestamp: new Date(newRequest.created_at),
            onClick: () => navigateToFriends()
          }

          addNotification(notification)
        }
      )
      .subscribe()

    // Subscribe to friend challenges - shows everywhere
    const challengesChannel = supabase
      .channel('friend_challenges_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_lobbies',
          filter: `invited_friend_id=eq.${currentUserId}`
        }, 
        async (payload) => {
          const newLobby = payload.new
          
          // Only notify for friend challenges
          if (newLobby.lobby_type !== 'friend_challenge') return
          
          // Get challenger info
          const { data: challengerData } = await supabase
            .from('user')
            .select('user_name, profile_image')
            .eq('auth_id', newLobby.host_id)
            .single()

          const notification = {
            id: `challenge_${newLobby.id}`,
            type: 'challenge',
            title: 'Challenge Invitation',
            message: `${challengerData?.user_name || 'Someone'} challenged you to a trivia battle!`,
            data: {
              lobbyId: newLobby.id,
              challengerId: newLobby.host_id,
              challengerName: challengerData?.user_name,
              categories: newLobby.categories,
              difficulty: newLobby.difficulty
            },
            timestamp: new Date(newLobby.created_at),
            onClick: () => navigateToChallenges()
          }

          addNotification(notification)
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_lobbies',
          filter: `host_id=eq.${currentUserId}`
        },
        async (payload) => {
          const updatedLobby = payload.new
          
          // Check if challenge was accepted
          if (updatedLobby.lobby_type === 'friend_challenge' && 
              updatedLobby.status === 'challenge_accepted' && 
              payload.old.status !== 'challenge_accepted') {
            console.log('Challenge accepted globally detected')
            // Trigger immediate check for accepted challenges
            setTimeout(() => {
              checkAcceptedChallenges()
            }, 1000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(lobbyStatusChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(friendRequestsChannel)
      supabase.removeChannel(challengesChannel)
    }
  }, [currentUserId, loadUnreadCount])

  // Add a new notification
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [...prev, notification])

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id)
    }, 5000)
  }, [])

  // Remove a notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  // Navigation handlers
  const navigateToMessages = useCallback((senderId) => {
    // This will be handled by the parent component
    if (typeof window !== 'undefined') {
      window.location.href = `/dashboard/friends?conversation=${senderId}`
    }
  }, [])

  const navigateToFriends = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/friends'
    }
  }, [])

  const navigateToChallenges = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/friends#challenges'
    }
  }, [])

  // Mark game as active/inactive (kept for backward compatibility)
  const setGameActive = useCallback((active) => {
    setIsGameActive(active)
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Global Accepted Challenge Modal Component
  const AcceptedChallengeModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-300">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/50 p-6 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Trophy className="text-green-600" size={32} />
          </div>
          
          {/* Title */}
          <h3 className="text-2xl font-bold text-amber-900 mb-2">Challenge Accepted!</h3>
          
          {/* Opponent Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50/80 rounded-xl border border-amber-200/50">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl overflow-hidden border-2 border-amber-200/50 shadow-sm">
              {acceptedChallengeModal.opponentImage ? (
                <Image 
                  src={acceptedChallengeModal.opponentImage} 
                  alt="Opponent" 
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={20} className="text-amber-600" />
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-amber-900">{acceptedChallengeModal.opponentName}</p>
              <p className="text-sm text-amber-700">is ready to battle!</p>
            </div>
          </div>
          
          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your trivia challenge has been accepted! Are you ready to start the battle?
          </p>
          
          {/* Battle Format Info */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 mb-6 w-full">
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div className="flex items-center gap-1">
                <Target size={14} />
                <span>10 Questions</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>30 sec each</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDismissAcceptedChallenge}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200 font-medium"
            >
              Later
            </button>
            <button
              onClick={handleStartAcceptedChallenge}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Gamepad2 size={18} />
              Start Battle
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const value = {
    notifications,
    unreadMessageCount,
    isGameActive,
    addNotification,
    removeNotification,
    clearAllNotifications,
    setGameActive,
    navigateToMessages,
    navigateToFriends,
    navigateToChallenges,
    acceptedChallengeModal,
    handleStartAcceptedChallenge,
    handleDismissAcceptedChallenge
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Global Accepted Challenge Modal */}
      {acceptedChallengeModal.isOpen && <AcceptedChallengeModal />}
    </NotificationContext.Provider>
  )
} 