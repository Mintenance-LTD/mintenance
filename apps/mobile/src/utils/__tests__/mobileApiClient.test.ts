/**
 * Tests for the REAL mobile API client (apps/mobile/src/utils/mobileApiClient.ts).
 *
 * This suite exercises the unit under test directly — it does NOT mock
 * `@mintenance/api-client` (the base ApiClient). The only things mocked are
 * external collaborators:
 *   - global.fetch        (HTTP transport — resolve ok / non-ok / reject)
 *   - config/supabase     (auth: getSession / getUser / setSession / refreshSession / signOut)
 *   - utils/logger        (silence + assert config-error paths)
 *   - expo-secure-store   (SecureStore fallback in getAuthToken)
 *
 * Coverage targets every branch in mobileApiClient.ts:
 *   - resolveApiBaseUrl(): env set / __DEV__ fallback / prod fail-loud
 *   - getAuthToken(): session hit / getUser refresh fallback / SecureStore fallback / no token
 *   - request(): auth header injection, success, 401 -> refresh -> retry, non-401 rethrow
 *   - GET/POST/PUT/PATCH/DELETE: method + body wiring
 *   - postFormData(): url building, 401 retry, !ok throw, json parse
 *   - waitForTokenRefresh / performTokenRefresh: queue, success, failure (signOut), reject queue
 */

// ---------------------------------------------------------------------------
// Mock externals BEFORE importing the unit under test.
// ---------------------------------------------------------------------------

const mockSupabaseAuth = {
  getSession: jest.fn(),
  getUser: jest.fn(),
  setSession: jest.fn(),
  refreshSession: jest.fn(),
  signOut: jest.fn(),
};

// Override the moduleNameMapper-provided manual mock with a fully
// controllable auth surface. A jest.mock factory takes precedence.
jest.mock('../../config/supabase', () => ({
  supabase: { auth: mockSupabaseAuth },
}));

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('../logger', () => ({ logger: mockLogger }));

// SecureStore is dynamically imported inside getAuthToken().
const mockGetItemAsync = jest.fn();
jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FakeResponseInit {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string | null;
  jsonBody?: unknown;
  textBody?: string;
  jsonThrows?: boolean;
}

function makeResponse(init: FakeResponseInit = {}): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const contentType =
    init.contentType === undefined ? 'application/json' : init.contentType;
  return {
    ok,
    status,
    statusText: init.statusText ?? '',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: jest.fn(async () => {
      if (init.jsonThrows) throw new Error('invalid json');
      return init.jsonBody ?? {};
    }),
    text: jest.fn(async () => init.textBody ?? ''),
  } as unknown as Response;
}

function sessionWith(token: string | null) {
  return {
    data: { session: token ? { access_token: token } : null },
    error: null,
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated via primary getSession path.
  mockSupabaseAuth.getSession.mockResolvedValue(sessionWith('primary-token'));
  mockSupabaseAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
  mockSupabaseAuth.refreshSession.mockResolvedValue({
    data: { session: { access_token: 'refreshed-token' } },
    error: null,
  });
  mockSupabaseAuth.setSession.mockResolvedValue({ error: null });
  mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
  mockGetItemAsync.mockResolvedValue(null);
  (global as { fetch?: unknown }).fetch = jest.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// Late-bound handle to the freshly imported singleton, set per-suite via importFresh.
function importFresh() {
  let mod: typeof import('../mobileApiClient');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../mobileApiClient');
  });
  // @ts-expect-error assigned within isolateModules synchronously
  return mod as typeof import('../mobileApiClient');
}

// ===========================================================================
// resolveApiBaseUrl() / API_BASE_URL — runs at module import time.
// ===========================================================================
describe('resolveApiBaseUrl / API_BASE_URL', () => {
  it('uses EXPO_PUBLIC_API_URL when set', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const mod = importFresh();
    expect(mod.API_BASE_URL).toBe('https://api.example.com');
  });

  it('falls back to EXPO_PUBLIC_API_BASE_URL when API_URL is absent', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://fallback.example.com';
    const mod = importFresh();
    expect(mod.API_BASE_URL).toBe('https://fallback.example.com');
  });

  it('falls back to localhost in __DEV__ and warns when no env is set', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const mod = importFresh();
    expect(mod.API_BASE_URL).toBe('http://localhost:3000');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('falling back to http://localhost:3000')
    );
  });

  it('treats whitespace-only env value as unset (dev fallback)', () => {
    process.env.EXPO_PUBLIC_API_URL = '   ';
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const mod = importFresh();
    expect(mod.API_BASE_URL).toBe('http://localhost:3000');
  });

  it('fails loudly (about:blank) in a non-DEV build with no env', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const prevDev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;
    try {
      const mod = importFresh();
      expect(mod.API_BASE_URL).toBe('about:blank-missing-api-url');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('not set in a non-DEV build'),
        expect.any(Error)
      );
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = prevDev;
    }
  });
});

// ===========================================================================
// getAuthToken() — exercised indirectly through request().
// API_BASE_URL fixed to a real https origin for these so URL building works.
// ===========================================================================
describe('getAuthToken (via request auth header injection)', () => {
  let client: typeof import('../mobileApiClient').mobileApiClient;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    client = importFresh().mobileApiClient;
  });

  function lastFetchHeaders(): Record<string, string> {
    const call = (global.fetch as jest.Mock).mock.calls.at(-1);
    return call[1].headers as Record<string, string>;
  }

  it('injects Bearer token from primary getSession', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: { ok: 1 } })
    );
    const res = await client.get('/me');
    expect(res).toEqual({ ok: 1 });
    expect(lastFetchHeaders().Authorization).toBe('Bearer primary-token');
    // URL building: relative path appended to base.
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://api.test/me'
    );
  });

  it('recovers token via getUser() refresh fallback when getSession returns null', async () => {
    // First getSession (primary) -> null; getUser -> user; second getSession -> token.
    mockSupabaseAuth.getSession
      .mockResolvedValueOnce(sessionWith(null))
      .mockResolvedValueOnce(sessionWith('recovered-token'));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(lastFetchHeaders().Authorization).toBe('Bearer recovered-token');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('recovered token via getUser')
    );
  });

  it('swallows a getSession() throw and logs a warning', async () => {
    mockSupabaseAuth.getSession.mockReset();
    mockSupabaseAuth.getSession
      .mockRejectedValueOnce(new Error('boom')) // primary throws -> caught + warn
      .mockResolvedValue(sessionWith(null)); // refresh path also yields nothing
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[AUTH] getSession() failed',
      expect.any(Error)
    );
    // No auth header because no token was found.
    expect(lastFetchHeaders().Authorization).toBeUndefined();
  });

  it('falls back to SecureStore and re-hydrates the session', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetItemAsync.mockResolvedValue(
      JSON.stringify({
        access_token: 'stored-token',
        refresh_token: 'stored-refresh',
      })
    );
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
      access_token: 'stored-token',
      refresh_token: 'stored-refresh',
    });
    expect(lastFetchHeaders().Authorization).toBe('Bearer stored-token');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('restored from SecureStore')
    );
  });

  it('ignores SecureStore payload missing refresh_token', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetItemAsync.mockResolvedValue(
      JSON.stringify({ access_token: 'partial' })
    );
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
    expect(lastFetchHeaders().Authorization).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no token available from any source')
    );
  });

  it('swallows a SecureStore throw and returns null token', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetItemAsync.mockRejectedValue(new Error('keystore locked'));
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(lastFetchHeaders().Authorization).toBeUndefined();
  });

  it('does not recover when getUser succeeds but session still lacks a token', async () => {
    // getUser returns a user, but the follow-up getSession yields no access_token,
    // so the getUser-refresh branch falls through to SecureStore (also empty).
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(lastFetchHeaders().Authorization).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no token available from any source')
    );
  });

  it('swallows a getUser() throw (no session at all)', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockRejectedValue(new Error('no session'));
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );

    await client.get('/me');
    expect(lastFetchHeaders().Authorization).toBeUndefined();
  });
});

// ===========================================================================
// HTTP verb methods — method + body wiring through the real ApiClient.
// ===========================================================================
describe('HTTP verbs', () => {
  let client: typeof import('../mobileApiClient').mobileApiClient;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    client = importFresh().mobileApiClient;
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: { done: true } })
    );
  });

  function lastCall() {
    return (global.fetch as jest.Mock).mock.calls.at(-1);
  }

  it('GET sends method GET with no body', async () => {
    await client.get('/items');
    const [url, opts] = lastCall();
    expect(url).toBe('https://api.test/items');
    expect(opts.method).toBe('GET');
    expect(opts.body).toBeUndefined();
  });

  it('POST serializes body to JSON', async () => {
    await client.post('/items', { name: 'x' });
    const [, opts] = lastCall();
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'x' }));
  });

  it('POST with no data leaves body undefined', async () => {
    await client.post('/items');
    const [, opts] = lastCall();
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeUndefined();
  });

  it('PUT serializes body to JSON', async () => {
    await client.put('/items/1', { name: 'y' });
    const [, opts] = lastCall();
    expect(opts.method).toBe('PUT');
    expect(opts.body).toBe(JSON.stringify({ name: 'y' }));
  });

  it('PUT with no data leaves body undefined', async () => {
    await client.put('/items/1');
    const [, opts] = lastCall();
    expect(opts.body).toBeUndefined();
  });

  it('PATCH serializes body to JSON', async () => {
    await client.patch('/items/1', { name: 'z' });
    const [, opts] = lastCall();
    expect(opts.method).toBe('PATCH');
    expect(opts.body).toBe(JSON.stringify({ name: 'z' }));
  });

  it('PATCH with no data leaves body undefined', async () => {
    await client.patch('/items/1');
    const [, opts] = lastCall();
    expect(opts.body).toBeUndefined();
  });

  it('DELETE sends method DELETE', async () => {
    await client.delete('/items/1');
    const [, opts] = lastCall();
    expect(opts.method).toBe('DELETE');
  });

  it('returns parsed text for non-JSON responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ contentType: 'text/plain', textBody: 'plain-text' })
    );
    const res = await client.get('/text');
    expect(res).toBe('plain-text');
  });

  it('passes absolute URLs through unchanged', async () => {
    await client.get('https://other.host/abs');
    expect(lastCall()[0]).toBe('https://other.host/abs');
  });
});

// ===========================================================================
// request() 401 -> refresh -> retry path.
// ===========================================================================
describe('401 refresh-and-retry', () => {
  let client: typeof import('../mobileApiClient').mobileApiClient;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    client = importFresh().mobileApiClient;
  });

  it('refreshes the session on 401 and retries with the new token', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        makeResponse({ status: 401, ok: false, jsonBody: { message: 'no' } })
      )
      .mockResolvedValueOnce(makeResponse({ jsonBody: { recovered: true } }));

    const res = await client.get('/secure');
    expect(res).toEqual({ recovered: true });
    expect(mockSupabaseAuth.refreshSession).toHaveBeenCalledTimes(1);

    const retryHeaders = (global.fetch as jest.Mock).mock.calls[1][1]
      .headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer refreshed-token');
  });

  it('signs out and rejects when refresh fails on 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ status: 401, ok: false, jsonBody: { message: 'no' } })
    );
    mockSupabaseAuth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'refresh expired' },
    });

    await expect(client.get('/secure')).rejects.toBeDefined();
    expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Session refresh failed, signing out'
    );
  });

  it('signs out with a synthesized error when refresh returns null session and null error', async () => {
    // error is null AND data.session is null -> performTokenRefresh uses
    // `new Error('Session expired')` as the rejection.
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ status: 401, ok: false, jsonBody: { message: 'no' } })
    );
    mockSupabaseAuth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(client.get('/secure')).rejects.toThrow('Session expired');
    expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects when refreshSession itself throws', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ status: 401, ok: false, jsonBody: { message: 'no' } })
    );
    mockSupabaseAuth.refreshSession.mockRejectedValue(new Error('network'));

    await expect(client.get('/secure')).rejects.toThrow('network');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Token refresh failed',
      expect.any(Error)
    );
  });

  it('queues concurrent 401s so refresh happens once', async () => {
    // Both initial requests get 401; a single refresh serves both; both retries succeed.
    let deferredResolve: (v: unknown) => void = () => {};
    const refreshGate = new Promise((r) => {
      deferredResolve = r;
    });
    mockSupabaseAuth.refreshSession.mockImplementation(async () => {
      await refreshGate;
      return {
        data: { session: { access_token: 'queued-token' } },
        error: null,
      };
    });

    (global.fetch as jest.Mock).mockImplementation(async (_url, opts) => {
      const auth = (opts.headers as Record<string, string>).Authorization;
      if (auth === 'Bearer queued-token') {
        return makeResponse({ jsonBody: { served: true } });
      }
      return makeResponse({
        status: 401,
        ok: false,
        jsonBody: { message: 'no' },
      });
    });

    const p1 = client.get('/a');
    const p2 = client.get('/b');
    // Let both initial 401s land and enqueue, then release refresh.
    await Promise.resolve();
    await Promise.resolve();
    deferredResolve(undefined);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ served: true });
    expect(r2).toEqual({ served: true });
    // Only one refresh despite two concurrent 401s.
    expect(mockSupabaseAuth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-401 errors without refreshing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({
        status: 400,
        ok: false,
        jsonBody: { message: 'bad request' },
      })
    );
    await expect(client.get('/bad')).rejects.toBeDefined();
    expect(mockSupabaseAuth.refreshSession).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// postFormData() — file upload path.
// ===========================================================================
describe('postFormData', () => {
  let client: typeof import('../mobileApiClient').mobileApiClient;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    client = importFresh().mobileApiClient;
  });

  it('uploads with auth header and parses JSON response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: { uploaded: true } })
    );
    const fd = new FormData();
    const res = await client.postFormData('/upload', fd);
    expect(res).toEqual({ uploaded: true });

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.test/upload');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(fd);
    expect((opts.headers as Record<string, string>).Authorization).toBe(
      'Bearer primary-token'
    );
  });

  it('builds absolute URLs unchanged', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );
    await client.postFormData('https://cdn.test/u', new FormData());
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://cdn.test/u'
    );
  });

  it('omits Authorization header when no token is available', async () => {
    mockSupabaseAuth.getSession.mockResolvedValue(sessionWith(null));
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ jsonBody: {} })
    );
    await client.postFormData('/upload', new FormData());
    expect(
      (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization
    ).toBeUndefined();
  });

  it('refreshes token on 401 and retries the upload', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse({ status: 401, ok: false }))
      .mockResolvedValueOnce(makeResponse({ jsonBody: { uploaded: true } }));

    const res = await client.postFormData('/upload', new FormData());
    expect(res).toEqual({ uploaded: true });
    expect(mockSupabaseAuth.refreshSession).toHaveBeenCalledTimes(1);
    const retryHeaders = (global.fetch as jest.Mock).mock.calls[1][1]
      .headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer refreshed-token');
  });

  it('throws Upload failed on a non-ok (non-401) response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeResponse({ status: 500, ok: false })
    );
    await expect(
      client.postFormData('/upload', new FormData())
    ).rejects.toThrow('Upload failed: 500');
  });

  it('throws Upload failed when retry after 401 still fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeResponse({ status: 401, ok: false }))
      .mockResolvedValueOnce(makeResponse({ status: 403, ok: false }));
    await expect(
      client.postFormData('/upload', new FormData())
    ).rejects.toThrow('Upload failed: 403');
  });
});

// ===========================================================================
// Singleton export sanity.
// ===========================================================================
describe('mobileApiClient singleton', () => {
  it('exposes the public verb surface', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
    const { mobileApiClient } = importFresh();
    expect(typeof mobileApiClient.get).toBe('function');
    expect(typeof mobileApiClient.post).toBe('function');
    expect(typeof mobileApiClient.put).toBe('function');
    expect(typeof mobileApiClient.patch).toBe('function');
    expect(typeof mobileApiClient.delete).toBe('function');
    expect(typeof mobileApiClient.postFormData).toBe('function');
  });
});
