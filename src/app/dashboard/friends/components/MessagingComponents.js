'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { 
  User, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Trash2,
  MessageCircle,
  Clock
} from 'lucide-react'
import { 
  getConversations, 
  getMessagesInConversation, 
  sendMessage, 
  markMessagesAsRead,
  deleteMessage
} from '@/utils/messages'
import { getSupabase } from '@/utils/supabase'
import { formatDistanceToNow } from 'date-fns'

// Main Conversations List Component
export const ConversationsList = ({ onSelectConversation, selectedConversationId }) => {
  const [conversations, setConversations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const refreshTimeoutRef = useRef(null)

  useEffect(() => {
    // Get current user ID first
    const getCurrentUser = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadConversations()
      
      // Set up real-time subscription for conversations
      const supabase = getSupabase()
      
      const conversationsChannel = supabase
        .channel('conversations_changes')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'conversations' 
          }, 
          (payload) => {
            // Only update if this conversation involves the current user
            const updatedConversation = payload.new
            if (updatedConversation.user1_id === currentUserId || updatedConversation.user2_id === currentUserId) {
              debouncedSilentRefresh()
            }
          }
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            // Only update if this message involves the current user
            const newMessage = payload.new
            if (newMessage.sender_id === currentUserId || newMessage.receiver_id === currentUserId) {
              debouncedSilentRefresh()
            }
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            // Update when read status changes for better responsiveness
            const updatedMessage = payload.new
            if ((updatedMessage.sender_id === currentUserId || updatedMessage.receiver_id === currentUserId) &&
                payload.old.is_read !== updatedMessage.is_read) {
              debouncedSilentRefresh()
            }
          }
        )
        .subscribe()

      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(conversationsChannel)
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
      }
    }
  }, [currentUserId])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getConversations()
      if (result.success) {
        setConversations(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced silent refresh to prevent rapid successive updates
  const debouncedSilentRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = setTimeout(silentRefreshConversations, 150)
  }

  // Silent refresh for real-time updates (no loading state)
  const silentRefreshConversations = async () => {
    try {
      const result = await getConversations()
      if (result.success) {
        setConversations(result.data)
      }
    } catch (err) {
      console.error('Silent refresh failed:', err)
    }
  }

  const ConversationItem = ({ conversation }) => {
    const isSelected = selectedConversationId === conversation.other_user_id
    const hasUnread = conversation.unread_count > 0

    return (
      <div
        onClick={() => onSelectConversation(conversation)}
        className={`p-4 border-b border-amber-100 cursor-pointer transition-all duration-200 hover:bg-amber-50 ${
          isSelected ? 'bg-amber-100 border-amber-200' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Profile Image */}
          <div className="h-12 w-12 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center relative">
            {conversation.other_user_profile_image ? (
              <Image 
                src={conversation.other_user_profile_image} 
                alt="Profile" 
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={24} className="text-amber-600" />
            )}
            {hasUnread && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {conversation.unread_count}
              </div>
            )}
          </div>

          {/* Conversation Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                {conversation.other_user_name}
              </h3>
              <span className="text-xs text-gray-500">
                {conversation.last_message_at ? 
                  formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true }) 
                  : ''
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              {conversation.is_last_message_from_me && (
                <span className="text-xs text-amber-600">You: </span>
              )}
              <p className={`text-sm truncate ${hasUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                {conversation.last_message_content || 'Start a conversation...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-amber-600">Loading conversations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
        <button onClick={loadConversations} className="mt-2 text-amber-600 hover:text-amber-700">
          Try again
        </button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-amber-600">
        <div className="relative">
          <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-3xl animate-bounce">💬</div>
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
        <p className="text-amber-700">Send a message to a friend to start chatting!</p>
        <p className="text-sm text-amber-600 mt-2">
          Connect and share your trivia experiences 🎯
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-amber-100">
      {conversations.map((conversation) => (
        <ConversationItem 
          key={conversation.conversation_id} 
          conversation={conversation} 
        />
      ))}
    </div>
  )
}

// Message Bubble Component
export const MessageBubble = ({ message, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false)
  const isFromCurrentUser = message.is_from_current_user

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      onDelete(message.message_id)
    }
    setShowOptions(false)
  }

  return (
    <div className={`flex mb-4 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md relative ${isFromCurrentUser ? 'order-1' : 'order-2'}`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-lg relative ${
            isFromCurrentUser
              ? 'bg-amber-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="break-words">{message.content}</p>
          
          {/* Options Button */}
          {isFromCurrentUser && (
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <MoreVertical size={14} className="text-gray-600" />
            </button>
          )}

          {/* Options Menu */}
          {showOptions && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 text-sm flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`flex items-center gap-1 mt-1 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
          <Clock size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Profile Image for other user */}
      {!isFromCurrentUser && (
        <div className="h-8 w-8 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center mr-2 order-1">
          {message.sender_profile_image ? (
            <Image 
              src={message.sender_profile_image} 
              alt="Profile" 
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <User size={16} className="text-amber-600" />
          )}
        </div>
      )}
    </div>
  )
}

// Message Input Component
export const MessageInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || isSending) return

    setIsSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-amber-200 p-2 md:p-4 bg-white">
      <div className="flex gap-1 md:gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled || isSending}
          className="flex-1 px-2 md:px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none disabled:bg-gray-100 text-sm md:text-base"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className="bg-amber-500 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1 md:gap-2 text-xs md:text-sm"
        >
          <Send size={14} className="md:w-4 md:h-4" />
          <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Send'}</span>
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-1 hidden sm:block">
        {message.length}/1000 characters
      </div>
    </form>
  )
}

// Main Chat Window Component
export const ChatWindow = ({ conversation, onBack, onConversationUpdate }) => {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (conversation && currentUserId) {
      loadMessages()
      // Mark messages as read immediately when opening conversation
      setTimeout(() => markAsRead(), 200)
      
      // Set up real-time subscription for messages in this conversation
      const supabase = getSupabase()
      
      const messagesChannel = supabase
        .channel(`messages_${conversation.other_user_id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            // Add new message to the list if it's for this conversation
            const newMessage = payload.new
            if ((newMessage.sender_id === conversation.other_user_id && newMessage.receiver_id === currentUserId) || 
                (newMessage.sender_id === currentUserId && newMessage.receiver_id === conversation.other_user_id)) {
              
              // Transform the message to match our component format
              const formattedMessage = {
                message_id: newMessage.id,
                sender_id: newMessage.sender_id,
                receiver_id: newMessage.receiver_id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                is_read: newMessage.is_read,
                sender_name: newMessage.sender_id === conversation.other_user_id ? conversation.other_user_name : 'You',
                sender_profile_image: newMessage.sender_id === conversation.other_user_id ? conversation.other_user_profile_image : '',
                is_from_current_user: newMessage.sender_id === currentUserId
              }
              
              setMessages(prev => [...prev, formattedMessage])
              
              // Mark as read immediately if we received a message and we're viewing this conversation
              if (newMessage.sender_id === conversation.other_user_id) {
                // Mark as read immediately since user is viewing the conversation
                setTimeout(() => markAsRead(), 100)
              }
            }
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            // Update message status (like read status)
            const updatedMessage = payload.new
            setMessages(prev => prev.map(msg => 
              msg.message_id === updatedMessage.id 
                ? { ...msg, is_read: updatedMessage.is_read }
                : msg
            ))
            
            // Trigger conversation update when read status changes
            if (payload.old.is_read !== updatedMessage.is_read) {
              onConversationUpdate?.()
            }
          }
        )
        .on('postgres_changes', 
          { 
            event: 'DELETE', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            // Remove deleted messages
            const deletedMessage = payload.old
            setMessages(prev => prev.filter(msg => msg.message_id !== deletedMessage.id))
          }
        )
        .subscribe()

      // Cleanup subscription when conversation changes or component unmounts
      return () => {
        supabase.removeChannel(messagesChannel)
      }
    }
  }, [conversation, onConversationUpdate, currentUserId])

  // Also mark as read when messages change (when new messages are loaded)
  useEffect(() => {
    if (messages.length > 0 && conversation) {
      const hasUnreadFromOther = messages.some(msg => 
        !msg.is_read && msg.sender_id === conversation.other_user_id
      )
      if (hasUnreadFromOther) {
        setTimeout(() => markAsRead(), 300)
      }
    }
  }, [messages, conversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    if (!conversation) return
    
    setIsLoading(true)
    setError(null)
    try {
      const result = await getMessagesInConversation(conversation.other_user_id)
      if (result.success) {
        // Reverse messages to show oldest first
        setMessages(result.data.reverse())
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async () => {
    if (!conversation || conversation.unread_count === 0) return
    
    try {
      await markMessagesAsRead(conversation.other_user_id)
      onConversationUpdate?.()
    } catch (err) {
      console.error('Failed to mark messages as read:', err)
    }
  }

  const handleSendMessage = async (content) => {
    try {
      const result = await sendMessage(conversation.other_user_id, content)
      if (result.success) {
        // The real-time subscription will handle adding the message to the UI
        // and updating the conversations list - no manual updates needed
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to send message')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      const result = await deleteMessage(messageId)
      if (result.success) {
        // The real-time subscription will handle removing the message from the UI
        // We don't need to manually remove it here anymore
      } else {
        setError(result.error)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to delete message')
      setTimeout(() => setError(null), 3000)
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-amber-600">
        <div className="text-center">
          <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-amber-200 p-2 md:p-4 flex items-center gap-2 md:gap-3">
        <button 
          onClick={onBack}
          className="lg:hidden p-1.5 md:p-2 hover:bg-amber-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft size={18} className="md:w-5 md:h-5" />
        </button>
        
        <div className="h-8 w-8 md:h-10 md:w-10 bg-amber-200 rounded-full overflow-hidden flex items-center justify-center">
          {conversation.other_user_profile_image ? (
            <Image 
              src={conversation.other_user_profile_image} 
              alt="Profile" 
              width={32}
              height={32}
              className="h-full w-full object-cover md:w-10 md:h-10"
            />
          ) : (
            <User size={16} className="md:w-5 md:h-5 text-amber-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm md:text-base truncate">{conversation.other_user_name}</h3>
          <p className="text-xs md:text-sm text-amber-600">Level {conversation.other_user_level}</p>
        </div>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500 hidden sm:inline">Live</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3">
          {error}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-gray-50">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-amber-600">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-amber-600">
            <div className="relative">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl animate-pulse">💭</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Start the Conversation</h3>
            <p className="text-amber-700">Send your first message below!</p>
            <p className="text-sm text-amber-600 mt-2">
              Break the ice and say hello 👋
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <div key={message.message_id} className="group">
                <MessageBubble 
                  message={message} 
                  onDelete={handleDeleteMessage}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
} 