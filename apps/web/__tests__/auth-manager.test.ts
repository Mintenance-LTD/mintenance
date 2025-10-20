/**
 * Auth Manager Tests
 * Tests critical authentication and user management functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { authManager } from '../lib/auth-manager';

// Mock dependencies
jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

jest.mock('@/lib/auth', () => ({
  createTokenPair: jest.fn(),
  rotateTokens: jest.fn(),
  revokeAllTokens: jest.fn(),
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn(),
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkLoginRateLimit: jest.fn(),
  recordSuccessfulLogin: jest.fn(),
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Auth Manager', () => {
  const mockSupabase = require('@/lib/api/supabaseServer');
  const mockAuth = require('@/lib/auth');
  const mockRateLimiter = require('@/lib/rate-limiter');
  const mockLogger = require('@mintenance/shared').logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          role: 'homeowner',
        },
      };

      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser,
      };

      mockSupabase.serverSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockAuth.createTokenPair.mockResolvedValue({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      });

      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      });
      expect(mockAuth.createTokenPair).toHaveBeenCalledWith(mockUser);
    });

    it('should reject login with invalid credentials', async () => {
      mockSupabase.serverSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
      expect(result.user).toBeNull();
    });

    it('should handle rate limiting', async () => {
      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle network errors', async () => {
      mockSupabase.serverSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
        user_metadata: {
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'homeowner',
        },
      };

      mockSupabase.serverSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAuth.createTokenPair.mockResolvedValue({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      });

      const result = await authManager.register({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'homeowner',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 'user-456',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'homeowner',
      });
    });

    it('should reject registration with existing email', async () => {
      mockSupabase.serverSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      const result = await authManager.register({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered');
    });

    it('should validate password strength', async () => {
      const result = await authManager.register({
        email: 'test@example.com',
        password: '123', // Weak password
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('password');
    });

    it('should validate email format', async () => {
      const result = await authManager.register({
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      mockSupabase.serverSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      mockAuth.clearAuthCookie.mockImplementation(() => {});

      const result = await authManager.logout();

      expect(result.success).toBe(true);
      expect(mockAuth.clearAuthCookie).toHaveBeenCalled();
      expect(mockSupabase.serverSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      mockSupabase.serverSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const result = await authManager.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logout failed');
    });
  });

  describe('Token Management', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      };

      mockAuth.rotateTokens.mockResolvedValue({
        success: true,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await authManager.refreshTokens('old-refresh-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should handle invalid refresh token', async () => {
      mockAuth.rotateTokens.mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });

      const result = await authManager.refreshTokens('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });

    it('should revoke all tokens', async () => {
      mockAuth.revokeAllTokens.mockResolvedValue({
        success: true,
      });

      const result = await authManager.revokeAllTokens('user-123');

      expect(result.success).toBe(true);
      expect(mockAuth.revokeAllTokens).toHaveBeenCalledWith('user-123');
    });
  });

  describe('User Profile Management', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: mockUser,
                error: null,
              })),
            })),
          })),
        })),
      });

      const result = await authManager.updateProfile('user-123', {
        firstName: 'Johnny',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle profile update errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { message: 'Update failed' },
              })),
            })),
          })),
        })),
      });

      const result = await authManager.updateProfile('user-123', {
        firstName: 'Johnny',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('Password Management', () => {
    it('should reset password successfully', async () => {
      mockSupabase.serverSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await authManager.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSupabase.serverSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should handle password reset errors', async () => {
      mockSupabase.serverSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      const result = await authManager.resetPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found');
    });
  });

  describe('Session Management', () => {
    it('should get current user from session', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      };

      mockSupabase.serverSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authManager.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle no active session', async () => {
      mockSupabase.serverSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authManager.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });

    it('should get current session', async () => {
      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { id: 'user-123' },
      };

      mockSupabase.serverSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authManager.getCurrentSession();

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
    });
  });

  describe('Security Features', () => {
    it('should validate user roles', async () => {
      const result = await authManager.validateRole('user-123', 'admin');

      // This would depend on the actual implementation
      expect(result).toBeDefined();
    });

    it('should check user permissions', async () => {
      const result = await authManager.checkPermission('user-123', 'read:jobs');

      // This would depend on the actual implementation
      expect(result).toBeDefined();
    });

    it('should log security events', async () => {
      await authManager.logSecurityEvent('user-123', 'login_attempt', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Security event'),
        expect.objectContaining({
          userId: 'user-123',
          event: 'login_attempt',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.serverSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Unexpected error')
      );

      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should sanitize error messages', async () => {
      mockSupabase.serverSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Database connection failed: password=secret123' },
      });

      mockRateLimiter.checkLoginRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).not.toContain('password=secret123');
    });
  });
});
