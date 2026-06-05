/**
 * useBiometricAuth — biometric sign-in / enable / disable orchestration.
 *
 * The hook is a thin orchestration layer over BiometricService + AuthService.
 * These tests pin every branch of the security-sensitive logic:
 *   - checkBiometricAvailability: available true/false + thrown error → false.
 *   - signInWithBiometrics: no credentials (cancel) → undefined; success path
 *     tracks + breadcrumbs + returns user/session; EMAIL MISMATCH must wipe
 *     stored credentials AND throw (security guard) — including the path where
 *     the wipe itself fails (warn, still throw); thrown auth error re-thrown
 *     with failed-tracking.
 *   - isBiometricAvailable / isBiometricEnabled: pass-through to service.
 *   - enableBiometric: rejects without access/refresh token; persists with both.
 *   - disableBiometric: delegates to service.
 *   - promptEnableBiometric: no-op when unavailable / missing tokens; on the
 *     happy path schedules the prompt (1s timer) and the inner callback uses the
 *     latest session, falls back to the passed session, and throws when neither
 *     yields tokens.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockIsAvailable = jest.fn();
const mockAuthenticate = jest.fn();
const mockIsBiometricEnabled = jest.fn();
const mockEnableBiometric = jest.fn();
const mockDisableBiometric = jest.fn();
const mockPromptEnableBiometric = jest.fn();

jest.mock('../../services/BiometricService', () => ({
  __esModule: true,
  BiometricService: {
    isAvailable: (...a: unknown[]) => mockIsAvailable(...a),
    authenticate: (...a: unknown[]) => mockAuthenticate(...a),
    isBiometricEnabled: (...a: unknown[]) => mockIsBiometricEnabled(...a),
    enableBiometric: (...a: unknown[]) => mockEnableBiometric(...a),
    disableBiometric: (...a: unknown[]) => mockDisableBiometric(...a),
    promptEnableBiometric: (...a: unknown[]) => mockPromptEnableBiometric(...a),
  },
}));

const mockRestoreSession = jest.fn();
const mockGetCurrentSession = jest.fn();

jest.mock('../../services/AuthService', () => ({
  __esModule: true,
  AuthService: {
    restoreSessionFromBiometricTokens: (...a: unknown[]) =>
      mockRestoreSession(...a),
    getCurrentSession: (...a: unknown[]) => mockGetCurrentSession(...a),
  },
}));

const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    error: (...a: unknown[]) => mockLoggerError(...a),
    warn: (...a: unknown[]) => mockLoggerWarn(...a),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockTrackUserAction = jest.fn();
const mockAddBreadcrumb = jest.fn();
jest.mock('../../utils/sentryUtils', () => ({
  __esModule: true,
  trackUserAction: (...a: unknown[]) => mockTrackUserAction(...a),
  addBreadcrumb: (...a: unknown[]) => mockAddBreadcrumb(...a),
}));

import { useBiometricAuth } from '../useBiometricAuth';

type AnyUser = { id: string; email: string };
type AnySession = { access_token?: string; refresh_token?: string } | null;

const user: AnyUser = { id: 'user-1', email: 'jane@example.com' };
const fullSession = {
  access_token: 'access-tok',
  refresh_token: 'refresh-tok',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBiometricAuth — checkBiometricAvailability', () => {
  it('sets biometricAvailable=true when the service reports available', async () => {
    mockIsAvailable.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricAuth());

    expect(result.current.biometricAvailable).toBe(false);
    await act(async () => {
      await result.current.checkBiometricAvailability();
    });

    await waitFor(() => expect(result.current.biometricAvailable).toBe(true));
    expect(mockIsAvailable).toHaveBeenCalledTimes(1);
  });

  it('sets biometricAvailable=false when the service reports unavailable', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await result.current.checkBiometricAvailability();
    });

    expect(result.current.biometricAvailable).toBe(false);
  });

  it('catches errors, logs, and sets biometricAvailable=false', async () => {
    mockIsAvailable.mockRejectedValue(new Error('hw probe failed'));
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await result.current.checkBiometricAvailability();
    });

    expect(result.current.biometricAvailable).toBe(false);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error checking biometric availability:',
      expect.any(Error)
    );
  });
});

describe('useBiometricAuth — signInWithBiometrics', () => {
  it('returns undefined when authenticate yields no credentials (user cancel)', async () => {
    mockAuthenticate.mockResolvedValue(null);
    const { result } = renderHook(() => useBiometricAuth());

    let out: unknown;
    await act(async () => {
      out = await result.current.signInWithBiometrics();
    });

    expect(out).toBeUndefined();
    expect(mockRestoreSession).not.toHaveBeenCalled();
  });

  it('restores session, tracks success, and returns user+session on match', async () => {
    mockAuthenticate.mockResolvedValue({
      refreshToken: 'rt-123',
      email: 'jane@example.com',
    });
    const restoredUser = { id: 'user-1', email: 'jane@example.com' };
    const restoredSession = { access_token: 'a', refresh_token: 'b' };
    mockRestoreSession.mockResolvedValue({
      user: restoredUser,
      session: restoredSession,
    });

    const { result } = renderHook(() => useBiometricAuth());

    let out: unknown;
    await act(async () => {
      out = await result.current.signInWithBiometrics();
    });

    expect(mockRestoreSession).toHaveBeenCalledWith({
      accessToken: '',
      refreshToken: 'rt-123',
    });
    expect(out).toEqual({ user: restoredUser, session: restoredSession });
    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.biometric_sign_in_success',
      { userId: 'user-1' }
    );
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      'User signed in with biometrics',
      'auth'
    );
    // Must NOT have wiped credentials on a clean match.
    expect(mockDisableBiometric).not.toHaveBeenCalled();
  });

  it('SECURITY: wipes stored credentials and throws when restored email mismatches', async () => {
    mockAuthenticate.mockResolvedValue({
      refreshToken: 'rt-123',
      email: 'jane@example.com',
    });
    mockRestoreSession.mockResolvedValue({
      user: { id: 'user-2', email: 'attacker@example.com' },
      session: { access_token: 'a', refresh_token: 'b' },
    });
    mockDisableBiometric.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(result.current.signInWithBiometrics()).rejects.toThrow(
        /Biometric credentials do not match current user/
      );
    });

    // The stale credentials MUST be wiped.
    expect(mockDisableBiometric).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Biometric email mismatch — wiping stored credentials',
      { storedEmail: 'jane@example.com', restoredEmail: 'attacker@example.com' }
    );
    // Failure must be tracked.
    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.biometric_sign_in_failed',
      expect.objectContaining({ error: expect.any(String) })
    );
    // Success path must not fire.
    expect(mockTrackUserAction).not.toHaveBeenCalledWith(
      'auth.biometric_sign_in_success',
      expect.anything()
    );
  });

  it('SECURITY: still throws on mismatch when the credential wipe itself fails', async () => {
    mockAuthenticate.mockResolvedValue({
      refreshToken: 'rt-123',
      email: 'jane@example.com',
    });
    mockRestoreSession.mockResolvedValue({
      user: null,
      session: null,
    });
    mockDisableBiometric.mockRejectedValue(new Error('keystore locked'));

    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(result.current.signInWithBiometrics()).rejects.toThrow(
        /Biometric credentials do not match current user/
      );
    });

    expect(mockDisableBiometric).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Failed to wipe biometric credentials after mismatch',
      expect.objectContaining({ disableError: expect.any(Error) })
    );
  });

  it('re-throws and tracks failure when restoreSession rejects', async () => {
    mockAuthenticate.mockResolvedValue({
      refreshToken: 'rt-123',
      email: 'jane@example.com',
    });
    mockRestoreSession.mockRejectedValue(new Error('refresh rejected'));

    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(result.current.signInWithBiometrics()).rejects.toThrow(
        'refresh rejected'
      );
    });

    expect(mockTrackUserAction).toHaveBeenCalledWith(
      'auth.biometric_sign_in_failed',
      { error: 'refresh rejected' }
    );
    expect(mockDisableBiometric).not.toHaveBeenCalled();
  });
});

describe('useBiometricAuth — availability/enabled pass-throughs', () => {
  it('isBiometricAvailable delegates to the service', async () => {
    mockIsAvailable.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricAuth());

    let out: boolean | undefined;
    await act(async () => {
      out = await result.current.isBiometricAvailable();
    });

    expect(out).toBe(true);
    expect(mockIsAvailable).toHaveBeenCalledTimes(1);
  });

  it('isBiometricEnabled delegates to the service', async () => {
    mockIsBiometricEnabled.mockResolvedValue(false);
    const { result } = renderHook(() => useBiometricAuth());

    let out: boolean | undefined;
    await act(async () => {
      out = await result.current.isBiometricEnabled();
    });

    expect(out).toBe(false);
    expect(mockIsBiometricEnabled).toHaveBeenCalledTimes(1);
  });
});

describe('useBiometricAuth — enableBiometric', () => {
  it('throws when session has no access_token', async () => {
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(
        result.current.enableBiometric(
          user as never,
          {
            refresh_token: 'r',
          } as never
        )
      ).rejects.toThrow(/without an active session/);
    });
    expect(mockEnableBiometric).not.toHaveBeenCalled();
  });

  it('throws when session has no refresh_token', async () => {
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(
        result.current.enableBiometric(
          user as never,
          {
            access_token: 'a',
          } as never
        )
      ).rejects.toThrow(/without an active session/);
    });
    expect(mockEnableBiometric).not.toHaveBeenCalled();
  });

  it('throws when session is null', async () => {
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await expect(
        result.current.enableBiometric(user as never, null as never)
      ).rejects.toThrow(/without an active session/);
    });
    expect(mockEnableBiometric).not.toHaveBeenCalled();
  });

  it('persists tokens via the service when session is complete', async () => {
    mockEnableBiometric.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await result.current.enableBiometric(user as never, fullSession as never);
    });

    expect(mockEnableBiometric).toHaveBeenCalledWith('jane@example.com', {
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
    });
  });
});

describe('useBiometricAuth — disableBiometric', () => {
  it('delegates to the service', async () => {
    mockDisableBiometric.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBiometricAuth());

    await act(async () => {
      await result.current.disableBiometric();
    });

    expect(mockDisableBiometric).toHaveBeenCalledTimes(1);
  });
});

describe('useBiometricAuth — promptEnableBiometric', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const enableAvailability = async (result: {
    current: ReturnType<typeof useBiometricAuth>;
  }) => {
    mockIsAvailable.mockResolvedValue(true);
    await act(async () => {
      await result.current.checkBiometricAvailability();
    });
  };

  it('no-ops when biometrics are unavailable', () => {
    const { result } = renderHook(() => useBiometricAuth());
    // biometricAvailable starts false.
    act(() => {
      result.current.promptEnableBiometric(user as never, fullSession);
    });
    jest.advanceTimersByTime(2000);
    expect(mockPromptEnableBiometric).not.toHaveBeenCalled();
  });

  it('no-ops when session tokens are missing even if available', async () => {
    const { result } = renderHook(() => useBiometricAuth());
    await enableAvailability(result);

    act(() => {
      result.current.promptEnableBiometric(
        user as never,
        {
          access_token: 'a',
        } as AnySession
      );
    });
    jest.advanceTimersByTime(2000);
    expect(mockPromptEnableBiometric).not.toHaveBeenCalled();
  });

  it('schedules the prompt after 1s when available with full tokens', async () => {
    mockPromptEnableBiometric.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBiometricAuth());
    await enableAvailability(result);

    act(() => {
      result.current.promptEnableBiometric(user as never, fullSession);
    });

    // Not called before the timer elapses.
    expect(mockPromptEnableBiometric).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockPromptEnableBiometric).toHaveBeenCalledTimes(1);
    expect(mockPromptEnableBiometric).toHaveBeenCalledWith(
      'jane@example.com',
      expect.any(Function)
    );
  });

  it('inner callback enables biometric using the latest session from AuthService', async () => {
    mockPromptEnableBiometric.mockResolvedValue(undefined);
    mockGetCurrentSession.mockResolvedValue({
      access_token: 'fresh-a',
      refresh_token: 'fresh-r',
    });
    mockEnableBiometric.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBiometricAuth());
    await enableAvailability(result);

    act(() => {
      result.current.promptEnableBiometric(user as never, fullSession);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const callback = mockPromptEnableBiometric.mock
      .calls[0][1] as () => Promise<void>;
    await act(async () => {
      await callback();
    });

    expect(mockEnableBiometric).toHaveBeenCalledWith('jane@example.com', {
      accessToken: 'fresh-a',
      refreshToken: 'fresh-r',
    });
  });

  it('inner callback falls back to the passed session when AuthService returns null', async () => {
    mockPromptEnableBiometric.mockResolvedValue(undefined);
    mockGetCurrentSession.mockResolvedValue(null);
    mockEnableBiometric.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBiometricAuth());
    await enableAvailability(result);

    act(() => {
      result.current.promptEnableBiometric(user as never, fullSession);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const callback = mockPromptEnableBiometric.mock
      .calls[0][1] as () => Promise<void>;
    await act(async () => {
      await callback();
    });

    expect(mockEnableBiometric).toHaveBeenCalledWith('jane@example.com', {
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
    });
  });

  it('inner callback throws when neither latest nor passed session has tokens', async () => {
    mockPromptEnableBiometric.mockResolvedValue(undefined);
    mockGetCurrentSession.mockResolvedValue({ access_token: 'only-access' });

    // Need biometricAvailable true but pass a session with tokens so the
    // outer guard lets us schedule; then the inner refreshed session lacks
    // a refresh token to hit the throw branch.
    const { result } = renderHook(() => useBiometricAuth());
    await enableAvailability(result);

    act(() => {
      result.current.promptEnableBiometric(user as never, fullSession);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const callback = mockPromptEnableBiometric.mock
      .calls[0][1] as () => Promise<void>;
    await act(async () => {
      await expect(callback()).rejects.toThrow(
        /Session tokens are required to enable biometric authentication/
      );
    });
    expect(mockEnableBiometric).not.toHaveBeenCalled();
  });
});
