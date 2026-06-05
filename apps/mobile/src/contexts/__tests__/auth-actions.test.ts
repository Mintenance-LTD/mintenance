/**
 * Unit tests for auth-actions.ts — the auth action creators that orchestrate
 * sign-in / sign-up / sign-out / session restore / profile update.
 *
 * The unit under test is NOT mocked. Every external collaborator is mocked
 * with controllable resolve/reject behaviour, and we assert both the external
 * calls and the dispatched state transitions.
 */

// ---------------------------------------------------------------------------
// Mocks for external collaborators
// ---------------------------------------------------------------------------

jest.mock('../../services/AuthService', () => ({
  AuthService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
    refreshToken: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    initialize: jest.fn(),
    savePushToken: jest.fn(),
  },
}));

jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/sentryUtils', () => ({
  setUserContext: jest.fn(),
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
  // Default: just invoke the wrapped fn so coverage flows through it.
  measureAsyncPerformance: jest.fn((fn: () => unknown) => fn()),
}));

jest.mock('../../config/sentry', () => ({
  captureException: jest.fn(),
}));

jest.mock('../auth-session-manager', () => ({
  isTokenExpiredOrExpiring: jest.fn(),
  saveSessionToSecureStore: jest.fn(),
  loadSessionFromSecureStore: jest.fn(),
  clearSessionFromSecureStore: jest.fn(),
  clearAppCachesOnLogout: jest.fn(),
}));

// config/supabase is auto-mapped by jest.config.js to a manual mock, but we
// override the auth.setSession behaviour per-test below.
jest.mock('../../config/supabase');

// Dynamic imports inside the unit under test.
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));

jest.mock('../../services/BiometricService', () => ({
  BiometricService: { clearBiometricData: jest.fn() },
}));

import {
  initializePushNotifications,
  restoreSession,
  performSignIn,
  performSignUp,
  performSignOut,
  performUpdateProfile,
} from '../auth-actions';

import { AuthService } from '../../services/AuthService';
import { NotificationService } from '../../services/NotificationService';
import { supabase } from '../../config/supabase';
import { handleError } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';
import {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} from '../../utils/sentryUtils';
import { captureException } from '../../config/sentry';
import {
  isTokenExpiredOrExpiring,
  saveSessionToSecureStore,
  loadSessionFromSecureStore,
  clearSessionFromSecureStore,
  clearAppCachesOnLogout,
} from '../auth-session-manager';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { BiometricService } from '../../services/BiometricService';

// Typed mock helpers
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockNotificationService = NotificationService as jest.Mocked<
  typeof NotificationService
>;
const mockHandleError = handleError as jest.Mock;
const mockCaptureException = captureException as jest.Mock;
const mockMeasureAsync = measureAsyncPerformance as jest.Mock;
const mockTrackUserAction = trackUserAction as jest.Mock;
const mockAddBreadcrumb = addBreadcrumb as jest.Mock;
const mockSetUserContext = setUserContext as jest.Mock;
const mockIsTokenExpired = isTokenExpiredOrExpiring as jest.Mock;
const mockSaveSession = saveSessionToSecureStore as jest.Mock;
const mockLoadSession = loadSessionFromSecureStore as jest.Mock;
const mockClearSession = clearSessionFromSecureStore as jest.Mock;
const mockClearCaches = clearAppCachesOnLogout as jest.Mock;
const mockApiPost = (mobileApiClient as { post: jest.Mock }).post;
const mockClearBiometric = BiometricService.clearBiometricData as jest.Mock;

const makeDispatch = () => ({
  setUser: jest.fn(),
  setSession: jest.fn(),
  setLoading: jest.fn(),
});

const flush = () => new Promise((r) => setTimeout(r, 0));

const sampleUser = {
  id: 'user-123',
  email: 'jane@example.com',
  role: 'homeowner',
} as any;

const sampleSession = {
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: measureAsyncPerformance just runs the wrapped fn.
  mockMeasureAsync.mockImplementation((fn: () => unknown) => fn());
  // Supabase setSession default success.
  (supabase.auth.setSession as jest.Mock) = jest
    .fn()
    .mockResolvedValue({ error: null });
});

// ===========================================================================
// initializePushNotifications
// ===========================================================================
describe('initializePushNotifications', () => {
  it('saves push token and breadcrumbs when a token is returned', async () => {
    mockNotificationService.initialize.mockResolvedValue('expo-token-1');
    mockNotificationService.savePushToken.mockResolvedValue(undefined as never);

    await initializePushNotifications('user-123');

    expect(mockNotificationService.initialize).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.savePushToken).toHaveBeenCalledWith(
      'user-123',
      'expo-token-1'
    );
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      'Push token registered for user',
      'auth'
    );
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception (but does not throw) when savePushToken rejects', async () => {
    mockNotificationService.initialize.mockResolvedValue('expo-token-2');
    const saveErr = new Error('save failed');
    mockNotificationService.savePushToken.mockRejectedValue(saveErr);

    await expect(
      initializePushNotifications('user-123')
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      '[AUTH] savePushToken failed during silent init',
      expect.objectContaining({ userId: 'user-123', error: 'save failed' })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      saveErr,
      expect.objectContaining({
        userId: 'user-123',
        source: 'initializePushNotifications.savePushToken',
      })
    );
  });

  it('handles non-Error rejection from savePushToken via String()', async () => {
    mockNotificationService.initialize.mockResolvedValue('expo-token-3');
    mockNotificationService.savePushToken.mockRejectedValue('string failure');

    await initializePushNotifications('user-123');

    expect(logger.warn).toHaveBeenCalledWith(
      '[AUTH] savePushToken failed during silent init',
      expect.objectContaining({ error: 'string failure' })
    );
  });

  it('drops a debug breadcrumb and does NOT capture when token is null', async () => {
    mockNotificationService.initialize.mockResolvedValue(null);

    await initializePushNotifications('user-123');

    expect(mockNotificationService.savePushToken).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.stringContaining('Push token init returned null'),
      'auth'
    );
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('captures and swallows error when initialize rejects (auth must not block)', async () => {
    const initErr = new Error('init blew up');
    mockNotificationService.initialize.mockRejectedValue(initErr);

    await expect(
      initializePushNotifications('user-123')
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Push token registration failed',
      expect.objectContaining({ userId: 'user-123' })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      initErr,
      expect.objectContaining({ source: 'initializePushNotifications' })
    );
  });
});

// ===========================================================================
// restoreSession
// ===========================================================================
describe('restoreSession', () => {
  beforeEach(() => {
    // Quiet push notifications for restore tests unless overridden.
    mockNotificationService.initialize.mockResolvedValue(null);
  });

  it('no persisted session: still fetches current user/session and sets loading false', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue(null);
    mockAuthService.getCurrentUser.mockResolvedValue(null as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await restoreSession(dispatch);

    expect(dispatch.setUser).toHaveBeenCalledWith(null);
    expect(mockSetUserContext).toHaveBeenCalledWith(null);
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
    // No session restore path
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('persisted session restored to supabase client (token not expiring)', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ ...sampleSession });
    mockIsTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(sampleSession as never);

    await restoreSession(dispatch);

    expect(dispatch.setSession).toHaveBeenCalledWith(
      expect.objectContaining(sampleSession)
    );
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-abc',
      refresh_token: 'refresh-xyz',
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Session restored to Supabase client'
    );
    // active session saved
    expect(mockSaveSession).toHaveBeenCalledWith(sampleSession);
    expect(dispatch.setUser).toHaveBeenCalledWith(sampleUser);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.stringContaining('User session restored'),
      'auth'
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('logs a warning when supabase setSession returns an error', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ ...sampleSession });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      error: { message: 'bad token' },
    });
    mockIsTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await restoreSession(dispatch);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to restore session to Supabase client'),
      expect.objectContaining({ error: 'bad token' })
    );
  });

  it('does NOT call setSession when persisted session lacks tokens', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ some: 'thing' }); // no access/refresh
    mockAuthService.getCurrentUser.mockResolvedValue(null as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await restoreSession(dispatch);

    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('refreshes the token when expiring and persists the refreshed session', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ ...sampleSession });
    mockIsTokenExpired.mockReturnValue(true);
    const refreshed = {
      session: { access_token: 'new-a', refresh_token: 'new-r' },
    };
    mockAuthService.refreshToken.mockResolvedValue(refreshed as never);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await restoreSession(dispatch);

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    expect(dispatch.setSession).toHaveBeenCalledWith(refreshed.session);
    expect(mockSaveSession).toHaveBeenCalledWith(refreshed.session);
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Token refreshed successfully'
    );
  });

  it('expiring token but refresh returns no session: skips persist, continues', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ ...sampleSession });
    mockIsTokenExpired.mockReturnValue(true);
    mockAuthService.refreshToken.mockResolvedValue(null as never);
    mockAuthService.getCurrentUser.mockResolvedValue(null as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await restoreSession(dispatch);

    expect(mockAuthService.refreshToken).toHaveBeenCalled();
    // Refreshed-session save NOT called because refreshedData.session is null
    expect(mockSaveSession).not.toHaveBeenCalled();
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('token refresh failure: clears session, nulls state, returns early (no user fetch)', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue({ ...sampleSession });
    mockIsTokenExpired.mockReturnValue(true);
    mockAuthService.refreshToken.mockRejectedValue(new Error('refresh fail'));

    await restoreSession(dispatch);

    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Token refresh failed:',
      expect.any(Error)
    );
    expect(mockClearSession).toHaveBeenCalled();
    expect(dispatch.setSession).toHaveBeenLastCalledWith(null);
    expect(dispatch.setUser).toHaveBeenCalledWith(null);
    expect(dispatch.setLoading).toHaveBeenCalledWith(false);
    // Early return — getCurrentUser must NOT be called after refresh failure
    expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('initializes push notifications when a current user is restored', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockResolvedValue(null);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);
    mockNotificationService.initialize.mockResolvedValue('tok');
    mockNotificationService.savePushToken.mockResolvedValue(undefined as never);

    await restoreSession(dispatch);
    await flush();

    expect(mockNotificationService.initialize).toHaveBeenCalled();
  });

  it('routes thrown errors through handleError and still clears loading', async () => {
    const dispatch = makeDispatch();
    mockLoadSession.mockRejectedValue(new Error('store boom'));

    await restoreSession(dispatch);

    expect(mockHandleError).toHaveBeenCalledWith(
      expect.any(Error),
      'Auth check'
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });
});

// ===========================================================================
// performSignIn
// ===========================================================================
describe('performSignIn', () => {
  const biometricAuth = () => ({
    biometricAvailable: false,
    isBiometricEnabled: jest.fn().mockResolvedValue(false),
    promptEnableBiometric: jest.fn(),
  });

  beforeEach(() => {
    mockNotificationService.initialize.mockResolvedValue(null);
    mockApiPost.mockResolvedValue({});
  });

  it('signs in using result.user/session, dispatches state, tracks success', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockResolvedValue({
      user: sampleUser,
      session: sampleSession,
    } as never);

    await performSignIn('jane@example.com', 'pw', dispatch, bio);
    await flush();

    expect(dispatch.setLoading).toHaveBeenCalledWith(true);
    expect(dispatch.setUser).toHaveBeenCalledWith(sampleUser);
    expect(mockSetUserContext).toHaveBeenCalledWith(sampleUser);
    expect(dispatch.setSession).toHaveBeenCalledWith(sampleSession);
    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_in_success',
      expect.objectContaining({ userId: 'user-123', role: 'homeowner' })
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/auth/post-signup-reconciliation',
      { role: 'homeowner' }
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('falls back to getCurrentUser/getCurrentSession when result lacks them', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockResolvedValue({} as never);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(sampleSession as never);

    await performSignIn('jane@example.com', 'pw', dispatch, bio);
    await flush();

    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    expect(mockAuthService.getCurrentSession).toHaveBeenCalled();
    expect(dispatch.setUser).toHaveBeenCalledWith(sampleUser);
  });

  it('does not run success side-effects when no user is resolved', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockResolvedValue({ user: null } as never);
    mockAuthService.getCurrentUser.mockResolvedValue(null as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await performSignIn('jane@example.com', 'pw', dispatch, bio);

    expect(mockTrackUserAction).not.toHaveBeenCalledWith(
      'auth.sign_in_success',
      expect.anything()
    );
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('prompts to enable biometric when available, tokens present, not yet enabled', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: true,
      isBiometricEnabled: jest.fn().mockResolvedValue(false),
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signIn.mockResolvedValue({
      user: sampleUser,
      session: sampleSession,
    } as never);

    await performSignIn('jane@example.com', 'pw', dispatch, bio);
    await flush();

    expect(bio.isBiometricEnabled).toHaveBeenCalled();
    expect(bio.promptEnableBiometric).toHaveBeenCalledWith(
      sampleUser,
      sampleSession
    );
  });

  it('does NOT prompt biometric when already enabled', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: true,
      isBiometricEnabled: jest.fn().mockResolvedValue(true),
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signIn.mockResolvedValue({
      user: sampleUser,
      session: sampleSession,
    } as never);

    await performSignIn('jane@example.com', 'pw', dispatch, bio);
    await flush();

    expect(bio.promptEnableBiometric).not.toHaveBeenCalled();
  });

  it('post-signup reconciliation failure is non-fatal and logged', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockResolvedValue({
      user: sampleUser,
      session: sampleSession,
    } as never);
    mockApiPost.mockRejectedValue(new Error('network down'));

    await expect(
      performSignIn('jane@example.com', 'pw', dispatch, bio)
    ).resolves.toBeUndefined();
    await flush();

    expect(logger.warn).toHaveBeenCalledWith(
      'post-signup reconciliation failed (non-fatal)',
      expect.objectContaining({ service: 'auth', error: 'network down' })
    );
    expect(dispatch.setUser).toHaveBeenCalledWith(sampleUser);
  });

  it('reconciliation rejecting with a non-Error stringifies it for the log', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockResolvedValue({
      user: sampleUser,
      session: sampleSession,
    } as never);
    mockApiPost.mockRejectedValue('plain string error');

    await performSignIn('jane@example.com', 'pw', dispatch, bio);
    await flush();

    expect(logger.warn).toHaveBeenCalledWith(
      'post-signup reconciliation failed (non-fatal)',
      expect.objectContaining({ error: 'plain string error' })
    );
  });

  it('rethrows on sign-in failure, tracks failure, and clears loading', async () => {
    const dispatch = makeDispatch();
    const bio = biometricAuth();
    mockAuthService.signIn.mockRejectedValue(new Error('bad creds'));

    await expect(
      performSignIn('jane@example.com', 'pw', dispatch, bio)
    ).rejects.toThrow('bad creds');

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_in_failed',
      expect.objectContaining({ email: 'jane@example.com', error: 'bad creds' })
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });
});

// ===========================================================================
// performSignUp
// ===========================================================================
describe('performSignUp', () => {
  const userData = {
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'contractor' as const,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockNotificationService.initialize.mockResolvedValue(null);
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('signs up, dispatches user/session and tracks success', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: false,
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signUp.mockResolvedValue(undefined as never);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(sampleSession as never);

    await performSignUp('jane@example.com', 'pw', userData, dispatch, bio);

    expect(dispatch.setLoading).toHaveBeenCalledWith(true);
    expect(mockAuthService.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        password: 'pw',
        role: 'contractor',
        firstName: 'Jane',
      })
    );
    expect(dispatch.setUser).toHaveBeenCalledWith(sampleUser);
    expect(mockSetUserContext).toHaveBeenCalledWith(sampleUser);
    expect(dispatch.setSession).toHaveBeenCalledWith(sampleSession);
    // role on success comes from newUser.role (sampleUser = homeowner),
    // NOT the requested userData.role
    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_up_success',
      expect.objectContaining({ userId: 'user-123', role: 'homeowner' })
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('schedules a biometric prompt (2s) when available and tokens present', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: true,
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signUp.mockResolvedValue(undefined as never);
    mockAuthService.getCurrentUser.mockResolvedValue(sampleUser as never);
    mockAuthService.getCurrentSession.mockResolvedValue(sampleSession as never);

    await performSignUp('jane@example.com', 'pw', userData, dispatch, bio);

    expect(bio.promptEnableBiometric).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(bio.promptEnableBiometric).toHaveBeenCalledWith(
      sampleUser,
      sampleSession
    );
  });

  it('skips success side-effects when getCurrentUser returns null', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: true,
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signUp.mockResolvedValue(undefined as never);
    mockAuthService.getCurrentUser.mockResolvedValue(null as never);
    mockAuthService.getCurrentSession.mockResolvedValue(null as never);

    await performSignUp('jane@example.com', 'pw', userData, dispatch, bio);
    jest.advanceTimersByTime(2000);

    expect(mockTrackUserAction).not.toHaveBeenCalledWith(
      'auth.sign_up_success',
      expect.anything()
    );
    expect(bio.promptEnableBiometric).not.toHaveBeenCalled();
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('rethrows on sign-up failure, tracks failure, clears loading', async () => {
    const dispatch = makeDispatch();
    const bio = {
      biometricAvailable: false,
      promptEnableBiometric: jest.fn(),
    };
    mockAuthService.signUp.mockRejectedValue(new Error('email taken'));

    await expect(
      performSignUp('jane@example.com', 'pw', userData, dispatch, bio)
    ).rejects.toThrow('email taken');

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_up_failed',
      expect.objectContaining({ role: 'contractor', error: 'email taken' })
    );
    expect(dispatch.setLoading).toHaveBeenLastCalledWith(false);
  });
});

// ===========================================================================
// performSignOut
// ===========================================================================
describe('performSignOut', () => {
  beforeEach(() => {
    mockClearBiometric.mockResolvedValue(undefined);
    mockClearSession.mockResolvedValue(undefined);
    mockClearCaches.mockResolvedValue(undefined);
  });

  it('happy path: tears down local state, clears stores, tracks success', async () => {
    const dispatch = makeDispatch();
    mockAuthService.signOut.mockResolvedValue(undefined as never);

    await performSignOut(sampleUser, dispatch);

    expect(dispatch.setUser).toHaveBeenCalledWith(null);
    expect(mockSetUserContext).toHaveBeenCalledWith(null);
    expect(dispatch.setSession).toHaveBeenCalledWith(null);
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockClearBiometric).toHaveBeenCalled();
    expect(mockClearCaches).toHaveBeenCalled();
    expect(mockTrackUserAction).toHaveBeenCalledWith('auth.sign_out_success', {
      userId: 'user-123',
    });
    expect(mockHandleError).not.toHaveBeenCalled();
  });

  it('remote signOut failure: still clears local state, surfaces error, does not throw', async () => {
    const dispatch = makeDispatch();
    mockAuthService.signOut.mockRejectedValue(new Error('already gone'));

    await expect(performSignOut(sampleUser, dispatch)).resolves.toBeUndefined();

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_out_remote_failed',
      expect.objectContaining({ error: 'already gone' })
    );
    // Local teardown STILL happens (security: deleted user must not stay signed in)
    expect(dispatch.setUser).toHaveBeenCalledWith(null);
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockClearBiometric).toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'Sign out');
    expect(mockTrackUserAction).not.toHaveBeenCalledWith(
      'auth.sign_out_success',
      expect.anything()
    );
  });

  it('biometric clear failure is non-fatal — sign-out completes', async () => {
    const dispatch = makeDispatch();
    mockAuthService.signOut.mockResolvedValue(undefined as never);
    mockClearBiometric.mockRejectedValue(new Error('bio gone'));

    await performSignOut(sampleUser, dispatch);

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.sign_out_biometric_clear_failed',
      expect.objectContaining({ error: 'bio gone' })
    );
    expect(mockClearCaches).toHaveBeenCalled();
    expect(mockTrackUserAction).toHaveBeenCalledWith('auth.sign_out_success', {
      userId: 'user-123',
    });
  });

  it('cleanup failure routes through handleError', async () => {
    const dispatch = makeDispatch();
    mockAuthService.signOut.mockResolvedValue(undefined as never);
    mockClearSession.mockRejectedValue(new Error('store locked'));

    await performSignOut(sampleUser, dispatch);

    expect(mockHandleError).toHaveBeenCalledWith(
      expect.any(Error),
      'Sign out local cleanup'
    );
  });

  it('handles a null current user (no userId in tracking)', async () => {
    const dispatch = makeDispatch();
    mockAuthService.signOut.mockResolvedValue(undefined as never);

    await performSignOut(null, dispatch);

    expect(mockTrackUserAction).toHaveBeenCalledWith('auth.sign_out_attempt', {
      userId: undefined,
    });
    expect(dispatch.setUser).toHaveBeenCalledWith(null);
  });
});

// ===========================================================================
// performUpdateProfile
// ===========================================================================
describe('performUpdateProfile', () => {
  it('updates profile, dispatches updated user, tracks success', async () => {
    const dispatch = { setUser: jest.fn() };
    const updated = { ...sampleUser, firstName: 'Janet' };
    mockAuthService.updateUserProfile.mockResolvedValue(updated as never);

    await performUpdateProfile(
      'user-123',
      'jane@example.com',
      { firstName: 'Janet' } as any,
      dispatch
    );

    expect(mockAuthService.updateUserProfile).toHaveBeenCalledWith('user-123', {
      firstName: 'Janet',
    });
    expect(dispatch.setUser).toHaveBeenCalledWith(updated);
    expect(mockSetUserContext).toHaveBeenCalledWith(updated);
    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.update_profile_success',
      { userId: 'user-123' }
    );
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.stringContaining('Profile updated for user: jane@example.com'),
      'auth'
    );
  });

  it('rethrows and routes through handleError on failure', async () => {
    const dispatch = { setUser: jest.fn() };
    mockAuthService.updateUserProfile.mockRejectedValue(
      new Error('update failed')
    );

    await expect(
      performUpdateProfile(
        'user-123',
        'jane@example.com',
        { firstName: 'X' } as any,
        dispatch
      )
    ).rejects.toThrow('update failed');

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.update_profile_failed',
      expect.objectContaining({ userId: 'user-123', error: 'update failed' })
    );
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.any(Error),
      'Update profile'
    );
    expect(dispatch.setUser).not.toHaveBeenCalled();
  });
});
