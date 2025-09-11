import { AuthService } from '../../services/AuthService';
import { supabase } from '../../config/supabase';
import { User } from '../../types';

// Get mocked modules from jest-setup.js
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock ErrorHandler
jest.mock('../../utils/errorHandler', () => ({
  ErrorHandler: {
    validateEmail: jest.fn(),
    validatePassword: jest.fn(),
    validateRequired: jest.fn(),
    getUserMessage: jest.fn(
      (error) => error.userMessage || error.message || 'An error occurred'
    ),
    createError: jest.fn((message, code, userMessage) => {
      const error = new Error(userMessage || message);
      error.name = code || 'Error';
      return error;
    }),
  },
}));

const { ErrorHandler } = require('../../utils/errorHandler');

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'homeowner',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {},
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'homeowner' as const,
    };

    it('signs up user successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await AuthService.signUp(signUpData);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            role: signUpData.role,
            full_name: `${signUpData.firstName} ${signUpData.lastName}`,
          },
        },
      });

      expect(result.user).toEqual(mockAuthUser);
    });

    it('handles signup errors', async () => {
      const error = { message: 'Email already registered' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error,
      });

      await expect(AuthService.signUp(signUpData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('validates email format', async () => {
      const invalidData = { ...signUpData, email: 'invalid-email' };
      ErrorHandler.validateEmail.mockImplementationOnce(() => {
        throw new Error('Please enter a valid email address.');
      });

      await expect(AuthService.signUp(invalidData)).rejects.toThrow(
        'Please enter a valid email address.'
      );

      expect(ErrorHandler.validateEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('validates password strength', async () => {
      const weakPasswordData = { ...signUpData, password: '123' };
      ErrorHandler.validatePassword.mockImplementationOnce(() => {
        throw new Error('Password must be at least 8 characters long.');
      });

      await expect(AuthService.signUp(weakPasswordData)).rejects.toThrow(
        'Password must be at least 8 characters long.'
      );

      expect(ErrorHandler.validatePassword).toHaveBeenCalledWith('123');
    });

    it('validates required fields', async () => {
      const incompleteData = { ...signUpData, firstName: '' };
      ErrorHandler.validateRequired.mockImplementationOnce(() => {
        throw new Error('First name is required.');
      });

      await expect(AuthService.signUp(incompleteData)).rejects.toThrow(
        'First name is required.'
      );

      expect(ErrorHandler.validateRequired).toHaveBeenCalledWith(
        '',
        'First name'
      );
    });
  });

  describe('signIn', () => {
    it('signs in user successfully', async () => {
      const mockSession = { user: mockAuthUser, access_token: 'token123' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockSession },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      } as any);

      const result = await AuthService.signIn(
        'test@example.com',
        'password123'
      );

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      const expectedUser = {
        ...mockUser,
        firstName: mockUser.first_name,
        lastName: mockUser.last_name,
        createdAt: mockUser.created_at,
      };

      expect(result).toEqual({ user: expectedUser, session: mockSession });
    });

    it('handles invalid credentials', async () => {
      const error = { message: 'Invalid login credentials' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error,
      });

      await expect(
        AuthService.signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid login credentials');
    });

    it('validates email format', async () => {
      ErrorHandler.validateEmail.mockImplementationOnce(() => {
        throw new Error('Please enter a valid email address.');
      });

      await expect(
        AuthService.signIn('invalid-email', 'password123')
      ).rejects.toThrow('Please enter a valid email address.');

      expect(ErrorHandler.validateEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('requires password', async () => {
      ErrorHandler.validateRequired.mockImplementationOnce(() => {
        throw new Error('Password is required.');
      });

      await expect(AuthService.signIn('test@example.com', '')).rejects.toThrow(
        'Password is required.'
      );

      expect(ErrorHandler.validateRequired).toHaveBeenCalledWith(
        '',
        'Password'
      );
    });
  });

  describe('signOut', () => {
    it('signs out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await AuthService.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('handles signout errors', async () => {
      const error = new Error('Signout failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      await expect(AuthService.signOut()).rejects.toThrow('Signout failed');
    });
  });

  describe('getCurrentSession', () => {
    it('returns current session', async () => {
      const mockSession = { user: mockAuthUser, access_token: 'token' };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await AuthService.getCurrentSession();

      expect(result).toEqual(mockSession);
    });

    it('returns null when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await AuthService.getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user profile', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockAuthUser } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      } as any);

      const result = await AuthService.getCurrentUser();

      const expectedUser = {
        ...mockUser,
        firstName: mockUser.first_name,
        lastName: mockUser.last_name,
        createdAt: mockUser.created_at,
      };

      expect(result).toEqual(expectedUser);
    });

    it('returns null when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('updates user profile successfully', async () => {
      const updates = { first_name: 'Jane', last_name: 'Smith' };
      const updatedUser = { ...mockUser, ...updates };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedUser, error: null }),
      } as any);

      const result = await AuthService.updateUserProfile('user-1', updates);

      expect(result).toEqual(updatedUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('validates profile updates', async () => {
      const invalidUpdates = { email: 'invalid-email' };

      await expect(
        AuthService.updateUserProfile('user-1', invalidUpdates)
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('resetPassword', () => {
    it('sends password reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      await AuthService.resetPassword('test@example.com');

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('handles reset password errors', async () => {
      const error = { message: 'Email not found' };
      mockSupabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
        data: null,
        error,
      });

      await expect(
        AuthService.resetPassword('test@example.com')
      ).rejects.toThrow('Email not found');
    });
  });

  describe('validateToken', () => {
    it('validates JWT token successfully', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const result = AuthService.validateToken(validToken);

      expect(result).toBe(true);
    });

    it('rejects invalid token format', () => {
      const invalidToken = 'invalid-token';

      const result = AuthService.validateToken(invalidToken);

      expect(result).toBe(false);
    });

    it('rejects expired tokens', () => {
      // Mock expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const result = AuthService.validateToken(expiredToken);

      expect(result).toBe(false);
    });
  });
});
