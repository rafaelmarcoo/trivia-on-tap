'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Users, UserPlus, Bell, Search, User, Check, X, Trash2, Trophy, MoreVertical, Gamepad2, MessageCircle, AlertTriangle } from 'lucide-react'
import { checkAuth } from "@/utils/auth"
import { 
  getFriends, 
  getFriendRequests, 
  searchUsers, 
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend
} from '@/utils/friends'
import { getUnreadMessageCount } from '@/utils/messages'
import FriendChallengeModal from './components/FriendChallengeModal'
import { ConversationsList, ChatWindow } from './components/MessagingComponents'
import ChallengeInvitations from './components/ChallengeInvitations'

function FriendsPageContent() {
  const [activeTab, setActiveTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] })
  const [searchResults, setSearchResults] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [challengeModal, setChallengeModal] = useState({ isOpen: false, friend: null })
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0)
  
  // Messaging state
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showMobileChat, setShowMobileChat] = useState(false)
  
  const [removeModal, setRemoveModal] = useState({ isOpen: false, friend: null })
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check authentication on mount and handle URL parameters
  useEffect(() => {
    const checkUserAuth = async () => {
      const { isAuthenticated } = await checkAuth()
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      // Handle conversation parameter from notifications
      const conversationUserId = searchParams.get('conversation')
      if (conversationUserId) {
        setActiveTab('messages')
        
        // Wait a bit for the conversations to load, then auto-select
        setTimeout(async () => {
          // Create a conversation object for the selected user
          // We'll need to fetch user details for this
          try {
            const { getSupabase } = await import('@/utils/supabase')
            const supabase = getSupabase()
            const { data: userData } = await supabase
              .from('user')
              .select('user_name, user_level, profile_image')
              .eq('auth_id', conversationUserId)
              .single()

            if (userData) {
              const fakeConversation = {
                other_user_id: conversationUserId,
                other_user_name: userData.user_name,
                other_user_level: userData.user_level,
                other_user_profile_image: userData.profile_image,
                unread_count: 0
              }
              setSelectedConversation(fakeConversation)
              setShowMobileChat(true)
            }
          } catch (error) {
            console.error('Failed to load user for conversation:', error)
          }
        }, 500)
      }
    }
    
    checkUserAuth()
    
    // Check URL hash to open specific tab
    if (window.location.hash === '#messages') {
      setActiveTab('messages')
    } else if (window.location.hash === '#challenges') {
      setActiveTab('challenges')
    }
  }, [router, searchParams])

  // Load unread message count
  useEffect(() => {
    loadUnreadMessageCount()
  }, [])

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends()
    } else if (activeTab === 'requests') {
      loadFriendRequests()
    }
    
    // Always check for accepted challenges when loading any tab
    checkAcceptedChallenges()
  }, [activeTab])

  // Check for accepted challenges that need to be started
  const checkAcceptedChallenges = async () => {
    try {
      const { getSupabase } = require('@/utils/supabase')
      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) return

      // Check for challenges where I'm the host and status is 'challenge_accepted'
      const { data: acceptedChallenges, error } = await supabase
        .from('game_lobbies')
        .select('id, invited_friend_id, created_at')
        .eq('host_id', user.id)
        .eq('lobby_type', 'friend_challenge')
        .eq('status', 'challenge_accepted')

      if (error) {
        console.error('Error checking accepted challenges:', error)
        return
      }

      if (acceptedChallenges && acceptedChallenges.length > 0) {
        console.log('Found accepted challenges:', acceptedChallenges)
        const challenge = acceptedChallenges[0] // Take the first one
        
        setSuccessMessage('Your challenge was accepted! Click to start the game.')
        
        // Add a button to start the game
        setTimeout(() => {
          if (confirm('Your trivia challenge was accepted! Start the game now?')) {
            window.location.href = `/dashboard/friends/challenge?lobby=${challenge.id}`
          }
        }, 500)
      }
    } catch (err) {
      console.error('Error checking accepted challenges:', err)
    }
  }

  // Periodic check for accepted challenges
  useEffect(() => {
    const interval = setInterval(() => {
      checkAcceptedChallenges()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Search users when search term changes
  useEffect(() => {
    if (activeTab === 'add' && searchTerm.trim().length >= 2) {
      searchForUsers()
    } else if (activeTab === 'add' && searchTerm.trim().length < 2) {
      setSearchResults([])
    }
  }, [searchTerm, activeTab])

  const loadUnreadMessageCount = async () => {
    try {
      const result = await getUnreadMessageCount()
      if (result.success) {
        setUnreadMessageCount(result.data.count)
      }
    } catch (err) {
      console.error('Failed to load unread message count:', err)
    }
  }

  const loadFriends = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getFriends()
      if (result.success) {
        setFriends(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load friends')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFriendRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getFriendRequests()
      if (result.success) {
        setFriendRequests(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load friend requests')
    } finally {
      setIsLoading(false)
    }
  }

  const searchForUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await searchUsers(searchTerm)
      if (result.success) {
        setSearchResults(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to search users')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm])

  const handleSendFriendRequest = async (userId) => {
    try {
      const result = await sendFriendRequest(userId)
      if (result.success) {
        setSuccessMessage('Friend request sent!')
        // Update search results to reflect the change
        setSearchResults(prev => 
          prev.map(user => 
            user.user_id === userId 
              ? { ...user, has_pending_request: true }
              : user
          )
        )
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to send friend request')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleAcceptRequest = async (requestId) => {
    try {
      const result = await acceptFriendRequest(requestId)
      if (result.success) {
        setSuccessMessage('Friend request accepted!')
        loadFriendRequests() // Reload to update the list
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to accept friend request')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleRejectRequest = async (requestId) => {
    try {
      const result = await rejectFriendRequest(requestId)
      if (result.success) {
        setSuccessMessage('Friend request rejected')
        loadFriendRequests() // Reload to update the list
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to reject friend request')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleCancelRequest = async (requestId) => {
    try {
      const result = await cancelFriendRequest(requestId)
      if (result.success) {
        setSuccessMessage('Friend request canceled')
        loadFriendRequests() // Reload to update the list
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to cancel friend request')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleRemoveFriend = async (friendId) => {
    try {
      const result = await removeFriend(friendId)
      if (result.success) {
        setSuccessMessage('Friend removed successfully')
        setFriends(prev => prev.filter(f => (f.friend_id || f.user_id) !== friendId))
        setRemoveModal({ isOpen: false, friend: null })
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to remove friend')
    }
  }

  const handleChallengeFriend = (friend) => {
    setChallengeModal({ isOpen: true, friend })
  }

  const handleChallengeSent = (lobbyData) => {
    setSuccessMessage('Challenge sent to your friend!')
    setTimeout(() => setSuccessMessage(''), 3000)
    // Optionally redirect to the lobby
    // router.push(`/dashboard/multi-player?lobby=${lobbyData.id}`)
  }

  const handleChallengeAccepted = (lobbyId) => {
    setSuccessMessage('Challenge accepted! Starting game...')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Messaging handlers
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    setShowMobileChat(true)
  }

  const handleBackToConversations = () => {
    setSelectedConversation(null)
    setShowMobileChat(false)
  }

  const handleConversationUpdate = () => {
    // Reload unread count when conversations are updated
    loadUnreadMessageCount()
  }

  // Add message button to friend actions
  const handleMessageFriend = (friend) => {
    const conversation = {
      other_user_id: friend.friend_id,
      other_user_name: friend.friend_username,
      other_user_level: friend.friend_level,
      other_user_profile_image: friend.friend_profile_image,
      unread_count: 0
    }
    setActiveTab('messages')
    setSelectedConversation(conversation)
    setShowMobileChat(true)
  }

  const TabButton = ({ tab, icon: Icon, label, count = null }) => (
    <button
      onClick={() => {
        setActiveTab(tab)
        window.location.hash = tab === 'messages' || tab === 'challenges' ? `#${tab}` : ''
        setShowMobileChat(false)
      }}
      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        activeTab === tab
          ? 'bg-amber-500 text-white shadow-md'
          : 'bg-white/50 hover:bg-white/80 text-amber-900 border border-amber-200'
      }`}
    >
      <Icon size={20} className={activeTab === tab ? 'text-white' : 'text-amber-600'} />
      <span>{label}</span>
      {count > 0 && (
        <span className={`px-2 py-0.5 text-sm rounded-full ${
          activeTab === tab
            ? 'bg-white text-amber-600'
            : 'bg-amber-500 text-white'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  const RemoveConfirmationModal = ({ friend, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 p-6 max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Friend</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove <span className="font-semibold text-amber-900">{friend.username || friend.friend_username}</span> from your friends list?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRemoveFriend(friend.friend_id || friend.user_id)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors duration-200"
            >
              Remove Friend
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const UserCard = ({ user, showActions = true, actionType = 'add' }) => (
    <div className="bg-white/80 backdrop-blur-sm border border-amber-200/50 p-4 rounded-xl transition-all duration-300 hover:bg-white/90">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-amber-100 rounded-full overflow-hidden">
              {(user.profile_image || user.friend_profile_image) ? (
                <Image
                  src={user.profile_image || user.friend_profile_image}
                  alt={user.username || user.friend_username || 'Profile'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={24} className="text-amber-600" />
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-amber-900">
              {user.username || user.friend_username || 'Unknown User'}
            </h3>
            <div className="flex items-center gap-2 text-amber-600">
              <Trophy size={14} />
              <span className="text-sm">Level {user.user_level || user.friend_level || 1}</span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {actionType === 'add' && (
              <>
                {user.is_friend ? (
                  <span className="text-sm text-green-600 font-medium">Friends</span>
                ) : user.has_pending_request ? (
                  <span className="text-sm text-amber-600 font-medium">Pending</span>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(user.user_id)}
                    className="bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors duration-200 flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    Add Friend
                  </button>
                )}
              </>
            )}

            {actionType === 'accept' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptRequest(user.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded-xl text-sm hover:bg-green-600 transition-colors duration-200"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(user.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded-xl text-sm hover:bg-red-600 transition-colors duration-200"
                >
                  Reject
                </button>
              </div>
            )}

            {actionType === 'cancel' && (
              <button
                onClick={() => handleCancelRequest(user.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors duration-200"
              >
                Cancel
              </button>
            )}

            {actionType === 'remove' && (
              <>
                <button
                  onClick={() => handleMessageFriend(user)}
                  className="bg-green-500 text-white px-3 py-2 rounded-xl hover:bg-green-600 transition-colors duration-200 flex items-center gap-1"
                  title="Send message"
                >
                  <MessageCircle size={16} />
                  Message
                </button>
                <button
                  onClick={() => handleChallengeFriend(user)}
                  className="bg-blue-500 text-white px-3 py-2 rounded-xl hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
                  title="Challenge to game"
                >
                  <Gamepad2 size={16} />
                  Challenge
                </button>
                <div className="relative group">
                  <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200">
                    <MoreVertical size={16} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[120px]">
                    <button
                      onClick={() => setRemoveModal({ isOpen: true, friend: user })}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 text-sm"
                    >
                      Remove Friend
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
            <button 
              onClick={() => router.push('/dashboard')} 
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-amber-900 rounded-xl transition-all duration-300 shadow-sm border border-amber-200/50 group"
            >
          <ArrowLeft size={20} className="text-amber-600 transition-transform duration-300 group-hover:-translate-x-1" />
              <span>Back to Dashboard</span>
            </button>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100/50 rounded-xl">
                <Users className="text-amber-700" size={32} />
          </div>
              <h1 className="text-3xl font-bold text-amber-900">Friends</h1>
            </div>
            
            {/* Success Message */}
          {successMessage && (
              <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg">
              {successMessage}
            </div>
          )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-8">
            <TabButton tab="friends" icon={Users} label="Friends" />
            <TabButton tab="requests" icon={Bell} label="Requests" count={friendRequests.received.length} />
            <TabButton tab="add" icon={UserPlus} label="Add Friends" />
            <TabButton tab="messages" icon={MessageCircle} label="Messages" count={unreadMessageCount} />
            <TabButton tab="challenges" icon={Gamepad2} label="Challenges" count={pendingChallengesCount} />
          </div>

          {/* Search Bar */}
          {activeTab === 'add' && (
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={20} className="text-amber-600" />
              </div>
              <input
                type="text"
                placeholder="Search users by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-amber-800 font-medium">Loading...</p>
                </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-100/80 backdrop-blur-sm border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-800">{error}</p>
              </div>
            )}

          {/* Friends List */}
          {activeTab === 'friends' && !isLoading && (
            <div className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="text-amber-600" size={40} />
                  </div>
                  <h3 className="text-xl font-semibold text-amber-900 mb-2">
                    No friends yet
                  </h3>
                  <p className="text-amber-700">
                    Start adding friends to challenge them to trivia games!
                  </p>
                </div>
              ) : (
                friends.map(friend => (
                  <UserCard key={friend.friend_id} user={friend} actionType="remove" />
                ))
              )}
            </div>
          )}

          {/* Friend Requests */}
          {activeTab === 'requests' && !isLoading && (
            <div className="space-y-8">
              {/* Received Requests */}
              <div>
                <h2 className="text-xl font-semibold text-amber-900 mb-4">Received Requests</h2>
                <div className="space-y-4">
                  {friendRequests.received.length === 0 ? (
                    <p className="text-amber-700 text-center py-4">No pending friend requests</p>
                  ) : (
                    friendRequests.received.map(request => (
                      <UserCard 
                        key={request.id} 
                        user={{
                          ...request,
                          username: request.sender.user_name,
                          user_level: request.sender.user_level,
                          profile_image: request.sender.profile_image
                        }} 
                        actionType="accept"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Sent Requests */}
              <div>
                <h2 className="text-xl font-semibold text-amber-900 mb-4">Sent Requests</h2>
                <div className="space-y-4">
                  {friendRequests.sent.length === 0 ? (
                    <p className="text-amber-700 text-center py-4">No sent friend requests</p>
                  ) : (
                    friendRequests.sent.map(request => (
                      <UserCard 
                        key={request.id} 
                        user={{
                          ...request,
                          username: request.receiver.user_name,
                          user_level: request.receiver.user_level,
                          profile_image: request.receiver.profile_image
                        }} 
                        actionType="cancel"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {activeTab === 'add' && !isLoading && (
            <div className="space-y-4">
              {searchTerm.trim().length < 2 ? (
                <p className="text-amber-700 text-center py-4">Enter at least 2 characters to search</p>
              ) : searchResults.length === 0 ? (
                <p className="text-amber-700 text-center py-4">No users found</p>
              ) : (
                searchResults.map(user => (
                  <UserCard key={user.user_id} user={user} actionType="add" />
                ))
              )}
            </div>
          )}

          {/* Messages */}
          {activeTab === 'messages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
              {/* Conversations List */}
              <div className={`md:col-span-1 bg-white/50 backdrop-blur-sm rounded-xl border border-amber-200/50 overflow-hidden ${
                showMobileChat ? 'hidden md:block' : 'block'
              }`}>
                <ConversationsList
                  onSelectConversation={handleSelectConversation}
                  selectedConversation={selectedConversation}
                  onConversationUpdate={handleConversationUpdate}
                  />
                </div>

              {/* Chat Window */}
              <div className={`md:col-span-2 bg-white/50 backdrop-blur-sm rounded-xl border border-amber-200/50 overflow-hidden ${
                !showMobileChat && !selectedConversation ? 'hidden md:flex md:items-center md:justify-center' : 'block'
              }`}>
                {selectedConversation ? (
                  <ChatWindow
                    conversation={selectedConversation}
                    onBack={handleBackToConversations}
                    onConversationUpdate={handleConversationUpdate}
                  />
                ) : (
                  <div className="text-center p-8">
                    <MessageCircle size={48} className="text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-amber-900 mb-2">
                      Select a Conversation
                    </h3>
                    <p className="text-amber-700">
                      Choose a friend from the list to start chatting
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Challenges */}
          {activeTab === 'challenges' && (
            <ChallengeInvitations
              onChallengeAccepted={handleChallengeAccepted}
              onCountUpdate={setPendingChallengesCount}
            />
          )}
        </div>
      </div>

      {/* Challenge Modal */}
      {challengeModal.isOpen && (
        <FriendChallengeModal
          isOpen={challengeModal.isOpen}
          friend={challengeModal.friend}
          onClose={() => setChallengeModal({ isOpen: false, friend: null })}
          onChallengeSent={handleChallengeSent}
        />
      )}

      {/* Remove Modal */}
      {removeModal.isOpen && (
        <RemoveConfirmationModal
          friend={removeModal.friend}
          onClose={() => setRemoveModal({ isOpen: false, friend: null })}
        />
      )}
    </div>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600"></div>
      </div>
    }>
      <FriendsPageContent />
    </Suspense>
  )
} 