/**
 * Comprehensive coverage suite for apps/mobile/src/utils/logger-enhanced.ts
 *
 * The unit under test is the mobile logger WRAPPER module. We do NOT mock the
 * module itself. We mock ONLY externals:
 *   - @mintenance/shared/lib/logger-config (the shared EnhancedLogger factory) —
 *     replaced here with a controllable fake whose child logger exposes the full
 *     method surface the wrapper relies on (info/warn/error/debug/log/child/time).
 *     The default global mock in src/__tests__/setup/globalMocks.ts only provides a
 *     minimal {info,warn,error,debug} child with no `log`/`child`, which would make
 *     logApiCall / createScreenLogger throw. This per-file mock is richer so every
 *     wrapper branch is reachable.
 *   - AsyncStorage (working in-memory mock from jest-setup.js)
 *   - react-native AppState (mock captures the change listener)
 *   - global __DEV__ and ErrorUtils (RN globals; not part of the unit)
 *
 * Every helper closes over the module-level child `logger`, so the captured fake
 * records every delegated call and lets us assert exact level + payload + the
 * redaction-relevant shape the wrapper forwards.
 */

// --- external mock: shared logger factory ---------------------------------
// `mockChildLogger` is the object returned by baseLogger.child(mobileContext);
// it is what `logger-enhanced.ts` exports and what every helper delegates to.
// The `mock` prefix is required by jest's mock-factory hoisting rules.
const mockChildLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(),
  // Nested child() calls (createScreenLogger / createServiceLogger) return a
  // fresh leaf so we can assert the context passed without losing the spy.
  child: jest.fn((ctx: unknown) => ({
    __childContext: ctx,
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
};

jest.mock('@mintenance/shared/lib/logger-config', () => ({
  createLogger: jest.fn(() => ({
    // baseLogger.child(mobileContext) -> the captured child logger
    child: jest.fn(() => mockChildLogger),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
}));

// Alias kept so the rest of the suite reads naturally.
const childLogger = mockChildLogger;

// Require (not import) AFTER the mock is registered so the module's module-level
// `createLogger(...).child(...)` returns our captured `childLogger`.
const mod = require('../logger-enhanced');

describe('logger-enhanced (mobile wrapper)', () => {
  beforeEach(() => {
    childLogger.info.mockClear();
    childLogger.warn.mockClear();
    childLogger.error.mockClear();
    childLogger.debug.mockClear();
    childLogger.log.mockClear();
    childLogger.child.mockClear();
  });

  // ---- module surface ------------------------------------------------------

  it('exports the captured child logger as both named and default export', () => {
    expect(mod.default).toBe(mod.logger);
    expect(mod.logger).toBe(childLogger);
  });

  // ---- logNavigation -------------------------------------------------------

  it('logNavigation forwards from/to and stringifies params when present', () => {
    mod.logNavigation('Home', 'Details', { id: 42 });
    expect(childLogger.info).toHaveBeenCalledTimes(1);
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Navigation');
    expect(meta.from).toBe('Home');
    expect(meta.to).toBe('Details');
    expect(meta.params).toBe(JSON.stringify({ id: 42 }));
    expect(typeof meta.timestamp).toBe('string');
  });

  it('logNavigation leaves params undefined when omitted (falsy branch)', () => {
    mod.logNavigation('A', 'B');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.params).toBeUndefined();
  });

  // ---- logScreenView -------------------------------------------------------

  it('logScreenView spreads metadata and stamps timestamp', () => {
    mod.logScreenView('Dashboard', { role: 'homeowner' });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Screen view');
    expect(meta.screenName).toBe('Dashboard');
    expect(meta.role).toBe('homeowner');
    expect(typeof meta.timestamp).toBe('string');
  });

  it('logScreenView works without metadata (undefined spread branch)', () => {
    mod.logScreenView('Settings');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.screenName).toBe('Settings');
  });

  // ---- logInteraction ------------------------------------------------------

  it('logInteraction forwards component/action plus metadata', () => {
    mod.logInteraction('Button', 'press', { variant: 'primary' });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('User interaction');
    expect(meta.component).toBe('Button');
    expect(meta.action).toBe('press');
    expect(meta.variant).toBe('primary');
  });

  it('logInteraction works without metadata', () => {
    mod.logInteraction('Link', 'tap');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.component).toBe('Link');
    expect(meta.action).toBe('tap');
  });

  // ---- logApiCall (4 branches) --------------------------------------------

  it('logApiCall logs an error when an Error is provided', () => {
    const err = new Error('boom');
    mod.logApiCall('POST', '/api/jobs', 500, 120, err);
    expect(childLogger.error).toHaveBeenCalledTimes(1);
    const [msg, passedErr, meta] = childLogger.error.mock.calls[0];
    expect(msg).toBe('API call failed');
    expect(passedErr).toBe(err);
    expect(meta).toEqual({
      method: 'POST',
      endpoint: '/api/jobs',
      status: 500,
      duration: 120,
    });
    expect(childLogger.log).not.toHaveBeenCalled();
  });

  it('logApiCall uses error level for status >= 400 (no Error object)', () => {
    mod.logApiCall('GET', '/api/jobs', 404, 50);
    expect(childLogger.log).toHaveBeenCalledTimes(1);
    const [level, msg, meta] = childLogger.log.mock.calls[0];
    expect(level).toBe('error');
    expect(msg).toBe('API call');
    expect(meta.status).toBe(404);
  });

  it('logApiCall uses info level for status < 400', () => {
    mod.logApiCall('GET', '/api/jobs', 200, 10);
    const [level] = childLogger.log.mock.calls[0];
    expect(level).toBe('info');
  });

  it('logApiCall uses info level when status is undefined (falsy status branch)', () => {
    mod.logApiCall('GET', '/api/jobs');
    const [level, , meta] = childLogger.log.mock.calls[0];
    expect(level).toBe('info');
    expect(meta.status).toBeUndefined();
  });

  // ---- logPerformance ------------------------------------------------------

  it('logPerformance forwards operation + duration + metadata', () => {
    mod.logPerformance('render', 16, { component: 'List' });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Performance');
    expect(meta.operation).toBe('render');
    expect(meta.duration).toBe(16);
    expect(meta.component).toBe('List');
  });

  it('logPerformance works without metadata', () => {
    mod.logPerformance('boot', 200);
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.operation).toBe('boot');
    expect(meta.duration).toBe(200);
  });

  // ---- logStorage (error vs success branch) -------------------------------

  it('logStorage logs error path when an Error is passed', () => {
    const err = new Error('disk full');
    mod.logStorage('set', 'token', false, err);
    expect(childLogger.error).toHaveBeenCalledTimes(1);
    const [msg, passedErr, meta] = childLogger.error.mock.calls[0];
    expect(msg).toBe('Storage operation failed');
    expect(passedErr).toBe(err);
    expect(meta).toEqual({ operation: 'set', key: 'token' });
    expect(childLogger.debug).not.toHaveBeenCalled();
  });

  it('logStorage logs debug path on success (default success arg)', () => {
    mod.logStorage('get', 'profile');
    expect(childLogger.debug).toHaveBeenCalledTimes(1);
    const [msg, meta] = childLogger.debug.mock.calls[0];
    expect(msg).toBe('Storage operation');
    expect(meta).toEqual({ operation: 'get', key: 'profile', success: true });
  });

  it('logStorage supports the clear operation with no key', () => {
    mod.logStorage('clear', undefined, false);
    const [, meta] = childLogger.debug.mock.calls[0];
    expect(meta.operation).toBe('clear');
    expect(meta.success).toBe(false);
  });

  // ---- logPermission -------------------------------------------------------

  it('logPermission forwards permission/status with metadata', () => {
    mod.logPermission('camera', 'granted', { firstAsk: true });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Permission request');
    expect(meta.permission).toBe('camera');
    expect(meta.status).toBe('granted');
    expect(meta.firstAsk).toBe(true);
  });

  it('logPermission works without metadata', () => {
    mod.logPermission('location', 'denied');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.status).toBe('denied');
  });

  // ---- logNotification -----------------------------------------------------

  it('logNotification forwards event/notificationId + metadata', () => {
    mod.logNotification('received', 'n-1', { channel: 'push' });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Push notification');
    expect(meta.event).toBe('received');
    expect(meta.notificationId).toBe('n-1');
    expect(meta.channel).toBe('push');
  });

  it('logNotification works with no id and no metadata', () => {
    mod.logNotification('dismissed');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.event).toBe('dismissed');
    expect(meta.notificationId).toBeUndefined();
  });

  // ---- logAuth (error vs success) -----------------------------------------

  it('logAuth logs the error path with the Error and action/method', () => {
    const err = new Error('bad creds');
    mod.logAuth('login', false, 'password', err);
    expect(childLogger.error).toHaveBeenCalledTimes(1);
    const [msg, passedErr, meta] = childLogger.error.mock.calls[0];
    expect(msg).toBe('Authentication failed');
    expect(passedErr).toBe(err);
    expect(meta).toEqual({ action: 'login', method: 'password' });
    expect(childLogger.info).not.toHaveBeenCalled();
  });

  it('logAuth logs the success path via info', () => {
    mod.logAuth('logout', true);
    expect(childLogger.info).toHaveBeenCalledTimes(1);
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Authentication');
    expect(meta).toEqual({
      action: 'logout',
      success: true,
      method: undefined,
    });
  });

  // ---- logConnectivity -----------------------------------------------------

  it('logConnectivity forwards connection state', () => {
    mod.logConnectivity(true, 'wifi');
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Connectivity changed');
    expect(meta.isConnected).toBe(true);
    expect(meta.connectionType).toBe('wifi');
  });

  it('logConnectivity works with no connectionType', () => {
    mod.logConnectivity(false);
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.isConnected).toBe(false);
    expect(meta.connectionType).toBeUndefined();
  });

  // ---- logMedia ------------------------------------------------------------

  it('logMedia forwards operation/mediaType/success + metadata', () => {
    mod.logMedia('capture', 'photo', true, { source: 'camera' });
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Media operation');
    expect(meta.operation).toBe('capture');
    expect(meta.mediaType).toBe('photo');
    expect(meta.success).toBe(true);
    expect(meta.source).toBe('camera');
  });

  it('logMedia works without metadata', () => {
    mod.logMedia('upload', 'video', false);
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.mediaType).toBe('video');
    expect(meta.success).toBe(false);
  });

  // ---- logPayment (error vs success; PII safety) --------------------------

  it('logPayment success path logs only safe metadata (no card/secret fields)', () => {
    mod.logPayment('charge', 1500, 'gbp', true);
    expect(childLogger.info).toHaveBeenCalledTimes(1);
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Payment operation');
    expect(meta).toEqual({
      action: 'charge',
      amount: 1500,
      currency: 'gbp',
      success: true,
      timestamp: expect.any(String),
    });
    // The wrapper intentionally never threads raw payment instruments through.
    expect(Object.keys(meta)).not.toContain('cardNumber');
    expect(Object.keys(meta)).not.toContain('cvv');
  });

  it('logPayment error path forwards the Error with safe metadata', () => {
    const err = new Error('declined');
    mod.logPayment('refund', 500, 'gbp', false, err);
    expect(childLogger.error).toHaveBeenCalledTimes(1);
    const [msg, passedErr, meta] = childLogger.error.mock.calls[0];
    expect(msg).toBe('Payment operation failed');
    expect(passedErr).toBe(err);
    expect(meta.action).toBe('refund');
    expect(meta.amount).toBe(500);
  });

  it('logPayment works with only an action (optional args undefined)', () => {
    mod.logPayment('intent_created');
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.action).toBe('intent_created');
    expect(meta.amount).toBeUndefined();
  });

  // ---- child-logger factories ---------------------------------------------

  it('createScreenLogger creates a child with screen context', () => {
    const child = mod.createScreenLogger('JobDetails');
    expect(childLogger.child).toHaveBeenCalledWith({ screen: 'JobDetails' });
    expect((child as { __childContext: unknown }).__childContext).toEqual({
      screen: 'JobDetails',
    });
    expect(typeof child.info).toBe('function');
  });

  it('createServiceLogger creates a child with service context', () => {
    const child = mod.createServiceLogger('SyncManager');
    expect(childLogger.child).toHaveBeenCalledWith({ service: 'SyncManager' });
    expect((child as { __childContext: unknown }).__childContext).toEqual({
      service: 'SyncManager',
    });
    expect(typeof child.error).toBe('function');
  });

  // ---- logCrash (errorInfo present vs absent) -----------------------------

  it('logCrash stringifies errorInfo when provided', () => {
    const err = new Error('crash');
    mod.logCrash(err, { componentStack: 'X > Y' });
    expect(childLogger.error).toHaveBeenCalledTimes(1);
    const [msg, passedErr, meta] = childLogger.error.mock.calls[0];
    expect(msg).toBe('App crashed');
    expect(passedErr).toBe(err);
    expect(meta.errorInfo).toBe(JSON.stringify({ componentStack: 'X > Y' }));
  });

  it('logCrash leaves errorInfo undefined when omitted (falsy branch)', () => {
    mod.logCrash(new Error('crash2'));
    const [, , meta] = childLogger.error.mock.calls[0];
    expect(meta.errorInfo).toBeUndefined();
  });

  // ---- logSessionStart / logSessionEnd ------------------------------------

  it('logSessionStart writes a sessionId to AsyncStorage and logs it', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    await mod.logSessionStart();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'sessionId',
      expect.stringContaining('session_1700000000000_')
    );
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Session started');
    expect(meta.sessionId).toContain('session_1700000000000_');
    nowSpy.mockRestore();
  });

  it('logSessionEnd reads the stored sessionId and logs it', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('sessionId', 'session_known');
    await mod.logSessionEnd();
    const [msg, meta] = childLogger.info.mock.calls[0];
    expect(msg).toBe('Session ended');
    expect(meta.sessionId).toBe('session_known');
  });

  it('logSessionEnd tolerates a missing sessionId (?? undefined branch)', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem('sessionId');
    await mod.logSessionEnd();
    const [, meta] = childLogger.info.mock.calls[0];
    expect(meta.sessionId).toBeUndefined();
  });

  // ---- initializeCrashReporting (__DEV__ gate + handler chaining) ----------

  // ErrorUtils is a RN global; we swap it wholesale (save/restore) because the
  // jest-setup stub only defines setGlobalHandler, so spyOn(getGlobalHandler)
  // would fail. Treating it as an external global is allowed by the rules.
  type GlobalWithDev = { __DEV__: boolean; ErrorUtils: typeof ErrorUtils };
  const g = global as unknown as GlobalWithDev;

  it('initializeCrashReporting does nothing when __DEV__ is true', () => {
    const prevDev = g.__DEV__;
    const prevEU = g.ErrorUtils;
    g.__DEV__ = true;
    const setGlobalHandler = jest.fn();
    g.ErrorUtils = {
      getGlobalHandler: jest.fn(),
      setGlobalHandler,
    } as unknown as typeof ErrorUtils;

    mod.initializeCrashReporting();
    expect(setGlobalHandler).not.toHaveBeenCalled();

    g.ErrorUtils = prevEU;
    g.__DEV__ = prevDev;
  });

  it('initializeCrashReporting installs a handler in prod that logs and chains the original', () => {
    const prevDev = g.__DEV__;
    const prevEU = g.ErrorUtils;
    g.__DEV__ = false;

    const original = jest.fn();
    let installed: ((e: unknown, fatal: boolean) => void) | undefined;
    g.ErrorUtils = {
      getGlobalHandler: jest.fn(() => original),
      setGlobalHandler: jest.fn((h: (e: unknown, fatal: boolean) => void) => {
        installed = h;
      }),
    } as unknown as typeof ErrorUtils;

    mod.initializeCrashReporting();
    expect(g.ErrorUtils.setGlobalHandler).toHaveBeenCalledTimes(1);
    expect(installed).toBeDefined();

    const fatalErr = new Error('fatal');
    installed!(fatalErr, true);
    expect(childLogger.error).toHaveBeenCalledWith(
      'Unhandled error',
      fatalErr,
      expect.objectContaining({ isFatal: true })
    );
    // original handler is chained
    expect(original).toHaveBeenCalledWith(fatalErr, true);

    g.ErrorUtils = prevEU;
    g.__DEV__ = prevDev;
  });

  it('initializeCrashReporting handler tolerates a missing original handler', () => {
    const prevDev = g.__DEV__;
    const prevEU = g.ErrorUtils;
    g.__DEV__ = false;

    let installed: ((e: unknown, fatal: boolean) => void) | undefined;
    g.ErrorUtils = {
      getGlobalHandler: jest.fn(() => undefined),
      setGlobalHandler: jest.fn((h: (e: unknown, fatal: boolean) => void) => {
        installed = h;
      }),
    } as unknown as typeof ErrorUtils;

    mod.initializeCrashReporting();
    expect(installed).toBeDefined();
    expect(() => installed!(new Error('x'), false)).not.toThrow();

    g.ErrorUtils = prevEU;
    g.__DEV__ = prevDev;
  });

  // ---- cleanup -------------------------------------------------------------

  it('cleanup is callable and does not throw', () => {
    expect(() => mod.cleanup()).not.toThrow();
  });
});

// ---- module-load AppState listener (line 49 callback body) -----------------

describe('logger-enhanced AppState listener wiring', () => {
  it('registers an AppState change listener that logs state transitions', async () => {
    // The module registers the AppState listener via `import('react-native')
    // .then(...)` at load time (Platform.OS !== 'web' branch). babel rewrites the
    // dynamic import to a require()-backed promise. Load a FRESH instance inside
    // isolateModules and flush the microtask queue so the .then() callback runs.
    const RN = require('react-native');
    (RN.AppState.addEventListener as jest.Mock).mockClear();

    jest.isolateModules(() => {
      require('../logger-enhanced');
    });

    // Flush several microtasks for the dynamic-import .then() chain.
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
    await new Promise((r) => setTimeout(r, 20));

    const calls = (RN.AppState.addEventListener as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [eventName, handler] = calls[calls.length - 1];
    expect(eventName).toBe('change');
    expect(typeof handler).toBe('function');

    // The isolated module logs through the SAME mocked createLogger child, since
    // the jest.mock factory is module-registry-wide. Assert the callback body.
    childLogger.info.mockClear();
    handler('background');
    expect(childLogger.info).toHaveBeenCalledWith('App state changed', {
      appState: 'background',
    });
  });

  it('cleanup removes the AppState subscription once it has been registered', async () => {
    const RN = require('react-native');
    const remove = jest.fn();
    (RN.AppState.addEventListener as jest.Mock).mockReturnValueOnce({ remove });

    let isolated: typeof mod;
    jest.isolateModules(() => {
      isolated = require('../logger-enhanced');
    });

    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
    await new Promise((r) => setTimeout(r, 20));

    // Now appStateSubscription is set inside the isolated module -> truthy branch.
    isolated!.cleanup();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates production config arms when reloaded with __DEV__ = false', () => {
    const g = global as unknown as { __DEV__: boolean };
    const prevDev = g.__DEV__;
    const prevDatadog = process.env.EXPO_PUBLIC_DATADOG_ENABLED;
    g.__DEV__ = false;
    process.env.EXPO_PUBLIC_DATADOG_ENABLED = 'true';

    // Reloading under __DEV__ = false exercises the `: 'production'`,
    // `: 'info'`, `!__DEV__ && ...`, and `enableSentry: !__DEV__` arms (lines 18-23)
    // plus the device-context expression (lines 33-44) on a fresh instance.
    let reloaded: typeof mod;
    jest.isolateModules(() => {
      reloaded = require('../logger-enhanced');
    });
    expect(reloaded!.logger).toBeDefined();

    g.__DEV__ = prevDev;
    if (prevDatadog === undefined) {
      delete process.env.EXPO_PUBLIC_DATADOG_ENABLED;
    } else {
      process.env.EXPO_PUBLIC_DATADOG_ENABLED = prevDatadog;
    }
  });
});
