// Mock config/supabase BEFORE importing AuthService so the module-level
// `import { supabase }` binds to the mock. AuthService delegates all
// session lifecycle to supabase.auth (session is persisted by Supabase's
// SecureStore storage adapter, not by AsyncStorage keys), so these tests
// exercise the real AuthService against a mocked Supabase auth client.
//
// Realigned 2026-05-31: the prior version mocked AuthService itself and
// asserted a fictional `@auth_session`/`@auth_user` AsyncStorage contract
// plus a non-existent `refreshSession(token)` method. The real service
// (apps/mobile/src/services/AuthService.ts) has no such API — session
// state lives in supabase.auth, the refresh entrypoint is `refreshToken()`
// (no args, wraps supabase.auth.refreshSession()), and getCurrentSession()
// returns supabase.auth.getSession()'s session. Assertions below match the
// current implementation.

jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

import { supabase } from '../../../config/supabase';
import { AuthService } from '../../../services/AuthService';

const mockAuth = supabase.auth as unknown as {
  getSession: jest.Mock;
  signOut: jest.Mock;
  refreshSession: jest.Mock;
};

describe('Session Management - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Persistence', () => {
    it('should surface the persisted session on app launch', async () => {
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Date.now() + 3600000,
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await AuthService.getCurrentSession();

      expect(session).toEqual(mockSession);
      expect(mockAuth.getSession).toHaveBeenCalled();
    });

    it('should report authenticated when a valid access token is present', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token', refresh_token: 'refresh' } },
        error: null,
      });

      await expect(AuthService.isAuthenticated()).resolves.toBe(true);
    });

    it('should clear the Supabase session on logout', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      await expect(AuthService.signOut()).resolves.toBeUndefined();

      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Refresh', () => {
    it('should refresh the token via supabase.auth.refreshSession', async () => {
      const newSession = {
        access_token: 'new_token',
        refresh_token: 'refresh',
        expires_at: Date.now() + 3600000,
      };

      mockAuth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const data = await AuthService.refreshToken();

      expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1);
      expect(data).toEqual({ session: newSession });
    });

    it('should propagate a refresh-token failure', async () => {
      const refreshError = new Error('Invalid refresh token');
      mockAuth.refreshSession.mockResolvedValue({
        data: null,
        error: refreshError,
      });

      await expect(AuthService.refreshToken()).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('Session Security', () => {
    it('should return null when there is no active session', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await AuthService.getCurrentSession();

      expect(session).toBeNull();
    });

    it('should report not authenticated when no session token exists', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(AuthService.isAuthenticated()).resolves.toBe(false);
    });

    it('should surface a sign-out error rather than swallowing it', async () => {
      const signOutError = new Error('Sign out failed');
      mockAuth.signOut.mockResolvedValue({ error: signOutError });

      await expect(AuthService.signOut()).rejects.toThrow('Sign out failed');
    });
  });
});
