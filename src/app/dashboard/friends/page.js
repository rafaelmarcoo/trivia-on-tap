'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Users, UserPlus, Bell, Search, User, Check, X, Trash2, Trophy, MoreVertical, Gamepad2, MessageCircle } from 'lucide-react'
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
  }, [activeTab])

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
    if (!confirm('Are you sure you want to remove this friend?')) return
    
    try {
      const result = await removeFriend(friendId)
      if (result.success) {
        setSuccessMessage('Friend removed')
        loadFriends() // Reload to update the list
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to remove friend')
      setTimeout(() => setError(null), 3000)
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
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? 'bg-amber-500 text-white shadow-md'
          : 'bg-white text-amber-700 hover:bg-amber-50'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
      {count !== null && count > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
          {count}
        </span>
      )}
    </button>
  )

  const UserCard = ({ user, showActions = true, actionType = 'add' }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
          {user.profile_image || user.friend_profile_image ? (
            <Image 
              src={user.profile_image || user.friend_profile_image} 
              alt="Profile" 
              width={48}
              height={48}
              className="h-full w-full object-cover"
              onError={(e) => e.target.style.display = 'none'}
            />
          ) : (
            <User size={24} className="text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {user.username || user.friend_username || 'Unknown User'}
          </h3>
          <p className="text-sm text-amber-600">
            Level {user.user_level || user.friend_level || 1}
          </p>
          {actionType === 'accept' && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          )}
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
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors duration-200 flex items-center gap-2"
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
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors duration-200"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(user.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors duration-200"
                >
                  Reject
                </button>
              </div>
            )}

            {actionType === 'cancel' && (
              <button
                onClick={() => handleCancelRequest(user.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                Cancel
              </button>
            )}

            {actionType === 'remove' && (
              <>
                <button
                  onClick={() => handleMessageFriend(user)}
                  className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-1"
                  title="Send message"
                >
                  <MessageCircle size={16} />
                  Message
                </button>
                <button
                  onClick={() => handleChallengeFriend(user)}
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
                  title="Challenge to game"
                >
                  <Gamepad2 size={16} />
                  Challenge
                </button>
                <div className="relative group">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                    <MoreVertical size={16} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[120px]">
                    <button
                      onClick={() => handleRemoveFriend(user.friend_id)}
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="flex items-center gap-2 text-amber-900 hover:text-amber-700 transition-colors duration-200"
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-amber-900">Friends</h1>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 bg-amber-200 p-2 rounded-lg">
            <TabButton tab="friends" icon={Users} label="Friends" />
            <TabButton 
              tab="requests" 
              icon={Bell} 
              label="Requests" 
              count={friendRequests.received.length}
            />
            <TabButton 
              tab="challenges" 
              icon={Trophy} 
              label="Challenges" 
              count={pendingChallengesCount}
            />
            <TabButton 
              tab="messages" 
              icon={MessageCircle} 
              label="Messages" 
              count={unreadMessageCount}
            />
            <TabButton tab="add" icon={UserPlus} label="Add Friends" />
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <div className="p-6">
                <ChallengeInvitations onChallengeAccepted={handleChallengeAccepted} />
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="h-[600px] flex">
                {/* Conversations List - Desktop: Always visible, Mobile: Hidden when chat is open */}
                <div className={`w-full lg:w-1/3 border-r border-amber-200 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
                  <div className="p-4 border-b border-amber-200 bg-amber-50">
                    <h2 className="text-xl font-semibold text-amber-900">Messages</h2>
                  </div>
                  <ConversationsList 
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversation?.other_user_id}
                  />
                </div>

                {/* Chat Window - Desktop: Always visible, Mobile: Only when conversation selected */}
                <div className={`w-full lg:w-2/3 ${showMobileChat || selectedConversation ? 'block' : 'hidden lg:block'}`}>
                  <ChatWindow 
                    conversation={selectedConversation}
                    onBack={handleBackToConversations}
                    onConversationUpdate={handleConversationUpdate}
                  />
                </div>
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-amber-900 mb-4">
                  Your Friends ({friends.length})
                </h2>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-amber-600">Loading friends...</div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 text-amber-600">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>You don&apos;t have any friends yet.</p>
                    <p className="text-sm">Use the &ldquo;Add Friends&rdquo; tab to find and connect with other players!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <UserCard 
                        key={friend.friend_id} 
                        user={friend} 
                        actionType="remove"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Friend Requests Tab */}
            {activeTab === 'requests' && (
              <div className="p-6 space-y-6">
                {/* Received Requests */}
                <div>
                  <h2 className="text-xl font-semibold text-amber-900 mb-4">
                    Received Requests ({friendRequests.received.length})
                  </h2>
                  {friendRequests.received.length === 0 ? (
                    <div className="text-center py-4 text-amber-600">
                      No pending friend requests
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.received.map((request) => (
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
                      ))}
                    </div>
                  )}
                </div>

                {/* Sent Requests */}
                <div>
                  <h2 className="text-xl font-semibold text-amber-900 mb-4">
                    Sent Requests ({friendRequests.sent.length})
                  </h2>
                  {friendRequests.sent.length === 0 ? (
                    <div className="text-center py-4 text-amber-600">
                      No pending sent requests
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.sent.map((request) => (
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Friends Tab */}
            {activeTab === 'add' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-amber-900 mb-4">
                  Find Friends
                </h2>
                
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400" />
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Search Results */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-amber-600">Searching users...</div>
                  </div>
                ) : searchTerm.trim().length < 2 ? (
                  <div className="text-center py-8 text-amber-600">
                    <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Start typing to search for friends!</p>
                    <p className="text-sm">Search by username to find other trivia players.</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-amber-600">
                    <p>No users found matching &ldquo;{searchTerm}&rdquo;</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((user) => (
                      <UserCard 
                        key={user.user_id} 
                        user={user} 
                        actionType="add"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      <FriendChallengeModal
        isOpen={challengeModal.isOpen}
        friend={challengeModal.friend}
        onClose={() => setChallengeModal({ isOpen: false, friend: null })}
        onChallengeSent={handleChallengeSent}
      />
    </>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-medium">Loading Friends...</p>
        </div>
      </div>
    }>
      <FriendsPageContent />
    </Suspense>
  )
} 