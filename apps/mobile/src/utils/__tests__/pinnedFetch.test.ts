/**
 * pinnedFetch — cert-pinning fetch scaffold. Today a transparent pass-through
 * to global fetch (native module not installed). Tests the host/config routing,
 * the misconfig startup breadcrumb, and the native-missing fallback.
 *
 * resetModules per test clears the module-level startupCheckDone +
 * nativeModuleCache so each case starts fresh.
 */

const mockGetCfg = jest.fn();
const mockMisconfig = jest.fn();
jest.mock('../certPinning', () => ({
  __esModule: true,
  getCertPinningConfig: (...a: unknown[]) => mockGetCfg(...a),
  certPinningMisconfigured: (...a: unknown[]) => mockMisconfig(...a),
}));

const mockBreadcrumb = jest.fn();
jest.mock('../../config/sentry', () => ({
  __esModule: true,
  addBreadcrumb: (...a: unknown[]) => mockBreadcrumb(...a),
}));

jest.mock('../logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const DISABLED = { enabled: false };
const ENABLED_API = {
  enabled: true,
  apiCurrent: 'hashA',
  apiBackup: 'hashB',
  supabaseCurrent: 'hashS',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pinnedFetch: (input: any, init?: any) => Promise<Response>;
let fetchMock: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
  global.fetch = fetchMock as unknown as typeof fetch;
  mockGetCfg.mockReturnValue(DISABLED);
  mockMisconfig.mockReturnValue(false);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pinnedFetch = require('../pinnedFetch').pinnedFetch;
});

describe('pass-through behaviour', () => {
  it('falls through to global fetch when pinning is disabled', async () => {
    await pinnedFetch('https://api.mintenance.com/v1/foo', { method: 'GET' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mintenance.com/v1/foo',
      { method: 'GET' }
    );
  });

  it('falls through for a non-pinned host even when enabled', async () => {
    mockGetCfg.mockReturnValue(ENABLED_API);
    await pinnedFetch('https://example.com/thing');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('falls through (and does not throw) on an unparseable URL', async () => {
    mockGetCfg.mockReturnValue(ENABLED_API);
    await pinnedFetch('not a url');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('accepts a URL object input', async () => {
    await pinnedFetch(new URL('https://api.mintenance.com/v1/x'));
    expect(fetchMock).toHaveBeenCalled();
  });

  it('accepts a Request-like input (reads .url)', async () => {
    await pinnedFetch({ url: 'https://api.mintenance.com/v1/y' } as Request);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('pinned hosts fall back when the native module is absent', () => {
  it('routes api.mintenance.com to fallback fetch + warns', async () => {
    mockGetCfg.mockReturnValue(ENABLED_API);
    const { logger } = require('../logger');
    await pinnedFetch('https://api.mintenance.com/v1/secure');
    expect(fetchMock).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('routes a *.supabase.co host through the supabase hash branch', async () => {
    mockGetCfg.mockReturnValue({
      enabled: true,
      supabaseCurrent: 'hashS',
      supabaseBackup: 'hashS2',
    });
    await pinnedFetch('https://abcd.supabase.co/rest/v1/jobs');
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('startup misconfig breadcrumb', () => {
  it('emits a Sentry breadcrumb once when enabled but misconfigured', async () => {
    mockGetCfg.mockReturnValue({ enabled: true }); // no hashes -> non-pinned host
    mockMisconfig.mockReturnValue(true);
    await pinnedFetch('https://example.com/a');
    await pinnedFetch('https://example.com/b'); // second call: startupCheckDone short-circuits
    expect(mockBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it('does not emit a breadcrumb when configuration is consistent', async () => {
    mockGetCfg.mockReturnValue(ENABLED_API);
    mockMisconfig.mockReturnValue(false);
    await pinnedFetch('https://api.mintenance.com/v1/ok');
    expect(mockBreadcrumb).not.toHaveBeenCalled();
  });
});
