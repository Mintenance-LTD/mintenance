jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

/**
 * Tests for AuthService - Authentication Operations
 * Following the pattern from BidManagementService.test.ts
 */

import { AuthService, SignUpData } from '../AuthService';

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
      setSession: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    executeOperation: jest.fn((operation) =>
      operation().then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error }))
    ),
    validateRequired: jest.fn(),
    validateEmail: jest.fn(),
    validatePassword: jest.fn(),
    handleDatabaseError: jest.fn((err) => err),
    handleNetworkError: jest.fn((err) => err),
  },
}));

// Mock NetworkDiagnosticsService
jest.mock('../../utils/networkDiagnostics', () => ({
  NetworkDiagnosticsService: {
    diagnose: jest.fn(),
  },
}));

// Import mocked modules for easier access
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';

describe('AuthService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'homeowner',
    },
    created_at: '2025-01-15T10:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
  };

  const mockUserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'homeowner',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpData: SignUpData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'contractor',
    };

    it('should sign up a new user successfully', async () => {
      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);

      const result = await AuthService.signUp(signUpData);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            role: signUpData.role,
            full_name: 'Jane Smith',
          },
        },
      });

      expect(result).toEqual(mockAuthResponse.data);
    });

    it('should throw error when sign up fails', async () => {
      const error = new Error('Email already registered');
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      await expect(AuthService.signUp(signUpData)).rejects.toThrow('Failed to sign up user');
    });

    it('should validate all required fields', async () => {
      const mockAuthResponse = {
        data: { user: mockUser, session: mockSession },
        error: null,
      };
      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);

      await AuthService.signUp(signUpData);

      expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
        signUpData.email,
        'Email',
        expect.any(Object)
      );
      expect(ServiceErrorHandler.validateEmail).toHaveBeenCalledWith(
        signUpData.email,
        expect.any(Object)
      );
      expect(ServiceErrorHandler.validatePassword).toHaveBeenCalledWith(
        signUpData.password,
        expect.any(Object)
      );
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully with profile', async () => {
      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await AuthService.signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', mockUser.id);

      expect(result.user).toEqual({
        ...mockUserProfile,
        firstName: mockUserProfile.first_name,
        lastName: mockUserProfile.last_name,
        createdAt: mockUserProfile.created_at,
      });
      expect(result.session).toEqual(mockSession);
    });

    it('should return fallback user data when profile fetch fails', async () => {
      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile not found'),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await AuthService.signIn('test@example.com', 'password123');

      expect(logger.warn).toHaveBeenCalledWith('Profile fetch error:', expect.any(Error));
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid credentials');
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      await expect(AuthService.signIn('test@example.com', 'wrong')).rejects.toThrow(
        'Failed to sign in user'
      );
    });

    it('should handle network errors specially', async () => {
      const error = new Error('Network request failed');
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      await expect(AuthService.signIn('test@example.com', 'password')).rejects.toThrow(
        'Failed to sign in user'
      );

      expect(ServiceErrorHandler.handleNetworkError).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AuthService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const error = new Error('Sign out failed');
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error,
      });

      await expect(AuthService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user with profile successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await AuthService.getCurrentUser();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', mockUser.id);

      expect(result).toEqual({
        ...mockUserProfile,
        firstName: mockUserProfile.first_name,
        lastName: mockUserProfile.last_name,
        createdAt: mockUserProfile.created_at,
      });
    });

    it('should return null when no session exists', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return fallback user when profile fetch fails', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile error'),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await AuthService.getCurrentUser();

      expect(logger.warn).toHaveBeenCalledWith('Profile fetch error:', expect.any(Error));
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should handle errors gracefully and return null', async () => {
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Session error'));

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching current user:',
        expect.any(Error)
      );
    });
  });

  describe('getCurrentSession', () => {
    it('should get current session successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      });

      const result = await AuthService.getCurrentSession();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      });

      const result = await AuthService.getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updates = {
        first_name: 'Jane',
        last_name: 'Updated',
        email: 'updated@example.com',
      };

      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUserProfile, ...updates },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await AuthService.updateUserProfile('user-123', updates);

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.update).toHaveBeenCalledWith(updates);
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toEqual({ ...mockUserProfile, ...updates });
    });

    it('should validate email format before updating', async () => {
      const updates = {
        email: 'invalid-email',
      };

      await expect(
        AuthService.updateUserProfile('user-123', updates)
      ).rejects.toThrow('Invalid email format');

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(
        AuthService.updateUserProfile('user-123', { first_name: 'Test' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AuthService.resetPassword('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should validate email format', async () => {
      await expect(AuthService.resetPassword('invalid-email')).rejects.toThrow(
        'Please enter a valid email address'
      );

      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('should throw error for empty email', async () => {
      await expect(AuthService.resetPassword('')).rejects.toThrow(
        'Please enter a valid email address'
      );
    });

    it('should handle network errors with user-friendly message', async () => {
      const error = new Error('Network request failed');
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error,
      });

      await expect(AuthService.resetPassword('test@example.com')).rejects.toThrow(
        'Network connection failed. Please check your internet connection and try again.'
      );
    });

    it('should handle invalid email errors', async () => {
      const error = new Error('Invalid email');
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error,
      });

      await expect(AuthService.resetPassword('test@example.com')).rejects.toThrow(
        'Please enter a valid email address.'
      );
    });

    it('should handle generic errors', async () => {
      const error = new Error('Something went wrong');
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error,
      });

      await expect(AuthService.resetPassword('test@example.com')).rejects.toThrow(
        'Password reset failed: Something went wrong'
      );
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        unsubscribe: mockUnsubscribe,
      });

      const subscription = AuthService.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));

      // Simulate auth state change
      const authHandler = (supabase.auth.onAuthStateChange as jest.Mock).mock.calls[0][0];
      authHandler('SIGNED_IN', mockSession);

      expect(mockCallback).toHaveBeenCalledWith(mockSession);
      expect(subscription.unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const token = 'header.payload.signature';

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the private decodeJWTPayload method
      const originalDecode = (AuthService as any).decodeJWTPayload;
      (AuthService as any).decodeJWTPayload = jest.fn().mockReturnValue({
        exp: Date.now() / 1000 + 3600, // Token expires in 1 hour
        iss: 'https://supabase.io',
      });

      const result = await AuthService.validateToken(token);

      expect(result).toEqual({
        valid: true,
        userId: mockUser.id,
      });

      expect(supabase.auth.getUser).toHaveBeenCalledWith(token);

      // Restore original method
      (AuthService as any).decodeJWTPayload = originalDecode;
    });

    it('should reject invalid token format', async () => {
      const result = await AuthService.validateToken('invalid-token');

      expect(result).toEqual({
        valid: false,
        error: 'Invalid token format',
      });

      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject empty token', async () => {
      const result = await AuthService.validateToken('');

      expect(result).toEqual({
        valid: false,
        error: 'No token provided',
      });
    });

    it('should reject expired token', async () => {
      const token = 'header.payload.signature';

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const originalDecode = (AuthService as any).decodeJWTPayload;
      (AuthService as any).decodeJWTPayload = jest.fn().mockReturnValue({
        exp: Date.now() / 1000 - 3600, // Token expired 1 hour ago
        iss: 'https://supabase.io',
      });

      const result = await AuthService.validateToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'Token expired',
      });

      (AuthService as any).decodeJWTPayload = originalDecode;
    });

    it('should handle validation errors', async () => {
      const token = 'header.payload.signature';

      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Validation failed'));

      const result = await AuthService.validateToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'Token validation failed',
      });
    });
  });

  describe('restoreSessionFromBiometricTokens', () => {
    const tokens = {
      accessToken: 'header.payload.signature',
      refreshToken: 'refresh-token',
    };

    it('should restore session successfully', async () => {
      // Mock validateToken
      const originalValidate = AuthService.validateToken;
      AuthService.validateToken = jest.fn().mockResolvedValue({
        valid: true,
        userId: mockUser.id,
      });

      (supabase.auth.setSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getCurrentUser
      const originalGetUser = AuthService.getCurrentUser;
      AuthService.getCurrentUser = jest.fn().mockResolvedValue({
        ...mockUserProfile,
        firstName: mockUserProfile.first_name,
        lastName: mockUserProfile.last_name,
        createdAt: mockUserProfile.created_at,
      });

      const result = await AuthService.restoreSessionFromBiometricTokens(tokens);

      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.session).toBe(mockSession);

      // Restore originals
      AuthService.validateToken = originalValidate;
      AuthService.getCurrentUser = originalGetUser;
    });

    it('should throw error when refresh token is missing', async () => {
      await expect(
        AuthService.restoreSessionFromBiometricTokens({
          accessToken: 'token',
          refreshToken: '',
        })
      ).rejects.toThrow('We could not restore your session. Please sign in with your password.');
    });

    it('should throw error when token validation fails', async () => {
      const originalValidate = AuthService.validateToken;
      AuthService.validateToken = jest.fn().mockResolvedValue({
        valid: false,
        error: 'Invalid token',
        errorType: 'invalid',
      });

      await expect(
        AuthService.restoreSessionFromBiometricTokens(tokens)
      ).rejects.toThrow('Unable to restore session from biometric credentials.');

      expect(logger.warn).toHaveBeenCalledWith(
        'Biometric token validation failed',
        expect.any(Object)
      );

      AuthService.validateToken = originalValidate;
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
      };

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: refreshedSession },
        error: null,
      });

      const result = await AuthService.refreshToken();

      expect(supabase.auth.refreshSession).toHaveBeenCalled();
      expect(result).toEqual({ session: refreshedSession });
    });

    it('should throw error when refresh fails', async () => {
      const error = new Error('Refresh failed');
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: null,
        error,
      });

      await expect(AuthService.refreshToken()).rejects.toThrow('Refresh failed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', async () => {
      const originalGetSession = AuthService.getCurrentSession;
      AuthService.getCurrentSession = jest.fn().mockResolvedValue(mockSession);

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(true);

      AuthService.getCurrentSession = originalGetSession;
    });

    it('should return false when not authenticated', async () => {
      const originalGetSession = AuthService.getCurrentSession;
      AuthService.getCurrentSession = jest.fn().mockResolvedValue(null);

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);

      AuthService.getCurrentSession = originalGetSession;
    });

    it('should return false when session has no access token', async () => {
      const originalGetSession = AuthService.getCurrentSession;
      AuthService.getCurrentSession = jest.fn().mockResolvedValue({
        refresh_token: 'refresh',
        // No access_token
      });

      const result = await AuthService.isAuthenticated();

      expect(result).toBe(false);

      AuthService.getCurrentSession = originalGetSession;
    });
  });
});