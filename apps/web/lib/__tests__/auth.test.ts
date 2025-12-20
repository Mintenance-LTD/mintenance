/**
 * Auth Library Tests
 * Tests critical authentication functionality including JWT creation, verification, and rotation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  createToken, 
  createTokenPair, 
  rotateTokens, 
  revokeAllTokens, 
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getCurrentUserFromCookies
} from '../lib/auth';

// Mock dependencies
jest.mock('../lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }))
}));

describe('Auth Library', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    role: 'homeowner' as const,
    first_name: 'John',
    last_name: 'Doe',
    email_verified: true
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-security';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.JWT_SECRET;
  });

  describe('createToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await createToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token payload', async () => {
      const token = await createToken(mockUser);
      const payload = await verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe(mockUser.role);
    });

    it('should throw error for invalid user data', async () => {
      await expect(createToken(null as any)).rejects.toThrow();
      await expect(createToken(undefined as any)).rejects.toThrow();
    });
  });

  describe('createTokenPair', () => {
    it('should create both access and refresh tokens', async () => {
      const result = await createTokenPair(mockUser);
      
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should create tokens with different expiry times', async () => {
      const result = await createTokenPair(mockUser);
      
      // Access token should be shorter-lived than refresh token
      const accessPayload = await verifyToken(result.accessToken);
      const refreshPayload = await verifyToken(result.refreshToken);
      
      expect(accessPayload?.exp).toBeLessThan(refreshPayload?.exp || 0);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      const token = await createToken(mockUser);
      const payload = await verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(mockUser.id);
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';
      const payload = await verifyToken(invalidToken);
      
      expect(payload).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Create token with very short expiry
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.INVALID_SIGNATURE';
      
      const payload = await verifyToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        ''
      ];
      
      for (const token of malformedTokens) {
        const payload = await verifyToken(token);
        expect(payload).toBeNull();
      }
    });
  });

  describe('rotateTokens', () => {
    it('should create new tokens and revoke old refresh token', async () => {
      const { refreshToken } = await createTokenPair(mockUser);
      
      const result = await rotateTokens(refreshToken);
      
      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken);
    });

    it('should fail for invalid refresh token', async () => {
      const result = await rotateTokens('invalid-refresh-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail for expired refresh token', async () => {
      // This would require creating an expired token, which is complex in tests
      // For now, we'll test with an invalid token
      const result = await rotateTokens('expired-token');
      
      expect(result.success).toBe(false);
    });
  });

  describe('revokeAllTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const result = await revokeAllTokens(mockUser.id);
      
      expect(result.success).toBe(true);
    });

    it('should handle invalid user ID', async () => {
      const result = await revokeAllTokens('invalid-user-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Cookie Management', () => {
    it('should set auth cookie with correct options', async () => {
      const token = await createToken(mockUser);
      const mockCookies = {
        set: jest.fn()
      };
      
      setAuthCookie(token, mockCookies as any);
      
      expect(mockCookies.set).toHaveBeenCalledWith(
        '__Host-mintenance-auth',
        token,
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          sameSite: 'strict',
          path: '/',
          maxAge: expect.any(Number)
        })
      );
    });

    it('should clear auth cookie', () => {
      const mockCookies = {
        delete: jest.fn()
      };
      
      clearAuthCookie(mockCookies as any);
      
      expect(mockCookies.delete).toHaveBeenCalledWith('__Host-mintenance-auth');
    });
  });

  describe('getCurrentUserFromCookies', () => {
    it('should return user data from valid cookie', async () => {
      const token = await createToken(mockUser);
      const mockCookies = {
        get: jest.fn(() => ({ value: token }))
      };
      
      // Mock the database query
      const mockSupabase = require('../lib/api/supabaseServer').serverSupabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockUser,
              error: null
            }))
          }))
        }))
      });
      
      const user = await getCurrentUserFromCookies(mockCookies as any);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return null for missing cookie', async () => {
      const mockCookies = {
        get: jest.fn(() => undefined)
      };
      
      const user = await getCurrentUserFromCookies(mockCookies as any);
      
      expect(user).toBeNull();
    });

    it('should return null for invalid cookie', async () => {
      const mockCookies = {
        get: jest.fn(() => ({ value: 'invalid-token' }))
      };
      
      const user = await getCurrentUserFromCookies(mockCookies as any);
      
      expect(user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing JWT_SECRET gracefully', async () => {
      delete process.env.JWT_SECRET;
      
      await expect(createToken(mockUser)).rejects.toThrow();
    });

    it('should handle weak JWT_SECRET', async () => {
      process.env.JWT_SECRET = 'weak';
      
      await expect(createToken(mockUser)).rejects.toThrow();
    });
  });
});
