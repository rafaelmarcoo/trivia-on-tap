'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/utils/supabase'
import { getUnreadMessageCount } from '@/utils/messages'

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

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

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

  // Set up real-time subscriptions for global notifications
  useEffect(() => {
    if (!currentUserId) return

    const supabase = getSupabase()
    loadUnreadCount()

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
      .subscribe()

    return () => {
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
    navigateToChallenges
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
} 