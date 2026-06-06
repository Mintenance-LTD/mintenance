/**
 * Coverage suite for the REAL `src/config/supabase.ts` module.
 *
 * jest.config.js maps every `config/supabase` import to the chainable manual
 * mock in `src/config/__mocks__/supabase.ts`. To exercise the actual source we
 * pull it in with `jest.requireActual('../supabase')`, which bypasses
 * `moduleNameMapper` for the target file (its dependencies still resolve
 * through the normal mock registry).
 *
 * The module does almost all of its work at IMPORT time inside a top-level
 * try/catch gated on `__DEV__`, `EXPO_PUBLIC_USE_MOCK`, and the supplied
 * credentials. We therefore re-evaluate the module under many permutations via
 * `jest.isolateModules`, toggling `process.env`, `global.__DEV__`, and the
 * mocked `expo-constants` / `@supabase/supabase-js` / logger before each load.
 */

// ---------------------------------------------------------------------------
// Shared mock handles. These are (re)wired before each isolated module load.
// ---------------------------------------------------------------------------

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// A controllable createClient that returns a recognisable real-ish client so
// we can distinguish "createClient path" from "mock fallback path".
const realClientSentinel = {
  __real: true,
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
  },
};
const createClientMock = jest.fn(() => realClientSentinel);

type LoadOpts = {
  env?: Record<string, string | undefined>;
  dev?: boolean;
  extra?: Record<string, unknown> | undefined;
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_DEV = (global as { __DEV__?: boolean }).__DEV__;

/**
 * Re-evaluate the real supabase module under a controlled environment.
 * Returns the module exports plus the per-load mock handles.
 */
function loadModule(opts: LoadOpts = {}) {
  const { env = {}, dev = true, extra } = opts;

  let mod!: typeof import('../supabase');
  let threw: unknown;

  jest.isolateModules(() => {
    // Reset shared mocks for this load.
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
    createClientMock.mockClear();
    createClientMock.mockReturnValue(realClientSentinel);

    // Control __DEV__ for this load.
    (global as { __DEV__?: boolean }).__DEV__ = dev;

    // Apply env overrides (delete keys explicitly set to undefined).
    Object.entries(env).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });

    // Mock @supabase/supabase-js with our controllable createClient.
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: createClientMock,
    }));

    // Mock the logger (real path is mapped to the concrete logger module).
    jest.doMock('../utils/logger', () => ({ logger: loggerMock }));

    // Mock expo-constants so we can drive the `extra` fallback branch.
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: extra === undefined ? undefined : { extra } },
    }));

    // Keep the SecureStore adapter resolvable (already globally mocked).
    try {
      mod = jest.requireActual('../supabase') as typeof import('../supabase');
    } catch (e) {
      threw = e;
    }
  });

  return { mod, threw };
}

beforeEach(() => {
  // Restore a clean env baseline before every test, then individual loads
  // layer their own overrides on top.
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
  (global as { __DEV__?: boolean }).__DEV__ = ORIGINAL_DEV;
  jest.dontMock('@supabase/supabase-js');
  jest.dontMock('../utils/logger');
  jest.dontMock('expo-constants');
});

const VALID_URL = 'https://abcdefgh.supabase.co';
const VALID_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const validEnv = {
  EXPO_PUBLIC_SUPABASE_URL: VALID_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY,
  EXPO_PUBLIC_USE_MOCK: undefined as string | undefined,
};

// ===========================================================================
// Happy path: valid credentials, real client created.
// ===========================================================================

describe('module init — valid credentials', () => {
  it('creates a real Supabase client via createClient (DEV)', () => {
    const { mod, threw } = loadModule({ env: { ...validEnv }, dev: true });
    expect(threw).toBeUndefined();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(mod.supabase).toBe(realClientSentinel as unknown);
    expect(mod.isSupabaseConfigured).toBe(true);
  });

  it('passes the SecureStore storage adapter + hardened auth options', () => {
    loadModule({ env: { ...validEnv }, dev: true });
    const [url, key, options] = createClientMock.mock.calls[0];
    expect(url).toBe(VALID_URL);
    expect(key).toBe(VALID_KEY);
    // SECURITY: session must persist to SecureStore, never plaintext storage.
    expect(options.auth.storage).toBeDefined();
    expect(typeof options.auth.storage.getItem).toBe('function');
    expect(typeof options.auth.storage.setItem).toBe('function');
    expect(typeof options.auth.storage.removeItem).toBe('function');
    expect(options.auth.autoRefreshToken).toBe(true);
    expect(options.auth.persistSession).toBe(true);
    expect(options.auth.detectSessionInUrl).toBe(false);
    expect(options.realtime.params.eventsPerSecond).toBe(10);
  });

  it('logs an init line in DEV', () => {
    loadModule({ env: { ...validEnv }, dev: true });
    expect(loggerMock.info).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining(VALID_URL)
    );
  });

  it('does NOT log init line in production', () => {
    const { threw } = loadModule({ env: { ...validEnv }, dev: false });
    expect(threw).toBeUndefined();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).not.toHaveBeenCalled();
  });

  it('falls back to expoConfig.extra when env vars are absent', () => {
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: undefined,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      extra: { supabaseUrl: VALID_URL, supabaseAnonKey: VALID_KEY },
      dev: true,
    });
    expect(createClientMock).toHaveBeenCalledWith(
      VALID_URL,
      VALID_KEY,
      expect.any(Object)
    );
    expect(mod.isSupabaseConfigured).toBe(true);
  });

  it('handles a missing expoConfig (extra defaults to {})', () => {
    // No env, no expoConfig — credentials end up undefined → mock fallback.
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: undefined,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      extra: undefined,
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Mock-flag forced fallback (DEV).
// ===========================================================================

describe('module init — EXPO_PUBLIC_USE_MOCK forced mock', () => {
  it('throws internally then falls back to the mock client in DEV', () => {
    const { mod, threw } = loadModule({
      env: { ...validEnv, EXPO_PUBLIC_USE_MOCK: 'TRUE' },
      dev: true,
    });
    expect(threw).toBeUndefined();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(mod.supabase).not.toBe(realClientSentinel as unknown);
    // isSupabaseConfigured must be false when the mock flag is set.
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('Falling back to mock client')
    );
  });

  it('treats EXPO_PUBLIC_USE_MOCK=false as not-mock', () => {
    const { mod } = loadModule({
      env: { ...validEnv, EXPO_PUBLIC_USE_MOCK: 'false' },
      dev: true,
    });
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(mod.isSupabaseConfigured).toBe(true);
  });
});

// ===========================================================================
// Credential validation branches (drives validateCredentials).
// ===========================================================================

describe('credential validation branches', () => {
  it('missing url + key → invalid, DEV mock fallback', () => {
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      extra: undefined,
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('EXPO_PUBLIC_SUPABASE_URL is missing')
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing')
    );
  });

  it('dashboard URL → flagged as invalid', () => {
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL:
          'https://supabase.com/dashboard/project/abcdefgh',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY,
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('Dashboard URL detected')
    );
  });

  it('malformed (non-dashboard, non-api) URL → invalid format error', () => {
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: 'http://not-supabase.example.com',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY,
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('Invalid Supabase URL format')
    );
  });

  it('non-JWT anon key → flagged', () => {
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: VALID_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short-no-dot',
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('Anon key does not look like a JWT')
    );
  });

  it('long key without a dot → not a JWT', () => {
    const longNoDot = 'x'.repeat(50);
    const { mod } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: VALID_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: longNoDot,
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      dev: true,
    });
    expect(mod.isSupabaseConfigured).toBe(false);
  });
});

// ===========================================================================
// Production hard-fail path: invalid creds + production must throw.
// ===========================================================================

describe('module init — production hard fail', () => {
  it('rethrows when credentials are invalid in production', () => {
    const { threw } = loadModule({
      env: {
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
        EXPO_PUBLIC_USE_MOCK: undefined,
      },
      extra: undefined,
      dev: false,
    });
    expect(threw).toBeInstanceOf(Error);
    expect((threw as Error).message).toBe('Supabase configuration invalid');
    expect(loggerMock.error).toHaveBeenCalled();
    // Must NOT silently downgrade to a mock client in production.
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rethrows when createClient throws in production', () => {
    createClientMock.mockImplementationOnce(() => {
      throw new Error('boom from createClient');
    });
    const { threw } = loadModule({ env: { ...validEnv }, dev: false });
    expect(threw).toBeInstanceOf(Error);
    expect((threw as Error).message).toBe('boom from createClient');
  });

  it('non-Error throw is stringified in the DEV warn fallback', () => {
    createClientMock.mockImplementationOnce(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'string-failure';
    });
    const { mod, threw } = loadModule({ env: { ...validEnv }, dev: true });
    expect(threw).toBeUndefined();
    expect(mod.supabase).not.toBe(realClientSentinel as unknown);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Supabase',
      expect.stringContaining('string-failure')
    );
  });
});

// ===========================================================================
// The mock Supabase client (createMockSupabase) surface — invoked after a
// DEV fallback so we exercise every helper it returns.
// ===========================================================================

describe('mock Supabase client surface', () => {
  function loadMockClient() {
    const { mod } = loadModule({
      env: { ...validEnv, EXPO_PUBLIC_USE_MOCK: 'true' },
      dev: true,
    });
    return mod.supabase as unknown as {
      auth: Record<string, (...a: unknown[]) => unknown>;
      from: (t: string) => Record<string, (...a: unknown[]) => unknown>;
      storage: { from: () => Record<string, (...a: unknown[]) => unknown> };
      channel: (n: string) => Record<string, (...a: unknown[]) => unknown>;
    };
  }

  it('auth methods resolve with the documented mock shapes', async () => {
    const client = loadMockClient();
    await expect(client.auth.signUp({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(client.auth.signInWithPassword({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(client.auth.signOut()).resolves.toEqual({ error: null });
    await expect(client.auth.getSession()).resolves.toEqual({
      data: { session: null },
      error: null,
    });
    await expect(client.auth.getUser()).resolves.toEqual({
      data: { user: null },
      error: null,
    });
  });

  it('onAuthStateChange returns an unsubscribable subscription', () => {
    const client = loadMockClient();
    const res = client.auth.onAuthStateChange(() => {}) as {
      data: { subscription: { unsubscribe: () => void } };
      error: null;
    };
    expect(res.error).toBeNull();
    expect(() => res.data.subscription.unsubscribe()).not.toThrow();
  });

  it('from() builds a chainable query that resolves to empty data', async () => {
    const client = loadMockClient();
    const table = client.from('jobs');
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('MOCK')
    );

    const chain = table.select() as Record<
      string,
      (...a: unknown[]) => unknown
    > & {
      then: (cb: (v: unknown) => unknown) => Promise<unknown>;
    };
    // Each builder method returns the same chain object.
    expect(chain.select()).toBe(chain);
    expect(chain.eq()).toBe(chain);
    expect(chain.not()).toBe(chain);
    expect(chain.order()).toBe(chain);
    expect(chain.limit()).toBe(chain);
    await expect(chain.single()).resolves.toEqual({ data: null, error: null });
    // The chain is thenable and resolves to an empty list.
    await expect(Promise.resolve(chain as unknown)).resolves.toMatchObject({
      data: [],
      error: null,
    });
  });

  it('insert / delete / upsert reject with the mock error; update/eq chain', async () => {
    const client = loadMockClient();
    const table = client.from('jobs');
    await expect(table.insert({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(table.delete()).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(table.upsert({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    const updateChain = table.update({}) as Record<string, unknown>;
    expect(updateChain).toBeDefined();
    const eqChain = table.eq() as Record<string, unknown>;
    expect(eqChain).toBeDefined();
  });

  it('async-iterator on the chain yields nothing', async () => {
    const client = loadMockClient();
    const chain = client.from('jobs').select() as AsyncIterable<unknown>;
    const collected: unknown[] = [];
    for await (const row of chain) collected.push(row);
    expect(collected).toEqual([]);
  });

  it('storage.from() exposes upload/download/list', async () => {
    const client = loadMockClient();
    const bucket = client.storage.from();
    await expect(bucket.upload({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(bucket.download({})).resolves.toEqual({
      data: null,
      error: expect.any(Error),
    });
    await expect(bucket.list()).resolves.toEqual({ data: [], error: null });
  });

  it('channel() exposes on/subscribe/unsubscribe', () => {
    const client = loadMockClient();
    const ch = client.channel('room');
    const onResult = ch.on() as { subscribe: () => unknown };
    expect(onResult.subscribe()).toEqual({});
    expect(ch.subscribe()).toEqual({});
    expect(ch.unsubscribe()).toEqual({});
  });
});
