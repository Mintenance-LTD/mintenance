/**
 * Unit tests for apps/mobile/src/utils/errorTracking.ts
 *
 * Strategy:
 *  - Mock ONLY externals: ./logger and @sentry/react-native.
 *  - The module under test captures `Sentry = require('@sentry/react-native')`
 *    once at import time, so to exercise BOTH the Sentry-available path and the
 *    fallback (Sentry === null) path we load the module fresh under controlled
 *    conditions via jest.isolateModules() + jest.doMock / jest.dontMock.
 *  - Never mock the unit under test.
 */

// ---- logger mock (shared across all isolated module loads) --------------------
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock('../logger', () => ({ logger: mockLogger }));

// ---- Sentry mock factory -----------------------------------------------------
type SentryMock = {
  init: jest.Mock;
  setUser: jest.Mock;
  setTags: jest.Mock;
  setTag: jest.Mock;
  setContext: jest.Mock;
  captureException: jest.Mock;
  captureMessage: jest.Mock;
  addBreadcrumb: jest.Mock;
  startTransaction: jest.Mock;
  addGlobalEventProcessor: jest.Mock;
  lastEventId: jest.Mock;
};

function makeSentryMock(): SentryMock {
  const finish = jest.fn();
  return {
    init: jest.fn(),
    setUser: jest.fn(),
    setTags: jest.fn(),
    setTag: jest.fn(),
    setContext: jest.fn(),
    captureException: jest.fn().mockReturnValue('evt-123'),
    captureMessage: jest.fn().mockReturnValue('msg-456'),
    addBreadcrumb: jest.fn(),
    startTransaction: jest.fn().mockReturnValue({ finish }),
    addGlobalEventProcessor: jest.fn(),
    lastEventId: jest.fn().mockReturnValue('last-789'),
  };
}

/**
 * Load the errorTracking module fresh with Sentry available.
 * Returns both the module exports and the Sentry mock instance.
 */
function loadWithSentry(): { mod: any; sentry: SentryMock } {
  let mod: any;
  let sentry: SentryMock = makeSentryMock();
  jest.isolateModules(() => {
    jest.doMock('@sentry/react-native', () => sentry, { virtual: true });
    mod = require('../errorTracking');
  });
  return { mod, sentry };
}

/**
 * Load the errorTracking module fresh with Sentry UNavailable (require throws),
 * forcing the catch branch that sets Sentry = null.
 */
function loadWithoutSentry(): { mod: any } {
  let mod: any;
  jest.isolateModules(() => {
    jest.doMock(
      '@sentry/react-native',
      () => {
        throw new Error('module not found');
      },
      { virtual: true }
    );
    mod = require('../errorTracking');
  });
  return { mod };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetModules();
});

// =============================================================================
// Module load / Sentry availability detection
// =============================================================================
describe('Sentry availability detection at module load', () => {
  it('logs info when @sentry/react-native is available', () => {
    loadWithSentry();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Sentry (@sentry/react-native) available for error tracking'
    );
  });

  it('logs warn and falls back when @sentry/react-native is missing', () => {
    loadWithoutSentry();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Sentry not available, using fallback error tracking'
    );
  });
});

// =============================================================================
// Enums
// =============================================================================
describe('exported enums', () => {
  it('exposes ErrorSeverity values', () => {
    const { mod } = { mod: loadWithSentry().mod };
    expect(mod.ErrorSeverity.FATAL).toBe('fatal');
    expect(mod.ErrorSeverity.ERROR).toBe('error');
    expect(mod.ErrorSeverity.WARNING).toBe('warning');
    expect(mod.ErrorSeverity.INFO).toBe('info');
    expect(mod.ErrorSeverity.DEBUG).toBe('debug');
  });

  it('exposes ErrorCategory values', () => {
    const { mod } = loadWithSentry();
    expect(mod.ErrorCategory.NETWORK).toBe('network');
    expect(mod.ErrorCategory.PAYMENT).toBe('payment');
    expect(mod.ErrorCategory.ML_INFERENCE).toBe('ml_inference');
    expect(mod.ErrorCategory.JOB_PROCESSING).toBe('job_processing');
    expect(mod.ErrorCategory.PERFORMANCE).toBe('performance');
    expect(mod.ErrorCategory.STARTUP).toBe('startup');
  });
});

// =============================================================================
// ErrorTracker.initialize()
// =============================================================================
describe('ErrorTracker.initialize', () => {
  it('initializes Sentry with config + beforeSend/beforeBreadcrumb hooks', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();

    expect(sentry.init).toHaveBeenCalledTimes(1);
    const cfg = sentry.init.mock.calls[0][0];
    expect(cfg).toHaveProperty('dsn');
    expect(typeof cfg.beforeSend).toBe('function');
    expect(typeof cfg.beforeBreadcrumb).toBe('function');

    // performance monitoring started a transaction
    expect(sentry.startTransaction).toHaveBeenCalledWith({
      name: 'app_startup',
      op: 'app.startup',
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Error tracking with Sentry initialized successfully'
    );
  });

  it('is idempotent: second initialize() is a no-op (initialized guard)', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();
    sentry.init.mockClear();
    mod.ErrorTracker.initialize();
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('beforeSend processes the event and adds app context + fingerprint', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();
    const beforeSend = sentry.init.mock.calls[0][0].beforeSend;

    const event = {
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'boom',
            stacktrace: { frames: [{ filename: 'foo.ts' }] },
          },
        ],
      },
    };
    const out = beforeSend(event);
    expect(out.fingerprint).toEqual(['TypeError', 'foo.ts']);
    expect(out.contexts.app.name).toBe('Mintenance');
  });

  it('beforeSend drops __DEV__ events when environment is production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { mod, sentry } = loadWithSentry();
      mod.ErrorTracker.initialize();
      const beforeSend = sentry.init.mock.calls[0][0].beforeSend;
      const result = beforeSend({
        exception: { values: [{ value: 'crash in __DEV__ mode' }] },
      });
      expect(result).toBeNull();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('beforeBreadcrumb strips breadcrumbs containing password or token', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();
    const beforeBreadcrumb = sentry.init.mock.calls[0][0].beforeBreadcrumb;

    expect(beforeBreadcrumb({ message: 'user password=secret' })).toBeNull();
    expect(beforeBreadcrumb({ message: 'auth token=abc' })).toBeNull();
    const safe = { message: 'navigated home' };
    expect(beforeBreadcrumb(safe)).toBe(safe);
  });

  it('uses fallback tracking when Sentry is unavailable', () => {
    const { mod } = loadWithoutSentry();
    mod.ErrorTracker.initialize();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Error tracking initialized with fallback system (Sentry not available)'
    );
  });

  it('catches and logs errors thrown during initialize', () => {
    const { mod, sentry } = loadWithSentry();
    sentry.init.mockImplementation(() => {
      throw new Error('init failed');
    });
    mod.ErrorTracker.initialize();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to initialize error tracking',
      expect.any(Error)
    );
  });

  it('global event processor mutates events for critical operations', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();
    // monitorCriticalOperations registers one processor per critical op
    expect(sentry.addGlobalEventProcessor).toHaveBeenCalled();
    const processor = sentry.addGlobalEventProcessor.mock.calls[0][0];

    const matched = processor({ tags: { operation: 'job_posting' } });
    expect(matched.level).toBe('error');
    expect(matched.contexts.critical_operation.name).toBe('job_posting');

    // non-matching op passes through unchanged level
    const other = processor({ tags: { operation: 'not_critical' } });
    expect(other.level).toBeUndefined();
  });
});

// =============================================================================
// ErrorTracker.captureError()
// =============================================================================
describe('ErrorTracker.captureError', () => {
  it('captures via Sentry with user, tags, context and returns event id', () => {
    const { mod, sentry } = loadWithSentry();
    const err = new Error('network down');
    const eventId = mod.ErrorTracker.captureError(
      err,
      mod.ErrorCategory.NETWORK,
      mod.ErrorSeverity.ERROR,
      {
        userId: 'u1',
        userRole: 'homeowner',
        feature: 'feed',
        userJourney: 'browse',
        experimentVariant: 'B',
        jobId: 'j1',
        contractorId: 'c1',
      },
      { extraKey: 'extraVal' }
    );

    expect(eventId).toBe('evt-123');
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: 'u1',
      role: 'homeowner',
    });
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'network',
        severity: 'error',
        feature: 'feed',
        userJourney: 'browse',
        experiment: 'B',
      })
    );
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({
        jobId: 'j1',
        contractorId: 'c1',
        extraKey: 'extraVal',
      })
    );
    expect(sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ level: 'error' })
    );
  });

  it('does not set user when context has no userId', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.captureError(new Error('x'), mod.ErrorCategory.DATABASE);
    expect(sentry.setUser).not.toHaveBeenCalled();
    // default severity is ERROR
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' })
    );
  });

  it('works with no context / no extra (empty path)', () => {
    const { mod, sentry } = loadWithSentry();
    const id = mod.ErrorTracker.captureError(
      new Error('x'),
      mod.ErrorCategory.MEMORY
    );
    expect(id).toBe('evt-123');
    expect(sentry.setUser).not.toHaveBeenCalled();
  });

  it('returns a fallback event id when Sentry is unavailable', () => {
    const { mod } = loadWithoutSentry();
    const id = mod.ErrorTracker.captureError(
      new Error('boom'),
      mod.ErrorCategory.NETWORK,
      mod.ErrorSeverity.ERROR,
      { userId: 'u9' },
      { a: 1 }
    );
    expect(id).toMatch(/^fallback_\d+_[a-z0-9]+$/);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error tracked (fallback)',
      expect.objectContaining({ category: 'network' })
    );
  });

  it('returns empty string and logs when tracking itself throws', () => {
    const { mod, sentry } = loadWithSentry();
    sentry.setTags.mockImplementation(() => {
      throw new Error('sentry boom');
    });
    const id = mod.ErrorTracker.captureError(
      new Error('x'),
      mod.ErrorCategory.NETWORK
    );
    expect(id).toBe('');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to track error:',
      expect.any(Error)
    );
  });
});

// =============================================================================
// ErrorTracker.captureBusinessError()
// =============================================================================
describe('ErrorTracker.captureBusinessError', () => {
  it('wraps a message into a BusinessLogicError and captures it', () => {
    const { mod, sentry } = loadWithSentry();
    const id = mod.ErrorTracker.captureBusinessError(
      'invalid pricing',
      mod.ErrorCategory.PRICING_CALCULATION,
      {
        operation: 'calc',
        input: { a: 1 },
        expected: 10,
        actual: 5,
        userId: 'u1',
        jobId: 'j1',
        contractorId: 'c1',
      }
    );
    expect(id).toBe('evt-123');
    const errArg = sentry.captureException.mock.calls[0][0];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg.name).toBe('BusinessLogicError');
    expect(errArg.message).toBe('invalid pricing');
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({ operation: 'calc', expected: 10, actual: 5 })
    );
  });
});

// =============================================================================
// ErrorTracker.capturePerformanceIssue()
// =============================================================================
describe('ErrorTracker.capturePerformanceIssue', () => {
  it('captures a WARNING error when duration exceeds threshold', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.capturePerformanceIssue('render', 500, 100, {
      userId: 'u1',
    });
    const errArg = sentry.captureException.mock.calls[0][0];
    expect(errArg.name).toBe('PerformanceIssue');
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'performance', severity: 'warning' })
    );
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({
        operation: 'render',
        duration: 500,
        threshold: 100,
        performanceRatio: 5,
      })
    );
  });

  it('does nothing when duration is within threshold', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.capturePerformanceIssue('render', 50, 100);
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

// =============================================================================
// ErrorTracker.addBreadcrumb()
// =============================================================================
describe('ErrorTracker.addBreadcrumb', () => {
  it('forwards breadcrumb to Sentry with default info level + timestamp', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const { mod, sentry } = loadWithSentry();
      mod.ErrorTracker.addBreadcrumb('clicked', 'ui');
      expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'clicked',
        category: 'ui',
        level: 'info',
        data: undefined,
        timestamp: 1000,
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('passes explicit level + data', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.addBreadcrumb('warn!', 'sys', 'warning', { x: 1 });
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning', data: { x: 1 } })
    );
  });

  it('is a no-op (does not throw) when Sentry is unavailable', () => {
    const { mod } = loadWithoutSentry();
    expect(() => mod.ErrorTracker.addBreadcrumb('m', 'c')).not.toThrow();
  });
});

// =============================================================================
// ErrorTracker.setUserContext() / setReleaseContext()
// =============================================================================
describe('ErrorTracker.setUserContext + setReleaseContext', () => {
  it('sets user context on Sentry', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.setUserContext({
      id: 'u1',
      email: 'a@b.com',
      role: 'contractor',
      segment: 'pro',
    });
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: 'u1',
      email: 'a@b.com',
      username: 'contractor',
      segment: 'pro',
    });
  });

  it('sets release + build tags', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.setReleaseContext('2.0.0', '42');
    expect(sentry.setTag).toHaveBeenCalledWith('app_version', '2.0.0');
    expect(sentry.setTag).toHaveBeenCalledWith('build_number', '42');
  });

  it('setUserContext is safe when Sentry unavailable', () => {
    const { mod } = loadWithoutSentry();
    expect(() => mod.ErrorTracker.setUserContext({ id: 'u1' })).not.toThrow();
    expect(() => mod.ErrorTracker.setReleaseContext('1', '1')).not.toThrow();
  });
});

// =============================================================================
// ErrorTracker.captureMessage()
// =============================================================================
describe('ErrorTracker.captureMessage', () => {
  it('sets message_context when context provided and returns event id', () => {
    const { mod, sentry } = loadWithSentry();
    const id = mod.ErrorTracker.captureMessage(
      'hello',
      mod.ErrorSeverity.INFO,
      {
        userId: 'u1',
      }
    );
    expect(sentry.setContext).toHaveBeenCalledWith('message_context', {
      userId: 'u1',
    });
    expect(sentry.captureMessage).toHaveBeenCalledWith('hello', 'info');
    expect(id).toBe('msg-456');
  });

  it('skips context when none provided, default level INFO', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.captureMessage('plain');
    expect(sentry.setContext).not.toHaveBeenCalledWith(
      'message_context',
      expect.anything()
    );
    expect(sentry.captureMessage).toHaveBeenCalledWith('plain', 'info');
  });

  it('returns empty string when Sentry unavailable', () => {
    const { mod } = loadWithoutSentry();
    expect(mod.ErrorTracker.captureMessage('hi')).toBe('');
  });
});

// =============================================================================
// ErrorTracker.getStatus()
// =============================================================================
describe('ErrorTracker.getStatus', () => {
  it('reports initialized=true + lastEventId after initialize', () => {
    const { mod, sentry } = loadWithSentry();
    mod.ErrorTracker.initialize();
    const status = mod.ErrorTracker.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.lastEventId).toBe('last-789');
    expect(status.environment).toBeDefined();
    expect(status.release).toBeDefined();
    expect(sentry.lastEventId).toHaveBeenCalled();
  });

  it('reports lastEventId undefined when Sentry unavailable', () => {
    const { mod } = loadWithoutSentry();
    const status = mod.ErrorTracker.getStatus();
    expect(status.lastEventId).toBeUndefined();
  });
});

// =============================================================================
// Helper functions
// =============================================================================
describe('helper trackers', () => {
  it('trackAPIError captures NETWORK error with request context', () => {
    const { mod, sentry } = loadWithSentry();
    const id = mod.trackAPIError(new Error('500'), '/jobs', 'GET', 500, 1200);
    expect(id).toBe('evt-123');
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'network', feature: 'api_/jobs' })
    );
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({
        endpoint: '/jobs',
        method: 'GET',
        statusCode: 500,
        responseTime: 1200,
      })
    );
  });

  it('trackMLError captures ML_INFERENCE error with input size', () => {
    const { mod, sentry } = loadWithSentry();
    const id = mod.trackMLError(
      new Error('nan'),
      'pricing',
      { a: 1 },
      { score: 1 }
    );
    expect(id).toBe('evt-123');
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({
        modelName: 'pricing',
        inputDataSize: JSON.stringify({ a: 1 }).length,
        hasInference: true,
      })
    );
  });

  it('trackMLError marks hasInference false when no inference given', () => {
    const { mod, sentry } = loadWithSentry();
    mod.trackMLError(new Error('nan'), 'pricing', { a: 1 });
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({ hasInference: false })
    );
  });

  it('trackPaymentError captures FATAL PAYMENT error', () => {
    const { mod, sentry } = loadWithSentry();
    mod.trackPaymentError(new Error('declined'), 'pi_1', 5000, 'cus_1');
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'payment',
        severity: 'fatal',
        feature: 'payment_processing',
      })
    );
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: 'cus_1',
      role: undefined,
    });
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({
        paymentIntentId: 'pi_1',
        amount: 5000,
        customerId: 'cus_1',
      })
    );
  });

  it('trackJobError captures JOB_PROCESSING error with job context', () => {
    const { mod, sentry } = loadWithSentry();
    mod.trackJobError(new Error('stuck'), 'j1', 'assign', 'u1');
    expect(sentry.setTags).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'job_processing',
        feature: 'job_assign',
      })
    );
    expect(sentry.setContext).toHaveBeenCalledWith(
      'business_context',
      expect.objectContaining({ operation: 'assign', jobId: 'j1' })
    );
  });
});

// =============================================================================
// initializeErrorTracking() + global handlers
// =============================================================================
describe('initializeErrorTracking', () => {
  it('initializes the tracker', () => {
    const { mod, sentry } = loadWithSentry();
    mod.initializeErrorTracking();
    expect(sentry.init).toHaveBeenCalled();
  });

  it('registers an unhandledrejection handler when window exists, which captures errors', () => {
    const handlers: Record<string, (e: any) => void> = {};
    const win: any = {
      addEventListener: jest.fn((evt: string, cb: (e: any) => void) => {
        handlers[evt] = cb;
      }),
    };
    (global as any).window = win;
    try {
      const { mod, sentry } = loadWithSentry();
      mod.initializeErrorTracking();
      expect(win.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
      // Fire the handler -> should funnel through captureError -> Sentry
      handlers['unhandledrejection']({ reason: 'kaboom' });
      const errArg = sentry.captureException.mock.calls[0][0];
      expect(errArg.message).toContain('Unhandled Promise Rejection: kaboom');
    } finally {
      delete (global as any).window;
    }
  });
});

// =============================================================================
// Fallback global error handlers (setupFallbackErrorTracking via window)
// =============================================================================
describe('setupFallbackErrorTracking with window present', () => {
  it('registers error + unhandledrejection listeners and logs caught events', () => {
    const handlers: Record<string, (e: any) => void> = {};
    const win: any = {
      addEventListener: jest.fn((evt: string, cb: (e: any) => void) => {
        handlers[evt] = cb;
      }),
    };
    (global as any).window = win;
    try {
      const { mod } = loadWithoutSentry();
      mod.ErrorTracker.initialize();
      expect(win.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(win.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );

      handlers['error']({
        error: { message: 'global err' },
        filename: 'f.js',
        lineno: 1,
        colno: 2,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Global error caught (fallback):',
        expect.objectContaining({ message: 'global err', filename: 'f.js' })
      );

      handlers['unhandledrejection']({ reason: 'rej' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled promise rejection (fallback):',
        expect.objectContaining({ reason: 'rej' })
      );
    } finally {
      delete (global as any).window;
    }
  });
});

// =============================================================================
// Singleton export
// =============================================================================
describe('errorTracker singleton + constructor', () => {
  it('exports a singleton instance and constructor returns the same instance', () => {
    const { mod } = loadWithSentry();
    expect(mod.errorTracker).toBeInstanceOf(mod.ErrorTracker);
    const another = new mod.ErrorTracker();
    expect(another).toBe(mod.errorTracker);
  });
});
