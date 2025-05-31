/**
 * Test Suite for Private Messaging System (TDD Demonstration)
 * User Story: "As a player, I want to send private messages to my friends so that I can communicate with them outside of the game."
 * 
 * Following Test-Driven Development (TDD) approach:
 * 1. Write tests first (RED)
 * 2. Watch them fail
 * 3. Implement minimal code to pass (GREEN)
 * 4. Refactor if needed
 */

import {
  sendMessage,
  getConversations,
  getMessagesInConversation
} from '../messages'

// Mock Supabase with proper responses
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  rpc: jest.fn()
}

jest.mock('../supabase', () => ({
  getSupabase: () => mockSupabase
}))

describe('Private Messaging System - TDD Demo', () => {
  const mockUser = { id: '123e4567-e89b-12d3-a456-426614174000' }
  const mockFriendId = '987fcdeb-51a2-43d1-b123-456789abcdef'
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  // Test 1: Core functionality - Send message successfully
  it('should successfully send a message to a friend', async () => {
    // Arrange
    const messageContent = 'Hello friend!'
    const mockMessage = {
      id: '222e2222-e22b-22d2-a222-222222222222',
      sender_id: mockUser.id,
      receiver_id: mockFriendId,
      content: messageContent
    }

    // Mock friendship check (they are friends)
    const mockFriendshipQuery = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'friendship-id' }, error: null })
    }

    // Mock message insert
    const mockMessageQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockMessage, error: null })
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'friendships') return mockFriendshipQuery
      if (table === 'messages') return mockMessageQuery
      return {}
    })

    // Act
    const result = await sendMessage(mockFriendId, messageContent)

    // Assert
    expect(result.success).toBe(true)
    expect(result.data.content).toBe(messageContent)
    expect(result.data.receiver_id).toBe(mockFriendId)
  })

  // Test 2: Input validation - Empty message
  it('should fail when message content is empty', async () => {
    // Arrange
    const emptyContent = ''
    
    // Act
    const result = await sendMessage(mockFriendId, emptyContent)

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Message content cannot be empty')
  })

  // Test 3: List conversations functionality
  it('should return list of user conversations', async () => {
    // Arrange
    const mockConversations = [{
      conversation_id: '111e1111-e11b-11d1-a111-111111111111',
      other_user_id: mockFriendId,
      other_user_name: 'TestFriend',
      other_user_level: 5,
      unread_count: 2
    }]

    mockSupabase.rpc.mockResolvedValue({ data: mockConversations, error: null })

    // Act
    const result = await getConversations()

    // Assert
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_conversations', { user_uuid: mockUser.id })
  })

  // Test 4: Get conversation messages
  it('should return messages between current user and friend', async () => {
    // Arrange
    const mockMessages = [{
      message_id: '333e3333-e33b-33d3-a333-333333333333',
      sender_id: mockUser.id,
      receiver_id: mockFriendId,
      content: 'Hello!',
      is_from_current_user: true
    }]

    mockSupabase.rpc.mockResolvedValue({ data: mockMessages, error: null })

    // Act
    const result = await getMessagesInConversation(mockFriendId)

    // Assert
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_conversation_messages', {
      user_uuid: mockUser.id,
      other_user_uuid: mockFriendId,
      message_limit: 50,
      message_offset: 0
    })
  })

  // Test 5: Authentication requirement
  it('should fail when user is not authenticated', async () => {
    // Arrange - Mock failed authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })
    
    // Act
    const result = await sendMessage(mockFriendId, 'Hello')

    // Assert - Should fail due to no authentication
    expect(result.success).toBe(false)
    expect(result.error).toContain('authenticated')
  })
}) 