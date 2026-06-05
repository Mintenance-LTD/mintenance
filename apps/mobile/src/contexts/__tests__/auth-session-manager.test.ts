/**
 * Unit tests for auth-session-manager.ts — JWT expiry math + SecureStore-backed
 * session persistence (save / load / clear) and logout cache clearing.
 *
 * The unit under test is NOT mocked. Only external collaborators are mocked:
 *   - expo-secure-store (SecureStore.{get,set,delete}ItemAsync)
 *   - ../utils/logger
 *   - ../lib/queryClient + ../services/OfflineManager (dynamic imports)
 *   - Date.now (spied for deterministic expiry math)
 *
 * We assert persisted payload shapes EXACTLY and expiry decisions EXACTLY,
 * never weakening token/expiry security checks.
 */

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Dynamic imports used only by clearAppCachesOnLogout.
const mockQueryClientClear = jest.fn();
const mockOfflineClearQueue = jest.fn();
jest.mock(
  '../../lib/queryClient',
  () => ({ queryClient: { clear: mockQueryClientClear } }),
  { virtual: true }
);
jest.mock(
  '../../services/OfflineManager',
  () => ({ OfflineManager: { clearQueue: mockOfflineClearQueue } }),
  { virtual: true }
);

import * as SecureStore from 'expo-secure-store';
import { logger } from '../../utils/logger';
import {
  isTokenExpiredOrExpiring,
  saveSessionToSecureStore,
  loadSessionFromSecureStore,
  clearSessionFromSecureStore,
  clearAppCachesOnLogout,
} from '../auth-session-manager';

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const SESSION_KEY = 'mintenance_session';
const SESSION_EXPIRY_KEY = 'mintenance_session_expiry';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Build a JWT with the given payload. signature/header content is irrelevant. */
const makeJWT = (payload: Record<string, unknown>): string => {
  const b64 = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sigsigsig`;
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// isTokenExpiredOrExpiring  (+ parseJWT branches)
// ---------------------------------------------------------------------------
describe('isTokenExpiredOrExpiring', () => {
  const NOW_MS = 1_700_000_000_000; // fixed wall clock
  const NOW_SECONDS = Math.floor(NOW_MS / 1000);

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  it('returns false when token has no exp claim (cannot determine expiry)', () => {
    const token = makeJWT({ sub: 'user-1' });
    expect(isTokenExpiredOrExpiring(token)).toBe(false);
  });

  it('returns true when token is already expired', () => {
    const token = makeJWT({ exp: NOW_SECONDS - 10 });
    expect(isTokenExpiredOrExpiring(token)).toBe(true);
  });

  it('returns true when token expires within the 300s refresh threshold', () => {
    // exp 100s in the future -> exp < now + 300 -> needs refresh
    const token = makeJWT({ exp: NOW_SECONDS + 100 });
    expect(isTokenExpiredOrExpiring(token)).toBe(true);
  });

  it('returns true exactly 1s inside the threshold boundary (now+299)', () => {
    const token = makeJWT({ exp: NOW_SECONDS + 299 });
    expect(isTokenExpiredOrExpiring(token)).toBe(true);
  });

  it('returns false exactly at the threshold boundary (now+300, not strictly less)', () => {
    // payload.exp < now + 300 is FALSE when exp === now + 300
    const token = makeJWT({ exp: NOW_SECONDS + 300 });
    expect(isTokenExpiredOrExpiring(token)).toBe(false);
  });

  it('returns false when token is well beyond the refresh threshold', () => {
    const token = makeJWT({ exp: NOW_SECONDS + 3600 });
    expect(isTokenExpiredOrExpiring(token)).toBe(false);
  });

  it('returns false for a malformed token (not 3 dot-delimited parts)', () => {
    // parseJWT returns null -> payload?.exp is undefined -> false
    expect(isTokenExpiredOrExpiring('not-a-jwt')).toBe(false);
    expect(isTokenExpiredOrExpiring('only.two')).toBe(false);
  });

  it('returns false when the payload segment is not valid base64/JSON', () => {
    // 3 parts but middle segment decodes to garbage -> JSON.parse throws -> null
    expect(isTokenExpiredOrExpiring('aaa.@@@@@.ccc')).toBe(false);
  });

  it('returns false when exp is 0 (falsy -> treated as no exp)', () => {
    const token = makeJWT({ exp: 0 });
    expect(isTokenExpiredOrExpiring(token)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveSessionToSecureStore  (+ extractEssentialSession branches)
// ---------------------------------------------------------------------------
describe('saveSessionToSecureStore', () => {
  const NOW_MS = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  it('persists ONLY the essential token fields and an expiry timestamp', async () => {
    const session = {
      access_token: 'at-123',
      refresh_token: 'rt-456',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: 1_700_003_600,
      // Non-essential fields that MUST be dropped:
      user: { id: 'u1', email: 'a@b.com' },
      provider_token: 'should-not-persist',
    };

    await saveSessionToSecureStore(session);

    // First write: the session JSON
    expect(mockedSecureStore.setItemAsync).toHaveBeenNthCalledWith(
      1,
      SESSION_KEY,
      JSON.stringify({
        access_token: 'at-123',
        refresh_token: 'rt-456',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1_700_003_600,
      })
    );

    // The persisted blob must NOT contain non-essential fields.
    const persisted = mockedSecureStore.setItemAsync.mock.calls[0][1];
    expect(persisted).not.toContain('provider_token');
    expect(persisted).not.toContain('a@b.com');

    // Second write: expiry timestamp = now + 7 days
    expect(mockedSecureStore.setItemAsync).toHaveBeenNthCalledWith(
      2,
      SESSION_EXPIRY_KEY,
      String(NOW_MS + SESSION_DURATION_MS)
    );

    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Session persisted to SecureStore'
    );
  });

  it('serializes missing essential fields as undefined (dropped by JSON.stringify)', async () => {
    await saveSessionToSecureStore({ access_token: 'only-at' });

    expect(mockedSecureStore.setItemAsync).toHaveBeenNthCalledWith(
      1,
      SESSION_KEY,
      JSON.stringify({ access_token: 'only-at' })
    );
  });

  it('does nothing when sessionData is null', async () => {
    await saveSessionToSecureStore(null);
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('does nothing when sessionData is undefined', async () => {
    await saveSessionToSecureStore(undefined);
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('returns early (no write) when sessionData is a non-object primitive', async () => {
    // truthy but typeof !== 'object' -> extractEssentialSession returns null
    await saveSessionToSecureStore('a-string-session');
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('catches and logs SecureStore write failures without throwing', async () => {
    const err = new Error('keychain unavailable');
    mockedSecureStore.setItemAsync.mockRejectedValueOnce(err);

    await expect(
      saveSessionToSecureStore({ access_token: 'at' })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Failed to persist session:',
      err
    );
    expect(logger.info).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadSessionFromSecureStore
// ---------------------------------------------------------------------------
describe('loadSessionFromSecureStore', () => {
  const NOW_MS = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('returns the parsed session when present and not expired', async () => {
    const stored = { access_token: 'at', refresh_token: 'rt' };
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce(JSON.stringify(stored)) // SESSION_KEY
      .mockResolvedValueOnce(String(NOW_MS + 10_000)); // SESSION_EXPIRY_KEY (future)

    const result = await loadSessionFromSecureStore();

    expect(result).toEqual(stored);
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Session restored from SecureStore'
    );
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('returns null and logs when no session JSON is stored', async () => {
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce(null) // SESSION_KEY missing
      .mockResolvedValueOnce(String(NOW_MS + 10_000));

    const result = await loadSessionFromSecureStore();

    expect(result).toBeNull();
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] No persisted session found'
    );
  });

  it('returns null when expiry timestamp is missing', async () => {
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce(JSON.stringify({ access_token: 'at' }))
      .mockResolvedValueOnce(null); // expiry missing

    const result = await loadSessionFromSecureStore();

    expect(result).toBeNull();
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] No persisted session found'
    );
  });

  it('clears and returns null when the persisted session is expired', async () => {
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce(JSON.stringify({ access_token: 'at' }))
      .mockResolvedValueOnce(String(NOW_MS - 1)); // expiry in the past

    const result = await loadSessionFromSecureStore();

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      '[AUTH] Persisted session expired, clearing'
    );
    // clearSessionFromSecureStore deletes both keys
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      SESSION_EXPIRY_KEY
    );
  });

  it('does NOT treat now === expiry as expired (boundary: only now > expiry expires)', async () => {
    const stored = { access_token: 'boundary' };
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce(JSON.stringify(stored))
      .mockResolvedValueOnce(String(NOW_MS)); // exactly equal

    const result = await loadSessionFromSecureStore();

    expect(result).toEqual(stored);
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('returns null and logs error when the stored JSON is corrupt', async () => {
    mockedSecureStore.getItemAsync
      .mockResolvedValueOnce('{ this is not valid json')
      .mockResolvedValueOnce(String(NOW_MS + 10_000));

    const result = await loadSessionFromSecureStore();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Failed to load session:',
      expect.any(Error)
    );
  });

  it('returns null and logs error when SecureStore read rejects', async () => {
    const err = new Error('read failure');
    mockedSecureStore.getItemAsync.mockRejectedValueOnce(err);

    const result = await loadSessionFromSecureStore();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Failed to load session:',
      err
    );
  });
});

// ---------------------------------------------------------------------------
// clearSessionFromSecureStore
// ---------------------------------------------------------------------------
describe('clearSessionFromSecureStore', () => {
  it('deletes both session keys and logs success', async () => {
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    await clearSessionFromSecureStore();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(
      1,
      SESSION_KEY
    );
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenNthCalledWith(
      2,
      SESSION_EXPIRY_KEY
    );
    expect(logger.info).toHaveBeenCalledWith(
      '[AUTH] Session cleared from SecureStore'
    );
  });

  it('catches and logs deletion failures without throwing', async () => {
    const err = new Error('delete failed');
    mockedSecureStore.deleteItemAsync.mockRejectedValueOnce(err);

    await expect(clearSessionFromSecureStore()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      '[AUTH] Failed to clear session:',
      err
    );
  });
});

// ---------------------------------------------------------------------------
// clearAppCachesOnLogout
// ---------------------------------------------------------------------------
describe('clearAppCachesOnLogout', () => {
  it('clears the query client and offline queue and logs success', async () => {
    await clearAppCachesOnLogout();

    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(mockOfflineClearQueue).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Cleared cache and offline queue on logout'
    );
  });

  it('catches and warns when a cache clear throws', async () => {
    const err = new Error('clear boom');
    mockQueryClientClear.mockImplementationOnce(() => {
      throw err;
    });

    await expect(clearAppCachesOnLogout()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      'Could not clear cache on logout:',
      err
    );
  });
});
