/**
 * Real-coverage suite for the canonical AuthContext provider.
 *
 * IMPORTANT: jest.config.js moduleNameMapper rewrites any import ending in
 * `contexts/AuthContext` to `AuthContext-fallback.tsx`. To exercise (and
 * collect coverage on) the REAL implementation we import it via an explicit
 * `../AuthContext.tsx` specifier — the trailing `.tsx` means the mapper's
 * `AuthContext$` regex does NOT match, so jest resolves the real file.
 *
 * Strategy: do NOT mock the context under test. Mock ONLY externals
 * (auth-actions delegates, auth-session-manager, AuthService, the biometric
 * hook, logger, sentryUtils). Drive every branch through the exposed context
 * value and assert state transitions + delegation.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks (externals only)
// ---------------------------------------------------------------------------

jest.mock('../auth-actions', () => ({
  restoreSession: jest.fn().mockResolvedValue(undefined),
  performSignIn: jest.fn().mockResolvedValue(undefined),
  performSignUp: jest.fn().mockResolvedValue(undefined),
  performSignOut: jest.fn().mockResolvedValue(undefined),
  performUpdateProfile: jest.fn().mockResolvedValue(undefined),
  initializePushNotifications: jest.fn(),
}));

jest.mock('../auth-session-manager', () => ({
  saveSessionToSecureStore: jest.fn().mockResolvedValue(undefined),
  clearSessionFromSecureStore: jest.fn().mockResolvedValue(undefined),
}));

const mockOnAuthStateChange = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetCurrentSession = jest.fn();

jest.mock('../../services/AuthService', () => ({
  AuthService: {
    onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
  },
}));

// Biometric hook is a dependency of the provider — mock it with stable jest.fn
// references so we can assert delegation and drive its return values. Names are
// `mock`-prefixed so jest permits them inside the out-of-scope mock factory.
const mockBioCheckAvailability = jest.fn().mockResolvedValue(undefined);
const mockBioSignIn = jest.fn();
const mockBioIsAvailable = jest.fn().mockResolvedValue(true);
const mockBioIsEnabled = jest.fn().mockResolvedValue(false);
const mockBioEnable = jest.fn().mockResolvedValue(undefined);
const mockBioDisable = jest.fn().mockResolvedValue(undefined);
const mockBioPrompt = jest.fn();

jest.mock('../../hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    biometricAvailable: false,
    signInWithBiometrics: mockBioSignIn,
    isBiometricAvailable: mockBioIsAvailable,
    isBiometricEnabled: mockBioIsEnabled,
    enableBiometric: mockBioEnable,
    disableBiometric: mockBioDisable,
    promptEnableBiometric: mockBioPrompt,
    checkBiometricAvailability: mockBioCheckAvailability,
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSetUserContext = jest.fn();
jest.mock('../../utils/sentryUtils', () => ({
  setUserContext: (...a: unknown[]) => mockSetUserContext(...a),
}));

// ---------------------------------------------------------------------------
// Import the REAL provider (bypasses moduleNameMapper via the .tsx specifier)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthProvider, useAuth } = require('../AuthContext.tsx');

const actions = jest.requireMock('../auth-actions');
const sessionMgr = jest.requireMock('../auth-session-manager');
const { logger } = jest.requireMock('../../utils/logger');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

/** Capture the auth-state-change callback the provider registers. */
let authStateCb: ((event: string, session: unknown) => Promise<void>) | null =
  null;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  authStateCb = null;
  // restoreSession resolved => provider's restore effect completes & flips
  // loading false (the real restoreSession is responsible for setLoading,
  // but here it's mocked, so loading stays true unless a path sets it).
  actions.restoreSession.mockResolvedValue(undefined);
  mockBioCheckAvailability.mockResolvedValue(undefined);
  mockGetCurrentUser.mockResolvedValue(null);
  mockGetCurrentSession.mockResolvedValue(null);
  mockBioIsAvailable.mockResolvedValue(true);
  mockBioIsEnabled.mockResolvedValue(false);
  mockBioSignIn.mockReset();
  mockBioEnable.mockReset();
  mockBioEnable.mockResolvedValue(undefined);
  mockBioDisable.mockReset();
  mockBioDisable.mockResolvedValue(undefined);
  mockOnAuthStateChange.mockImplementation(
    (cb: (event: string, session: unknown) => Promise<void>) => {
      authStateCb = cb;
      return { data: { subscription: { unsubscribe } } };
    }
  );
});

const fakeUser = {
  id: 'user-1',
  email: 'a@b.com',
  role: 'homeowner',
} as unknown as Parameters<typeof mockSetUserContext>[0];

describe('useAuth hook guard', () => {
  it('throws when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });
});

describe('AuthProvider initialization effect', () => {
  it('runs restoreSession + checkBiometricAvailability and registers a listener', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() =>
      expect(actions.restoreSession).toHaveBeenCalledTimes(1)
    );
    await waitFor(() =>
      expect(mockBioCheckAvailability).toHaveBeenCalledTimes(1)
    );
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    // Default state surfaced through the context value.
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(typeof result.current.signIn).toBe('function');
  });

  it('logs an error when initialize() rejects', async () => {
    actions.restoreSession.mockRejectedValueOnce(new Error('boom'));
    renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize auth:',
        expect.any(Error)
      )
    );
  });

  it('unsubscribes the listener on unmount', async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('auth-state-change listener branches', () => {
  async function mountAndGetCb() {
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateCb).not.toBeNull());
    return hook;
  }

  it('TOKEN_REFRESHED with session: sets session + persists', async () => {
    const { result } = await mountAndGetCb();
    const newSession = { access_token: 'x', refresh_token: 'y' };
    await act(async () => {
      await authStateCb!('TOKEN_REFRESHED', newSession);
    });
    expect(result.current.session).toEqual(newSession);
    expect(sessionMgr.saveSessionToSecureStore).toHaveBeenCalledWith(
      newSession
    );
  });

  it('TOKEN_REFRESHED with no session: no-op (branch not taken)', async () => {
    await mountAndGetCb();
    await act(async () => {
      await authStateCb!('TOKEN_REFRESHED', null);
    });
    expect(sessionMgr.saveSessionToSecureStore).not.toHaveBeenCalled();
  });

  it('SIGNED_OUT: clears user/session + clears store', async () => {
    const { result } = await mountAndGetCb();
    await act(async () => {
      await authStateCb!('SIGNED_OUT', null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(sessionMgr.clearSessionFromSecureStore).toHaveBeenCalledTimes(1);
  });

  it('SIGNED_IN with session: fetches user, sets context + persists', async () => {
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    const { result } = await mountAndGetCb();
    const newSession = { access_token: 'tok', refresh_token: 'ref' };
    await act(async () => {
      await authStateCb!('SIGNED_IN', newSession);
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).toEqual(newSession);
    expect(mockSetUserContext).toHaveBeenCalledWith(fakeUser);
    expect(sessionMgr.saveSessionToSecureStore).toHaveBeenCalledWith(
      newSession
    );
  });

  it('SIGNED_IN with no session: branch not taken (no user fetch)', async () => {
    await mountAndGetCb();
    mockGetCurrentUser.mockClear();
    await act(async () => {
      await authStateCb!('SIGNED_IN', null);
    });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('ignores events fired after unmount (mounted guard)', async () => {
    const { unmount } = await mountAndGetCb();
    const cb = authStateCb!;
    unmount();
    await act(async () => {
      await cb('SIGNED_OUT', null);
    });
    // clearSessionFromSecureStore would have been called if guard failed.
    expect(sessionMgr.clearSessionFromSecureStore).not.toHaveBeenCalled();
  });
});

describe('signIn / signUp / signOut delegation', () => {
  it('signIn delegates to performSignIn with email + password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await act(async () => {
      await result.current.signIn('e@x.com', 'pw');
    });
    expect(actions.performSignIn).toHaveBeenCalledWith(
      'e@x.com',
      'pw',
      expect.objectContaining({ setUser: expect.any(Function) }),
      expect.any(Object)
    );
  });

  it('signIn propagates errors from performSignIn', async () => {
    actions.performSignIn.mockRejectedValueOnce(new Error('bad creds'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await expect(
      act(async () => {
        await result.current.signIn('e@x.com', 'pw');
      })
    ).rejects.toThrow('bad creds');
  });

  it('signUp delegates to performSignUp with userData', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    const userData = {
      firstName: 'A',
      lastName: 'B',
      role: 'contractor' as const,
      phone: '+44',
    };
    await act(async () => {
      await result.current.signUp('e@x.com', 'pw', userData);
    });
    expect(actions.performSignUp).toHaveBeenCalledWith(
      'e@x.com',
      'pw',
      userData,
      expect.objectContaining({ setUser: expect.any(Function) }),
      expect.any(Object)
    );
  });

  it('signOut delegates to performSignOut with current user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await act(async () => {
      await result.current.signOut();
    });
    expect(actions.performSignOut).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ setUser: expect.any(Function) })
    );
  });
});

describe('updateProfile', () => {
  it('throws when no user is signed in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await expect(
      act(async () => {
        await result.current.updateProfile({ firstName: 'New' } as never);
      })
    ).rejects.toThrow('User must be signed in to update profile');
    expect(actions.performUpdateProfile).not.toHaveBeenCalled();
  });

  it('delegates to performUpdateProfile when a user is present', async () => {
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateCb).not.toBeNull());
    // Populate user state through the SIGNED_IN path.
    await act(async () => {
      await authStateCb!('SIGNED_IN', {
        access_token: 't',
        refresh_token: 'r',
      });
    });
    await act(async () => {
      await result.current.updateProfile({ firstName: 'New' } as never);
    });
    expect(actions.performUpdateProfile).toHaveBeenCalledWith(
      'user-1',
      'a@b.com',
      { firstName: 'New' },
      expect.objectContaining({ setUser: expect.any(Function) })
    );
  });

  it('passes empty-string email when the signed-in user has no email (?? fallback)', async () => {
    const noEmailUser = { id: 'user-2', email: null, role: 'homeowner' };
    mockGetCurrentUser.mockResolvedValue(noEmailUser);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateCb).not.toBeNull());
    await act(async () => {
      await authStateCb!('SIGNED_IN', {
        access_token: 't',
        refresh_token: 'r',
      });
    });
    await act(async () => {
      await result.current.updateProfile({ lastName: 'X' } as never);
    });
    expect(actions.performUpdateProfile).toHaveBeenCalledWith(
      'user-2',
      '',
      { lastName: 'X' },
      expect.objectContaining({ setUser: expect.any(Function) })
    );
  });
});

describe('refreshUser', () => {
  it('sets user + sentry context when a user is returned', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(mockSetUserContext).toHaveBeenCalledWith(fakeUser);
  });

  it('no-ops when getCurrentUser returns null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    mockGetCurrentUser.mockResolvedValue(null);
    mockSetUserContext.mockClear();
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(result.current.user).toBeNull();
    expect(mockSetUserContext).not.toHaveBeenCalled();
  });
});

describe('signInWithBiometrics', () => {
  it('sets user/session + push init on success', async () => {
    const bioResult = {
      user: { id: 'bio-1', email: 'bio@x.com', role: 'homeowner' },
      session: { access_token: 'a', refresh_token: 'b' },
    };
    mockBioSignIn.mockResolvedValue(bioResult);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await act(async () => {
      await result.current.signInWithBiometrics();
    });
    expect(result.current.user).toEqual(bioResult.user);
    expect(result.current.session).toEqual(bioResult.session);
    expect(mockSetUserContext).toHaveBeenCalledWith(bioResult.user);
    expect(actions.initializePushNotifications).toHaveBeenCalledWith('bio-1');
    expect(result.current.loading).toBe(false);
  });

  it('leaves state untouched when biometric sign-in returns undefined', async () => {
    mockBioSignIn.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await act(async () => {
      await result.current.signInWithBiometrics();
    });
    expect(result.current.user).toBeNull();
    expect(actions.initializePushNotifications).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('clears loading in finally even when biometric sign-in throws', async () => {
    mockBioSignIn.mockRejectedValue(new Error('cancelled'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    let thrown: unknown;
    await act(async () => {
      // Swallow the rejection inside act so the finally's setLoading(false)
      // state update is committed before we assert on it.
      await result.current.signInWithBiometrics().catch((e) => {
        thrown = e;
      });
    });
    expect((thrown as Error).message).toBe('cancelled');
    expect(result.current.loading).toBe(false);
  });
});

describe('enableBiometric', () => {
  it('throws when no user is signed in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());
    await expect(
      act(async () => {
        await result.current.enableBiometric();
      })
    ).rejects.toThrow(
      'User must be signed in to enable biometric authentication'
    );
    expect(mockBioEnable).not.toHaveBeenCalled();
  });

  it('uses the existing session when it already has tokens', async () => {
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    const existing = { access_token: 'has', refresh_token: 'tok' };
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateCb).not.toBeNull());
    await act(async () => {
      await authStateCb!('SIGNED_IN', existing);
    });
    mockGetCurrentSession.mockClear();
    await act(async () => {
      await result.current.enableBiometric();
    });
    // Session already had tokens => no fresh fetch from AuthService.
    expect(mockGetCurrentSession).not.toHaveBeenCalled();
    expect(mockBioEnable).toHaveBeenCalledWith(fakeUser, existing);
  });

  it('fetches a fresh session when current session lacks tokens', async () => {
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    const fresh = { access_token: 'fresh', refresh_token: 'fresh-ref' };
    mockGetCurrentSession.mockResolvedValue(fresh);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateCb).not.toBeNull());
    // SIGNED_IN with a token-less session => enableBiometric must re-fetch.
    await act(async () => {
      await authStateCb!('SIGNED_IN', { foo: 'bar' });
    });
    await act(async () => {
      await result.current.enableBiometric();
    });
    expect(mockGetCurrentSession).toHaveBeenCalled();
    expect(mockBioEnable).toHaveBeenCalledWith(fakeUser, fresh);
    expect(result.current.session).toEqual(fresh);
  });
});

describe('biometric passthrough helpers', () => {
  it('isBiometricAvailable / isBiometricEnabled / disableBiometric delegate', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(actions.restoreSession).toHaveBeenCalled());

    await act(async () => {
      await result.current.isBiometricAvailable();
    });
    expect(mockBioIsAvailable).toHaveBeenCalled();

    await act(async () => {
      await result.current.isBiometricEnabled();
    });
    expect(mockBioIsEnabled).toHaveBeenCalled();

    await act(async () => {
      await result.current.disableBiometric();
    });
    expect(mockBioDisable).toHaveBeenCalled();
  });
});
