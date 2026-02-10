// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Auth Manager Tests
 * Tests the AuthManager singleton class for authentication and user management.
 *
 * The AuthManager depends on:
 * - lib/auth (createTokenPair, verifyToken, setAuthCookie, clearAuthCookie, etc.)
 * - lib/database (DatabaseManager)
 * - lib/api/supabaseServer (serverSupabase)
 * - lib/config
 * - @mintenance/shared (logger)
 */

// ---- Hoisted mocks (survive mockReset: true) ----
const mocks = vi.hoisted(() => ({
  serverSupabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          maybeSingle: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
  createTokenPair: vi.fn(async () => ({
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
  })),
  createAuthCookieHeaders: vi.fn(() => new Headers()),
  verifyToken: vi.fn(),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  rotateTokens: vi.fn(),
  revokeAllTokens: vi.fn(),
  createToken: vi.fn(),
  DatabaseManager: {
    isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    isValidPassword: vi.fn(() => ({ valid: true, message: '' })),
    getUserById: vi.fn(),
    authenticateUser: vi.fn(),
    updateUserPassword: vi.fn(),
    updateUser: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  config: {
    isProduction: vi.fn(() => false),
  },
}));

// Mock all dependencies
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: mocks.serverSupabase,
}));

vi.mock('@/lib/auth', () => ({
  createToken: mocks.createToken,
  createTokenPair: mocks.createTokenPair,
  createAuthCookieHeaders: mocks.createAuthCookieHeaders,
  verifyToken: mocks.verifyToken,
  setAuthCookie: mocks.setAuthCookie,
  clearAuthCookie: mocks.clearAuthCookie,
  rotateTokens: mocks.rotateTokens,
  revokeAllTokens: mocks.revokeAllTokens,
}));

vi.mock('@/lib/database', () => ({
  DatabaseManager: mocks.DatabaseManager,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/config', () => ({
  config: mocks.config,
}));

vi.mock('@mintenance/auth', () => ({
  generateJWT: vi.fn(),
  verifyJWT: vi.fn(),
  generateTokenPair: vi.fn(),
  hashRefreshToken: vi.fn(),
  ConfigManager: { getInstance: vi.fn(() => ({ isProduction: () => false })) },
  PasswordValidator: { validate: vi.fn(() => ({ valid: true })) },
}));

describe('Auth Manager', () => {
  // We need to import after mocks are set up
  let authManager: Awaited<typeof import('@/lib/auth-manager')>['authManager'];

  beforeEach(async () => {
    // Re-setup hoisted mocks after mockReset clears implementations
    mocks.createTokenPair.mockResolvedValue({
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
    });
    mocks.createAuthCookieHeaders.mockReturnValue(new Headers());
    mocks.clearAuthCookie.mockResolvedValue(undefined);
    mocks.DatabaseManager.isValidEmail.mockImplementation(
      (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
    mocks.DatabaseManager.isValidPassword.mockReturnValue({ valid: true, message: '' });
    mocks.config.isProduction.mockReturnValue(false);

    const mod = await import('@/lib/auth-manager');
    authManager = mod.authManager;
  });

  describe('User Login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
        email_verified: true,
      };

      mocks.serverSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              first_name: 'John',
              last_name: 'Doe',
              role: 'homeowner',
            },
          },
          session: { access_token: 'token' },
        },
        error: null,
      });

      // Mock the profile query chain
      mocks.serverSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockUser, error: null })),
            maybeSingle: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe('user-123');
      expect(result.user!.email).toBe('test@example.com');
    });

    it('should reject login with invalid credentials', async () => {
      mocks.serverSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject login with empty credentials', async () => {
      const result = await authManager.login({
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject login with invalid email format', async () => {
      mocks.DatabaseManager.isValidEmail.mockReturnValue(false);

      const result = await authManager.login({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      mocks.serverSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'homeowner',
        email_verified: false,
      };

      // No existing user
      const maybeSingleMock = vi.fn(() => ({ data: null, error: null }));
      const singleMock = vi.fn(() => ({ data: mockUser, error: null }));

      mocks.serverSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: singleMock,
            maybeSingle: maybeSingleMock,
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockUser, error: null })),
          })),
        })),
      });

      mocks.serverSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            email: 'newuser@example.com',
            user_metadata: {
              first_name: 'Jane',
              last_name: 'Smith',
              role: 'homeowner',
            },
            email_confirmed_at: null,
          },
        },
        error: null,
      });

      const result = await authManager.register({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'homeowner',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe('newuser@example.com');
    });

    it('should reject registration with invalid email format', async () => {
      mocks.DatabaseManager.isValidEmail.mockReturnValue(false);

      const result = await authManager.register({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      mocks.DatabaseManager.isValidPassword.mockReturnValue({
        valid: false,
        message: 'Password must be at least 8 characters',
      });

      const result = await authManager.register({
        email: 'test@example.com',
        password: '123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      // Existing user found
      mocks.serverSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({
              data: { id: 'existing-user', email: 'existing@example.com', role: 'homeowner' },
              error: null,
            })),
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      });

      const result = await authManager.register({
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      mocks.clearAuthCookie.mockResolvedValue(undefined);

      // logout() returns void, not a result object
      await expect(authManager.logout()).resolves.not.toThrow();
      expect(mocks.clearAuthCookie).toHaveBeenCalled();
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid token', async () => {
      mocks.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mocks.DatabaseManager.getUserById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      });

      const result = await authManager.validateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should reject an empty token', async () => {
      const result = await authManager.validateToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject a token for a deleted user', async () => {
      mocks.verifyToken.mockResolvedValue({
        sub: 'deleted-user',
        email: 'deleted@example.com',
        role: 'homeowner',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mocks.DatabaseManager.getUserById.mockResolvedValue(null);

      const result = await authManager.validateToken('token-for-deleted-user');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no longer exists');
    });
  });

  describe('Get Current User', () => {
    it('should return user from valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      };

      mocks.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mocks.DatabaseManager.getUserById.mockResolvedValue(mockUser);

      const result = await authManager.getCurrentUser('valid-token');

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-123');
    });

    it('should return null for missing token', async () => {
      const result = await authManager.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      mocks.verifyToken.mockResolvedValue(null);

      const result = await authManager.getCurrentUser('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('Update Profile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Johnny',
        last_name: 'Doe',
        role: 'homeowner',
      };

      mocks.DatabaseManager.updateUser.mockResolvedValue(updatedUser);

      const result = await authManager.updateProfile('user-123', {
        first_name: 'Johnny',
        last_name: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(updatedUser);
    });

    it('should handle profile update failures', async () => {
      mocks.DatabaseManager.updateUser.mockResolvedValue(null);

      const result = await authManager.updateProfile('user-123', {
        first_name: 'Johnny',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully during login', async () => {
      mocks.serverSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await authManager.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
