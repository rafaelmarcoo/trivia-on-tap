import {
  handleLogout,
  handleLogin,
  handleRegister,
  handlePasswordReset,
  handlePasswordUpdate,
  checkAuth
} from './auth';
import { getSupabase } from './supabase';

// Mock the supabase module
jest.mock('./supabase');

describe('Auth Utilities', () => {
  let mockSupabase;
  let mockRouter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create mock router
    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
    };

    // Create mock supabase client
    mockSupabase = {
      auth: {
        signOut: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getSession: jest.fn(),
      },
    };

    // Mock getSupabase to return our mock client
    getSupabase.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    // Restore console.error
    console.error.mockRestore();
  });

  describe('handleLogout', () => {
    test('successfully logs out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await handleLogout(mockRouter);

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
      expect(result).toEqual({ success: true });
    });

    test('handles logout error', async () => {
      const error = new Error('Logout failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      const result = await handleLogout(mockRouter);

      expect(result).toEqual({
        success: false,
        error: 'Logout failed'
      });
      expect(mockRouter.refresh).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('handleLogin', () => {
    test('successfully logs in user', async () => {
      const mockData = { user: { id: '123', email: 'test@example.com' } };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await handleLogin('test@example.com', 'password123', mockRouter);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      expect(result).toEqual({ success: true, data: mockData });
    });

    test('handles login error', async () => {
      const error = new Error('Invalid credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error
      });

      const result = await handleLogin('test@example.com', 'wrongpassword', mockRouter);

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
      expect(mockRouter.refresh).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('handleRegister', () => {
    test('successfully registers user', async () => {
      const mockData = { user: { id: '123', email: 'test@example.com' } };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await handleRegister(
        'test@example.com',
        'password123',
        'testuser',
        mockRouter
      );

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            username: 'testuser',
          },
          emailRedirectTo: 'http://localhost/login'
        }
      });
      expect(result).toEqual({
        success: true,
        data: mockData,
        message: 'Registration successful! Please check your email to confirm your account.'
      });
    });

    test('handles registration error', async () => {
      const error = new Error('Email already exists');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error
      });

      const result = await handleRegister(
        'test@example.com',
        'password123',
        'testuser',
        mockRouter
      );

      expect(result).toEqual({
        success: false,
        error: 'Email already exists'
      });
    });
  });

  describe('handlePasswordReset', () => {
    test('successfully sends password reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await handlePasswordReset('test@example.com');

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost/reset-password'
        }
      );
      expect(result).toEqual({
        success: true,
        message: 'Password reset instructions have been sent to your email.'
      });
    });

    test('handles password reset error', async () => {
      const error = new Error('Email not found');
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error });

      const result = await handlePasswordReset('test@example.com');

      expect(result).toEqual({
        success: false,
        error: 'Email not found'
      });
    });
  });

  describe('handlePasswordUpdate', () => {
    test('successfully updates password', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await handlePasswordUpdate('newpassword123');

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      });
      expect(result).toEqual({
        success: true,
        message: 'Password updated successfully.'
      });
    });

    test('handles password update error', async () => {
      const error = new Error('Password too weak');
      mockSupabase.auth.updateUser.mockResolvedValue({ error });

      const result = await handlePasswordUpdate('weak');

      expect(result).toEqual({
        success: false,
        error: 'Password too weak'
      });
    });
  });

  describe('checkAuth', () => {
    test('returns authenticated when session exists', async () => {
      const mockSession = { user: { id: '123' }, access_token: 'token' };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await checkAuth();

      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        isAuthenticated: true,
        session: mockSession
      });
    });

    test('returns not authenticated when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await checkAuth();

      expect(result).toEqual({
        isAuthenticated: false,
        session: null
      });
    });

    test('handles auth check error', async () => {
      const error = new Error('Auth check failed');
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error
      });

      const result = await checkAuth();

      expect(result).toEqual({
        isAuthenticated: false,
        error: 'Auth check failed'
      });
    });
  });
}); 