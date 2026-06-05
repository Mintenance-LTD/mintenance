/**
 * Unit tests for errorTracking/index.ts — the EnhancedErrorAnalytics orchestrator.
 *
 * The orchestrator wires four collaborators (ErrorCapture, ErrorReporting,
 * ErrorAnalytics, ErrorRecovery) and a logger. We mock ONLY those externals so
 * the orchestrator's own branching/delegation logic runs for real and is the
 * thing measured for coverage.
 *
 * Because index.ts builds its singleton at module-load time
 * (`enhancedErrorAnalytics = EnhancedErrorAnalytics.getInstance()`), the mocks
 * for the collaborator classes must be hoisted and in place before import.
 */

// --- Hoisted mock instances for the four collaborators -------------------------
// NOTE: babel hoists `jest.mock(...)` AND ES `import` statements above the
// top-level `const` declarations in this file. If the collaborator instances
// were plain `const`s referenced from the mock factories, they would be in the
// temporal dead zone when index.ts builds its singleton during the hoisted
// import. We therefore build the instances *inside* each factory (which runs
// lazily at first require) and stash them on `var` holders (var has no TDZ).
/* eslint-disable no-var */
var mockCapture: Record<string, jest.Mock>;
var mockReporting: Record<string, jest.Mock>;
var mockAnalytics: Record<string, jest.Mock>;
var mockRecovery: Record<string, jest.Mock>;
// The cleanup callback index.ts registers during initialize(); captured here at
// module-load time because `clearMocks: true` wipes mock.calls before tests run.
var mockCleanupCallback: (() => void) | undefined;
/* eslint-enable no-var */

jest.mock('../ErrorCapture', () => ({
  ErrorCapture: jest.fn().mockImplementation(() => {
    mockCapture = {
      generateErrorSignature: jest.fn(),
      createErrorOccurrence: jest.fn(),
      addBreadcrumb: jest.fn(),
      getBreadcrumbsCount: jest.fn(),
      cleanOldBreadcrumbs: jest.fn(),
      clearBreadcrumbs: jest.fn(),
    };
    return mockCapture;
  }),
}));
jest.mock('../ErrorReporting', () => ({
  ErrorReporting: jest.fn().mockImplementation(() => {
    mockReporting = {
      reportError: jest.fn(),
      setReportingEnabled: jest.fn(),
      isReportingEnabled: jest.fn(),
    };
    return mockReporting;
  }),
}));
jest.mock('../ErrorAnalytics', () => ({
  ErrorAnalytics: jest.fn().mockImplementation(() => {
    mockAnalytics = {
      updateErrorPattern: jest.fn(),
      updateUserProfile: jest.fn(),
      addOccurrence: jest.fn(),
      generateInsights: jest.fn(),
      generateErrorTrends: jest.fn(),
      getErrorPatterns: jest.fn(),
      getUserErrorProfiles: jest.fn(),
      generateAnalyticsReport: jest.fn(),
      getAnalyticsCounts: jest.fn(),
      performCleanup: jest.fn(),
      clearAll: jest.fn(),
    };
    return mockAnalytics;
  }),
}));
jest.mock('../ErrorRecovery', () => ({
  ErrorRecovery: jest.fn().mockImplementation(() => {
    mockRecovery = {
      startCleanupRoutine: jest.fn((cb: () => void) => {
        mockCleanupCallback = cb;
      }),
      dispose: jest.fn(),
    };
    return mockRecovery;
  }),
}));

// Auto-mock the logger module (matches sibling tests; the logger is a class
// instance whose methods become jest.fn under auto-mock). A factory referencing
// an out-of-scope object does not reliably apply to the legacy errorTracking.ts
// `./logger` import that gets pulled in transitively via ErrorTypes.
jest.mock('../../logger');

import { enhancedErrorAnalytics } from '../index';
import { ErrorCategory, ErrorSeverity } from '../../errorTracking';
import { logger } from '../../logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

const defaultCounts = {
  patternsCount: 0,
  occurrencesCount: 0,
  userProfilesCount: 0,
};

/**
 * The singleton is shared across tests, so reset mock call history and
 * re-seed default return values before each test. `analyticsEnabled` is a
 * private instance flag that some tests flip; we restore it to true via the
 * public setter in afterEach.
 */
beforeEach(() => {
  jest.clearAllMocks();
  mockAnalytics.getAnalyticsCounts.mockReturnValue({ ...defaultCounts });
  mockCapture.getBreadcrumbsCount.mockReturnValue(0);
  mockReporting.isReportingEnabled.mockReturnValue(true);
});

afterEach(() => {
  // Ensure a clean enabled state for the next test (some tests disable it).
  enhancedErrorAnalytics.setAnalyticsEnabled(true);
  jest.restoreAllMocks();
});

describe('module load / singleton bootstrap', () => {
  it('builds a singleton and runs initialize() on first getInstance', () => {
    expect(enhancedErrorAnalytics).toBeDefined();
    // initialize() registered a cleanup callback with ErrorRecovery at load.
    // (clearMocks wipes call history before this test, so we assert on the
    // callback captured by the mock factory at module-load time instead.)
    expect(typeof mockCleanupCallback).toBe('function');
    // The four collaborator instances were constructed and captured.
    expect(mockCapture).toBeDefined();
    expect(mockReporting).toBeDefined();
    expect(mockAnalytics).toBeDefined();
    expect(mockRecovery).toBeDefined();
  });

  it('returns the same cached instance on subsequent getInstance() calls', () => {
    // The class is not exported, but the singleton was built via getInstance()
    // at module load. Calling getInstance() again exercises the "instance
    // already exists" (false) branch of the guard. We reach it through the
    // constructor of the live singleton.
    const SingletonClass = enhancedErrorAnalytics.constructor as {
      getInstance: () => unknown;
    };
    const again = SingletonClass.getInstance();
    expect(again).toBe(enhancedErrorAnalytics);
  });
});

describe('trackError', () => {
  it('orchestrates capture → analytics → reporting and returns the Sentry eventId', () => {
    mockCapture.generateErrorSignature.mockReturnValue('sig-123');
    const occurrence = { id: 'occ-1' };
    mockCapture.createErrorOccurrence.mockReturnValue(occurrence);
    mockReporting.reportError.mockReturnValue('event-abc');

    const err = new Error('boom');
    const context = { screen: 'Home' };
    const id = enhancedErrorAnalytics.trackError(
      err,
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      context,
      'user-9'
    );

    expect(id).toBe('event-abc');
    expect(mockCapture.generateErrorSignature).toHaveBeenCalledWith(
      err,
      context
    );
    expect(mockCapture.createErrorOccurrence).toHaveBeenCalledWith(
      err,
      context,
      'user-9'
    );
    expect(mockAnalytics.updateErrorPattern).toHaveBeenCalledWith(
      'sig-123',
      err,
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      occurrence
    );
    // userId present → user profile updated
    expect(mockAnalytics.updateUserProfile).toHaveBeenCalledWith(
      'user-9',
      'sig-123',
      ErrorCategory.NETWORK
    );
    expect(mockAnalytics.addOccurrence).toHaveBeenCalledWith(occurrence);
    expect(mockReporting.reportError).toHaveBeenCalledWith(
      err,
      ErrorCategory.NETWORK,
      ErrorSeverity.ERROR,
      context,
      'user-9'
    );
    expect(mockAnalytics.generateInsights).toHaveBeenCalledWith('sig-123');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Error tracked with analytics',
      expect.objectContaining({ signature: 'sig-123', eventId: 'event-abc' })
    );
  });

  it('skips updateUserProfile when no userId is provided', () => {
    mockCapture.generateErrorSignature.mockReturnValue('sig-x');
    mockCapture.createErrorOccurrence.mockReturnValue({ id: 'o' });
    mockReporting.reportError.mockReturnValue('e1');

    enhancedErrorAnalytics.trackError(
      new Error('no-user'),
      ErrorCategory.UI_RENDERING,
      ErrorSeverity.WARNING
    );

    expect(mockAnalytics.updateUserProfile).not.toHaveBeenCalled();
    expect(mockAnalytics.addOccurrence).toHaveBeenCalled();
  });

  it('uses default empty context object when context arg omitted', () => {
    mockCapture.generateErrorSignature.mockReturnValue('sig-y');
    mockCapture.createErrorOccurrence.mockReturnValue({ id: 'o2' });
    mockReporting.reportError.mockReturnValue('e2');

    const err = new Error('default-ctx');
    enhancedErrorAnalytics.trackError(
      err,
      ErrorCategory.PERFORMANCE,
      ErrorSeverity.INFO
    );

    expect(mockCapture.generateErrorSignature).toHaveBeenCalledWith(err, {});
  });

  it('returns "" immediately and does no work when analytics disabled', () => {
    enhancedErrorAnalytics.setAnalyticsEnabled(false);

    const id = enhancedErrorAnalytics.trackError(
      new Error('ignored'),
      ErrorCategory.PAYMENT,
      ErrorSeverity.FATAL
    );

    expect(id).toBe('');
    expect(mockCapture.generateErrorSignature).not.toHaveBeenCalled();
    expect(mockReporting.reportError).not.toHaveBeenCalled();
  });

  it('catches collaborator failures, logs them, and returns ""', () => {
    mockCapture.generateErrorSignature.mockImplementation(() => {
      throw new Error('signature failure');
    });

    const id = enhancedErrorAnalytics.trackError(
      new Error('outer'),
      ErrorCategory.DATABASE,
      ErrorSeverity.ERROR
    );

    expect(id).toBe('');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Failed to track error analytics',
      expect.any(Error)
    );
  });
});

describe('addBreadcrumb', () => {
  it('delegates to ErrorCapture with explicit args', () => {
    enhancedErrorAnalytics.addBreadcrumb('nav', 'navigation', 'warning', {
      to: 'X',
    });
    expect(mockCapture.addBreadcrumb).toHaveBeenCalledWith(
      'nav',
      'navigation',
      'warning',
      { to: 'X' }
    );
  });

  it('defaults level to "info" when omitted', () => {
    enhancedErrorAnalytics.addBreadcrumb('tap', 'ui');
    expect(mockCapture.addBreadcrumb).toHaveBeenCalledWith(
      'tap',
      'ui',
      'info',
      undefined
    );
  });
});

describe('trend / pattern / profile delegation', () => {
  it('generateErrorTrends forwards period and returns the analytics result', () => {
    const trend = { period: '7d', data: [], summary: {} };
    mockAnalytics.generateErrorTrends.mockReturnValue(trend);

    expect(enhancedErrorAnalytics.generateErrorTrends('7d')).toBe(trend);
    expect(mockAnalytics.generateErrorTrends).toHaveBeenCalledWith('7d');
  });

  it('generateErrorTrends uses default "24h" period', () => {
    mockAnalytics.generateErrorTrends.mockReturnValue({ period: '24h' });
    enhancedErrorAnalytics.generateErrorTrends();
    expect(mockAnalytics.generateErrorTrends).toHaveBeenCalledWith('24h');
  });

  it('getErrorPatterns forwards options and returns patterns', () => {
    const patterns = [{ id: 'p1' }];
    mockAnalytics.getErrorPatterns.mockReturnValue(patterns);
    const opts = { limit: 5, sortBy: 'frequency' as const };

    expect(enhancedErrorAnalytics.getErrorPatterns(opts)).toBe(patterns);
    expect(mockAnalytics.getErrorPatterns).toHaveBeenCalledWith(opts);
  });

  it('getErrorPatterns uses default empty options', () => {
    mockAnalytics.getErrorPatterns.mockReturnValue([]);
    enhancedErrorAnalytics.getErrorPatterns();
    expect(mockAnalytics.getErrorPatterns).toHaveBeenCalledWith({});
  });

  it('getUserErrorProfiles forwards options and returns profiles', () => {
    const profiles = [{ userId: 'u1' }];
    mockAnalytics.getUserErrorProfiles.mockReturnValue(profiles);
    const opts = { limit: 3, sortBy: 'errorRate' as const };

    expect(enhancedErrorAnalytics.getUserErrorProfiles(opts)).toBe(profiles);
    expect(mockAnalytics.getUserErrorProfiles).toHaveBeenCalledWith(opts);
  });

  it('getUserErrorProfiles uses default empty options', () => {
    mockAnalytics.getUserErrorProfiles.mockReturnValue([]);
    enhancedErrorAnalytics.getUserErrorProfiles();
    expect(mockAnalytics.getUserErrorProfiles).toHaveBeenCalledWith({});
  });

  it('generateAnalyticsReport delegates to analytics', () => {
    mockAnalytics.generateAnalyticsReport.mockReturnValue('REPORT');
    expect(enhancedErrorAnalytics.generateAnalyticsReport()).toBe('REPORT');
  });
});

describe('getAnalyticsStatus', () => {
  it('computes memory estimate from counts and reports enabled state', () => {
    mockAnalytics.getAnalyticsCounts.mockReturnValue({
      patternsCount: 10, // *1000 = 10000
      occurrencesCount: 4, // *500  = 2000
      userProfilesCount: 5, // *200  = 1000
    });
    mockCapture.getBreadcrumbsCount.mockReturnValue(7);

    const status = enhancedErrorAnalytics.getAnalyticsStatus();

    // 10000 + 2000 + 1000 = 13000 bytes → round(13000/1024) = 13
    expect(status).toEqual({
      enabled: true,
      patternsTracked: 10,
      recentOccurrences: 4,
      sessionsTracked: 7,
      userProfiles: 5,
      memoryUsage: '~13KB',
    });
  });

  it('reflects disabled state', () => {
    enhancedErrorAnalytics.setAnalyticsEnabled(false);
    expect(enhancedErrorAnalytics.getAnalyticsStatus().enabled).toBe(false);
  });
});

describe('setAnalyticsEnabled', () => {
  it('propagates enabled=true to reporting and logs', () => {
    enhancedErrorAnalytics.setAnalyticsEnabled(true);
    expect(mockReporting.setReportingEnabled).toHaveBeenLastCalledWith(true);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Analytics enabled'
    );
  });

  it('propagates enabled=false to reporting and logs', () => {
    enhancedErrorAnalytics.setAnalyticsEnabled(false);
    expect(mockReporting.setReportingEnabled).toHaveBeenLastCalledWith(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Analytics disabled'
    );
  });
});

describe('clearAnalyticsData', () => {
  it('clears analytics + breadcrumbs and logs', () => {
    enhancedErrorAnalytics.clearAnalyticsData();
    expect(mockAnalytics.clearAll).toHaveBeenCalledTimes(1);
    expect(mockCapture.clearBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'All analytics data cleared'
    );
  });
});

describe('dispose', () => {
  it('disposes recovery, clears data, disables analytics and logs', () => {
    enhancedErrorAnalytics.dispose();

    expect(mockRecovery.dispose).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.clearAll).toHaveBeenCalledTimes(1);
    expect(mockCapture.clearBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(enhancedErrorAnalytics.getAnalyticsStatus().enabled).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Enhanced error analytics disposed'
    );
  });
});

describe('performCleanup (via the callback registered with ErrorRecovery)', () => {
  it('cleans both analytics and breadcrumbs using a 1-week cutoff and logs counts', () => {
    const NOW = 1_700_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockAnalytics.getAnalyticsCounts.mockReturnValue({
      patternsCount: 2,
      occurrencesCount: 3,
      userProfilesCount: 1,
    });
    mockCapture.getBreadcrumbsCount.mockReturnValue(9);

    // Invoke the cleanup callback captured at module-init time.
    expect(mockCleanupCallback).toBeDefined();
    (mockCleanupCallback as () => void)();

    const expectedCutoff = NOW - 7 * 24 * 60 * 60 * 1000;
    expect(mockAnalytics.performCleanup).toHaveBeenCalledWith(expectedCutoff);
    expect(mockCapture.cleanOldBreadcrumbs).toHaveBeenCalledWith(
      expectedCutoff
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Cleanup completed',
      { patternsCount: 2, occurrencesCount: 3, sessionsCount: 9 }
    );

    nowSpy.mockRestore();
  });
});

describe('legacy compatibility methods', () => {
  it('getErrorAnalytics returns the legacy aggregate shape', () => {
    const result = enhancedErrorAnalytics.getErrorAnalytics() as {
      totalErrors: number;
      errorsByCategory: Record<string, unknown>;
      errorsBySeverity: Record<string, unknown>;
      recentErrors: unknown[];
    };
    expect(result.totalErrors).toBe(0);
    expect(result.errorsByCategory).toEqual({});
    expect(result.errorsBySeverity).toEqual({});
    expect(result.recentErrors).toEqual([]);
  });

  it('recordError logs the payload', () => {
    const payload = { code: 'E1' };
    enhancedErrorAnalytics.recordError(payload);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Recording error',
      payload
    );
  });

  it('recordUserAction logs the payload', () => {
    const payload = { action: 'tap' };
    enhancedErrorAnalytics.recordUserAction(payload);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'EnhancedErrorAnalytics',
      'Recording user action',
      payload
    );
  });

  it('getTrendAnalysis returns the static trend stub', () => {
    expect(enhancedErrorAnalytics.getTrendAnalysis()).toEqual({
      errorTrend: 'stable',
      performanceTrend: 'improving',
      userSatisfactionTrend: 'stable',
    });
  });
});

describe('re-exported types', () => {
  it('re-exports ErrorSeverity / ErrorCategory enums via ErrorTypes', () => {
    // `export * from './ErrorTypes'` should surface the enums.
    // Imported here from the canonical source to assert value parity.
    const mod = require('../index');
    expect(mod.ErrorSeverity.ERROR).toBe('error');
    expect(mod.ErrorCategory.NETWORK).toBe('network');
  });
});

describe('production auto-init branch (__DEV__ === false)', () => {
  it('logs the auto-initializing message when not in dev', () => {
    jest.isolateModules(() => {
      const prevDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;

      jest.doMock('../ErrorCapture', () => ({
        ErrorCapture: jest.fn().mockImplementation(() => mockCapture),
      }));
      jest.doMock('../ErrorReporting', () => ({
        ErrorReporting: jest.fn().mockImplementation(() => mockReporting),
      }));
      jest.doMock('../ErrorAnalytics', () => ({
        ErrorAnalytics: jest.fn().mockImplementation(() => mockAnalytics),
      }));
      jest.doMock('../ErrorRecovery', () => ({
        ErrorRecovery: jest.fn().mockImplementation(() => mockRecovery),
      }));
      // logger stays auto-mocked from the top-level jest.mock('../../logger').
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const freshLogger = require('../../logger').logger as jest.Mocked<
        typeof logger
      >;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../index');

      expect(freshLogger.info).toHaveBeenCalledWith(
        'EnhancedErrorAnalytics',
        'Auto-initializing enhanced error analytics'
      );

      (global as { __DEV__: boolean }).__DEV__ = prevDev;
    });
  });
});
