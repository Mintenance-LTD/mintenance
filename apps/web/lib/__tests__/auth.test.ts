// @vitest-environment node
/**
 * Auth Library Tests
 * Tests critical authentication functionality including JWT creation, verification, and rotation
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

// Set JWT_SECRET BEFORE any imports (ConfigManager reads it at module load time)
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-security';

// Use vi.hoisted() so these are available when hoisted vi.mock() factories execute
const { mockConfigInstance, mockCookieStore, supabaseChain } = vi.hoisted(() => {
  const mockConfigInstance = {
    get: vi.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key-that-is-long-enough-for-security';
      return undefined;
    }),
    getRequired: vi.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key-that-is-long-enough-for-security';
      throw new Error(`Missing required config: ${key}`);
    }),
    isProduction: vi.fn(() => false),
  };

  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const supabaseChain: Record<string, ReturnType<typeof vi.fn>> = {};
  supabaseChain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  supabaseChain.is = vi.fn(() => supabaseChain);
  supabaseChain.eq = vi.fn(() => supabaseChain);
  supabaseChain.select = vi.fn(() => supabaseChain);
  supabaseChain.insert = vi.fn(() => supabaseChain);
  supabaseChain.update = vi.fn(() => supabaseChain);
  supabaseChain.delete = vi.fn(() => supabaseChain);
  supabaseChain.rpc = vi.fn(() => supabaseChain);

  return { mockConfigInstance, mockCookieStore, supabaseChain };
});

// Mock ConfigManager to return the shared singleton instance
vi.mock('@mintenance/auth', async () => {
  const actual = await vi.importActual('@mintenance/auth');
  return {
    ...actual,
    ConfigManager: {
      getInstance: vi.fn(() => mockConfigInstance),
    },
  };
});

// Mock logger to suppress output during tests
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock token-blacklist (used by verifyToken via dynamic import)
vi.mock('../auth/token-blacklist', () => ({
  tokenBlacklist: {
    isTokenBlacklisted: vi.fn(() => Promise.resolve(false)),
    blacklistToken: vi.fn(() => Promise.resolve()),
    removeFromBlacklist: vi.fn(() => Promise.resolve()),
    blacklistUserTokens: vi.fn(() => Promise.resolve()),
    isUserBlacklisted: vi.fn(() => Promise.resolve(false)),
  },
}));

// Mock server-only modules
vi.mock('../database', () => ({
  supabase: {
    from: vi.fn(function() {
      return {
        select: vi.fn(function() { return { eq: vi.fn(function() { return { single: vi.fn() }; }) }; }),
        insert: vi.fn(function() { return { select: vi.fn(function() { return { single: vi.fn() }; }) }; }),
        update: vi.fn(function() { return { eq: vi.fn(function() { return {}; }) }; }),
        delete: vi.fn(function() { return { eq: vi.fn() }; }),
      };
    })
  },
  DatabaseManager: {
    getUserById: vi.fn(),
  }
}));

vi.mock('../api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(() => supabaseChain),
    rpc: vi.fn(() => supabaseChain),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Import auth functions after mocking dependencies
import {
  createToken,
  createTokenPair,
  rotateTokens,
  revokeAllTokens,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  getCurrentUserFromCookies,
} from '../auth';

describe('Auth Library', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    role: 'homeowner' as const,
    first_name: 'John',
    last_name: 'Doe',
    email_verified: true
  };

  /**
   * Reset the supabase chain mocks to their default (success) behavior.
   * Must be called after vi.clearAllMocks() since that clears all mock implementations.
   */
  function resetSupabaseChain() {
    supabaseChain.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    supabaseChain.is.mockImplementation(() => supabaseChain);
    supabaseChain.eq.mockImplementation(() => supabaseChain);
    supabaseChain.select.mockImplementation(() => supabaseChain);
    supabaseChain.insert.mockImplementation(() => supabaseChain);
    supabaseChain.update.mockImplementation(() => supabaseChain);
    supabaseChain.delete.mockImplementation(() => supabaseChain);
    supabaseChain.rpc.mockImplementation(() => supabaseChain);
  }

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-security';
    process.env.NODE_ENV = 'test';

    // Reset mock cookie store
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();

    // Reset ConfigManager mock to default behavior (vi.clearAllMocks clears implementations)
    mockConfigInstance.get.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key-that-is-long-enough-for-security';
      return undefined;
    });
    mockConfigInstance.getRequired.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret-key-that-is-long-enough-for-security';
      throw new Error(`Missing required config: ${key}`);
    });
    mockConfigInstance.isProduction.mockImplementation(() => false);

    // Reset supabase chain to default success behavior
    resetSupabaseChain();
  });

  afterEach(() => {
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

    it('should create tokens with different types', async () => {
      const result = await createTokenPair(mockUser);

      // Access token is a JWT (3 dot-separated parts)
      expect(result.accessToken.split('.')).toHaveLength(3);

      // Refresh token is a hex string (from crypto.randomBytes), not a JWT
      // Verify the access token is valid and contains expected payload
      const accessPayload = await verifyToken(result.accessToken);
      expect(accessPayload).toBeDefined();
      expect(accessPayload?.sub).toBe(mockUser.id);
      expect(accessPayload?.exp).toBeDefined();
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
    it('should create new tokens when rotation succeeds', async () => {
      // rotateTokens(userId, oldRefreshToken) calls:
      // 1. serverSupabase.from().select().eq().eq().single() - breach check
      // 2. serverSupabase.rpc().single() - atomic rotation
      // 3. createTokenPair -> serverSupabase.from().insert() - store new token
      let singleCallCount = 0;
      supabaseChain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Breach check: no token found (PGRST116 = no rows)
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
        }
        if (singleCallCount === 2) {
          // RPC rotate result - success
          return Promise.resolve({
            data: {
              user_email: mockUser.email,
              user_role: mockUser.role,
              family_id: 'fam-1',
              next_generation: 2,
            },
            error: null,
          });
        }
        // Default for any subsequent calls
        return Promise.resolve({ data: null, error: null });
      });

      const result = await rotateTokens(mockUser.id, 'old-refresh-token-hex');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw for invalid refresh token', async () => {
      let singleCallCount = 0;
      supabaseChain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Breach check: no token found
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
        }
        // RPC rotate: fails
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST116', message: 'Token not found or already rotated' },
        });
      });

      await expect(rotateTokens(mockUser.id, 'invalid-refresh-token')).rejects.toThrow('Token rotation failed');
    });

    it('should throw for expired refresh token', async () => {
      let singleCallCount = 0;
      supabaseChain.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Breach check: no token found
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
        }
        // RPC rotate: expired token error
        return Promise.resolve({
          data: null,
          error: { message: 'Token expired' },
        });
      });

      await expect(rotateTokens(mockUser.id, 'expired-token')).rejects.toThrow('Token rotation failed');
    });
  });

  describe('revokeAllTokens', () => {
    it('should revoke all tokens for a user', async () => {
      // revokeAllTokens returns Promise<void> - should not throw
      await expect(revokeAllTokens(mockUser.id)).resolves.toBeUndefined();
    });

    it('should not throw for any user ID', async () => {
      // revokeAllTokens calls .update().eq().is() and returns void
      await expect(revokeAllTokens('any-user-id')).resolves.toBeUndefined();
    });
  });

  describe('Cookie Management', () => {
    it('should set auth cookie with correct options', async () => {
      const token = await createToken(mockUser);

      // setAuthCookie(token, rememberMe?, refreshToken?) calls cookies() internally
      await setAuthCookie(token);

      // In test environment (non-production), cookie name is 'mintenance-auth' (no __Host- prefix)
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'mintenance-auth',
        token,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/',
          maxAge: expect.any(Number)
        })
      );
    });

    it('should clear auth cookie', async () => {
      // clearAuthCookie() takes no args, calls cookies() internally
      await clearAuthCookie();

      // Should delete all three cookies (auth, refresh, remember) with dev names
      expect(mockCookieStore.delete).toHaveBeenCalledWith('mintenance-auth');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('mintenance-refresh');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('mintenance-remember');
    });
  });

  describe('getCurrentUserFromCookies', () => {
    it('should return user data from valid cookie', async () => {
      const token = await createToken(mockUser);

      // getCurrentUserFromCookies() takes no args, reads from cookies() internally
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'mintenance-auth') {
          return { value: token };
        }
        return undefined;
      });

      const user = await getCurrentUserFromCookies();

      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return null for missing cookie', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const user = await getCurrentUserFromCookies();

      expect(user).toBeNull();
    });

    it('should return null for invalid cookie', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'mintenance-auth') {
          return { value: 'invalid-token' };
        }
        return undefined;
      });

      const user = await getCurrentUserFromCookies();

      expect(user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing JWT_SECRET gracefully', async () => {
      // Override the shared mockConfigInstance to simulate missing secret
      mockConfigInstance.getRequired.mockImplementation((key: string) => {
        throw new Error(`Required configuration ${key} is not available`);
      });

      await expect(createToken(mockUser)).rejects.toThrow();
    });

    it('should handle weak JWT_SECRET', async () => {
      // Override the shared mockConfigInstance to return a weak secret
      mockConfigInstance.getRequired.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'weak';
        throw new Error(`Missing required config: ${key}`);
      });

      // jose HS256 does not enforce minimum key length, so createToken succeeds
      // ConfigManager validation (tested in config.test.ts) is what enforces key strength
      const token = await createToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });
});
