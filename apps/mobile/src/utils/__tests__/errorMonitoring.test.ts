/**
 * Unit tests for ErrorMonitoringSystem (utils/errorMonitoring.ts)
 *
 * Mocks ONLY externals: logger, memoryManager, AsyncStorage.
 * The unit under test (the singleton + helpers) is exercised directly.
 */

import React from 'react';

// ---- Mock externals BEFORE importing the unit under test ----

jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetCurrentMemoryUsage = jest.fn();
jest.mock('../memoryManager', () => ({
  memoryManager: {
    getCurrentMemoryUsage: (...args: unknown[]) =>
      mockGetCurrentMemoryUsage(...args),
  },
}));

// AsyncStorage in-memory mock with controllable failure modes
const asyncStore = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => asyncStore.get(key) ?? null);
const mockSetItem = jest.fn(async (key: string, value: string) => {
  asyncStore.set(key, value);
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

// Import after mocks are registered.
import {
  errorMonitoring,
  withErrorMonitoring,
  useErrorReporting,
  ErrorReport,
} from '../errorMonitoring';
import { logger } from '../logger';

const mockedLogger = logger as jest.Mocked<typeof logger>;

/**
 * The system keeps an internal errorReports array. There is no public reset,
 * so we clear it between tests via clearOldErrors with a future cutoff plus a
 * direct prune of all reports through the metrics path. We reset by removing
 * everything: set timestamps in the past and resolved, then clearOldErrors(0).
 */
async function resetReports(): Promise<void> {
  // Mark every report resolved + ancient so clearOldErrors(0) removes them.
  const all = errorMonitoring.getAllErrors();
  for (const r of all) {
    await errorMonitoring.resolveError(r.id);
  }
  // clearOldErrors keeps reports newer than cutoff OR unresolved.
  // With olderThanDays = -1, cutoff is in the FUTURE so timestamp > cutoff is
  // false for all; resolved ones get dropped.
  await errorMonitoring.clearOldErrors(-1);
}

beforeEach(async () => {
  jest.clearAllMocks();
  asyncStore.clear();
  mockGetCurrentMemoryUsage.mockResolvedValue({ used: 12345, total: 99999 });
  // Restore default config (enable everything) and clear state.
  errorMonitoring.configure({
    enableAutoReporting: true,
    enableUserFeedback: true,
    enableMemoryTracking: true,
    maxStoredErrors: 1000,
    enableRetryMechanism: true,
    retryAttempts: 3,
  });
  await resetReports();
  jest.clearAllMocks();
  mockGetCurrentMemoryUsage.mockResolvedValue({ used: 12345, total: 99999 });
});

describe('ErrorMonitoringSystem singleton', () => {
  it('exposes the singleton with reportError', () => {
    expect(errorMonitoring).toBeDefined();
    expect(typeof errorMonitoring.reportError).toBe('function');
  });
});

describe('reportError - happy path & enrichment', () => {
  it('creates a new report, persists it, and returns an error id', async () => {
    const id = await errorMonitoring.reportError(new Error('Boom happened'), {
      type: 'network',
      severity: 'high',
      userId: 'user-1',
      context: { screen: 'Home' },
    });

    expect(id).toMatch(/^error_/);
    expect(id).not.toBe('error_reporting_failed');

    const all = errorMonitoring.getAllErrors();
    const report = all.find((r) => r.id === id) as ErrorReport;
    expect(report).toBeDefined();
    expect(report.message).toBe('Boom happened');
    expect(report.type).toBe('network');
    expect(report.severity).toBe('high');
    expect(report.userId).toBe('user-1');
    expect(report.count).toBe(1);
    expect(report.resolved).toBe(false);
    // enriched context
    expect(report.context.networkStatus).toBe('online');
    expect(report.context.buildVersion).toBe('1.1.0');
    expect(report.context.memoryUsage).toBe(12345);
    expect(report.context.deviceInfo?.platform).toBe('react-native');

    // persisted to storage
    expect(mockSetItem).toHaveBeenCalledWith(
      '@mintenance/error_reports',
      expect.any(String)
    );
    // logged
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reported: Boom happened'),
      expect.any(Error),
      expect.objectContaining({ errorId: id })
    );
  });

  it('accepts a string error and wraps it in an Error', async () => {
    const id = await errorMonitoring.reportError('plain string failure');
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);
    expect(report?.message).toBe('plain string failure');
    expect(report?.type).toBe('javascript'); // default type
  });

  it('defaults type to javascript and derives severity when not provided', async () => {
    const id = await errorMonitoring.reportError(new Error('plain error'));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);
    expect(report?.type).toBe('javascript');
    expect(report?.severity).toBe('medium'); // default branch of determineSeverity
  });
});

describe('reportError - deduplication', () => {
  it('increments count instead of creating a duplicate for the same error', async () => {
    const err = new Error('Duplicate error');
    const ctx = { screen: 'Dash', component: 'Card' };

    const id1 = await errorMonitoring.reportError(err, { context: ctx });
    const id2 = await errorMonitoring.reportError(err, { context: ctx });

    expect(id1).toBe(id2);
    const matching = errorMonitoring.getAllErrors().filter((r) => r.id === id1);
    expect(matching).toHaveLength(1);
    expect(matching[0].count).toBe(2);
  });
});

describe('reportError - auto reporting branch', () => {
  it('auto-reports critical errors via logger.error', async () => {
    await errorMonitoring.reportError(new Error('out of memory detected'), {
      // severity will be derived as critical from message
    });

    // determineSeverity => 'critical' for "out of memory"
    const critical = errorMonitoring
      .getAllErrors()
      .find((r) => r.message === 'out of memory detected');
    expect(critical?.severity).toBe('critical');

    // autoReportError logs a critical error with the report context
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Critical error auto-reported:',
      expect.any(Error),
      expect.objectContaining({ errorId: critical?.id })
    );
  });

  it('does not auto-report when auto reporting is disabled', async () => {
    errorMonitoring.configure({ enableAutoReporting: false });
    mockedLogger.error.mockClear();

    await errorMonitoring.reportError(new Error('out of memory again'));

    // The only logger.error allowed is the "Error reported:" line, never the
    // "Critical error auto-reported:" line.
    const autoCalls = mockedLogger.error.mock.calls.filter(
      (c) => c[0] === 'Critical error auto-reported:'
    );
    expect(autoCalls).toHaveLength(0);
  });
});

describe('reportError - memory tracking branch', () => {
  it('skips memory usage enrichment when tracking disabled', async () => {
    errorMonitoring.configure({ enableMemoryTracking: false });
    mockGetCurrentMemoryUsage.mockClear();

    const id = await errorMonitoring.reportError(new Error('no mem track'));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);

    expect(mockGetCurrentMemoryUsage).not.toHaveBeenCalled();
    expect(report?.context.memoryUsage).toBeUndefined();
  });

  it('warns and continues when memory usage lookup throws', async () => {
    mockGetCurrentMemoryUsage.mockRejectedValueOnce(new Error('mem fail'));

    const id = await errorMonitoring.reportError(new Error('mem throws'));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);

    expect(report).toBeDefined();
    expect(report?.context.memoryUsage).toBeUndefined();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Failed to get memory usage for error context:',
      expect.objectContaining({ data: expect.any(Error) })
    );
  });
});

describe('reportError - failure path', () => {
  it('returns error_reporting_failed and logs when persistence path throws hard', async () => {
    // Force enrichErrorContext to throw by making memory tracking enabled and
    // getCurrentMemoryUsage reject is caught; instead break saveErrorReports
    // by making setItem throw AND getCurrentMemoryUsage throw a non-Error so
    // the outer try/catch in reportError is hit. The cleanest deterministic
    // failure: make Date.now throw inside the try via a spy.
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('clock exploded');
    });

    const result = await errorMonitoring.reportError(new Error('will fail'));

    expect(result).toBe('error_reporting_failed');
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Failed to report error:',
      expect.any(Error)
    );

    dateSpy.mockRestore();
  });
});

describe('determineSeverity (via reportError message classification)', () => {
  const cases: Array<[string, ErrorReport['severity']]> = [
    ['Network request failed', 'medium'],
    ['Request timeout occurred', 'medium'],
    ['error in fetch handler', 'medium'], // stack/message fetch -> medium
    ['memory allocation failure', 'critical'],
    ['out of memory', 'critical'],
    ['security violation', 'high'],
    ['permission denied', 'high'],
    ['unauthorized access', 'high'],
    ['deprecated API used', 'low'],
    ['warning: something', 'low'],
    ['totally generic problem', 'medium'],
  ];

  it.each(cases)('classifies %s as %s', async (message, expected) => {
    const id = await errorMonitoring.reportError(new Error(message));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);
    expect(report?.severity).toBe(expected);
  });
});

describe('error handler registration', () => {
  it('notifies registered handlers and returns an unsubscribe function', async () => {
    const handler = jest.fn();
    const unsubscribe = errorMonitoring.registerErrorHandler(handler);

    await errorMonitoring.reportError(new Error('notify me'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'notify me' })
    );

    unsubscribe();
    handler.mockClear();
    await errorMonitoring.reportError(new Error('after unsubscribe'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('isolates a throwing handler and logs a warning', async () => {
    const bad = jest.fn(() => {
      throw new Error('handler boom');
    });
    const good = jest.fn();
    const offBad = errorMonitoring.registerErrorHandler(bad);
    const offGood = errorMonitoring.registerErrorHandler(good);

    await errorMonitoring.reportError(new Error('with bad handler'));

    expect(good).toHaveBeenCalledTimes(1);
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Error handler failed:',
      expect.objectContaining({ data: expect.any(Error) })
    );

    offBad();
    offGood();
  });
});

describe('resolveError', () => {
  it('marks an existing error resolved and persists', async () => {
    const id = await errorMonitoring.reportError(new Error('resolve me'));
    mockSetItem.mockClear();

    const ok = await errorMonitoring.resolveError(id);
    expect(ok).toBe(true);
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);
    expect(report?.resolved).toBe(true);
    expect(mockSetItem).toHaveBeenCalled();
  });

  it('returns false for an unknown error id', async () => {
    const ok = await errorMonitoring.resolveError('does-not-exist');
    expect(ok).toBe(false);
  });
});

describe('getErrorMetrics', () => {
  it('aggregates counts, types, severities and top errors', async () => {
    const a = await errorMonitoring.reportError(new Error('network down'), {
      type: 'network',
    }); // medium
    // duplicate to bump count
    await errorMonitoring.reportError(new Error('network down'), {
      type: 'network',
    });
    const b = await errorMonitoring.reportError(new Error('out of memory'), {
      type: 'system',
    }); // critical
    await errorMonitoring.resolveError(b);

    const metrics = errorMonitoring.getErrorMetrics();
    expect(metrics.uniqueErrors).toBe(2);
    expect(metrics.totalErrors).toBe(3); // 2 + 1
    expect(metrics.criticalErrors).toBe(1);
    expect(metrics.resolvedErrors).toBe(1);
    expect(metrics.errorsByType.network).toBe(2);
    expect(metrics.errorsByType.system).toBe(1);
    expect(metrics.errorsBySeverity.medium).toBe(2);
    expect(metrics.errorsBySeverity.critical).toBe(1);
    expect(metrics.errorRate).toBeCloseTo(3 / 2);
    expect(metrics.topErrors[0].id).toBe(a); // highest count first
    expect(metrics.trends).toEqual({ daily: [], weekly: [], monthly: [] });
  });

  it('filters by time range', async () => {
    const id = await errorMonitoring.reportError(new Error('range test'));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id)!;
    const ts = report.timestamp;

    const inRange = errorMonitoring.getErrorMetrics({
      start: ts - 1000,
      end: ts + 1000,
    });
    expect(inRange.uniqueErrors).toBe(1);

    const outOfRange = errorMonitoring.getErrorMetrics({
      start: ts + 10_000,
      end: ts + 20_000,
    });
    expect(outOfRange.uniqueErrors).toBe(0);
    expect(outOfRange.errorRate).toBe(0); // totalErrors 0 / (uniqueErrors||1)
  });
});

describe('clearOldErrors', () => {
  it('removes resolved reports older than the cutoff and returns the count', async () => {
    const id = await errorMonitoring.reportError(new Error('old resolved'));
    await errorMonitoring.resolveError(id);

    // Push the timestamp into the past so it is older than the 30d cutoff.
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id)!;
    report.timestamp = Date.now() - 40 * 24 * 60 * 60 * 1000;

    const cleared = await errorMonitoring.clearOldErrors(30);
    expect(cleared).toBe(1);
    expect(
      errorMonitoring.getAllErrors().find((r) => r.id === id)
    ).toBeUndefined();
  });

  it('keeps unresolved errors even when old', async () => {
    const id = await errorMonitoring.reportError(new Error('old unresolved'));
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id)!;
    report.timestamp = Date.now() - 40 * 24 * 60 * 60 * 1000;

    const cleared = await errorMonitoring.clearOldErrors(30);
    expect(cleared).toBe(0);
    expect(
      errorMonitoring.getAllErrors().find((r) => r.id === id)
    ).toBeDefined();
  });
});

describe('generateErrorReport', () => {
  it('produces a summary with critical + high-error-rate recommendations', async () => {
    // 6 distinct critical errors -> errorRate would be 6/6 = 1, so to trip the
    // errorRate>5 branch we bump one error's count high via duplicates.
    const err = new Error('out of memory loop');
    for (let i = 0; i < 7; i++) {
      await errorMonitoring.reportError(err, { context: { screen: 's' } });
    }

    const report = errorMonitoring.generateErrorReport();
    expect(report.summary).toContain('total errors');
    expect(report.summary).toContain('critical');
    expect(report.recommendations).toContain(
      'Address critical errors immediately'
    );
    expect(report.recommendations).toContain(
      'High error rate detected - review error patterns'
    );
    // dominant type branch (>30% of total) — single type so it fires
    expect(report.recommendations.some((r) => r.startsWith('Focus on'))).toBe(
      true
    );
    expect(report.metrics.criticalErrors).toBeGreaterThan(0);
  });

  it('produces a clean summary with no recommendations when healthy', async () => {
    const report = errorMonitoring.generateErrorReport();
    expect(report.summary).toContain('0 total errors');
    expect(report.recommendations).toHaveLength(0);
  });
});

describe('global console.error handler (installed in constructor)', () => {
  it('reports Error arguments passed through the patched console.error', async () => {
    const reportSpy = jest.spyOn(errorMonitoring, 'reportError');
    const err = new Error('console captured failure');

    // The constructor patched console.error to forward Errors into the system.
    // eslint-disable-next-line no-console
    console.error(err);
    // allow the async reportError to settle
    await new Promise((r) => setImmediate(r));

    expect(reportSpy).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        type: 'javascript',
        severity: 'high',
        context: expect.objectContaining({ source: 'console.error' }),
      })
    );
    reportSpy.mockRestore();
  });

  it('ignores non-Error arguments passed to console.error', async () => {
    const reportSpy = jest.spyOn(errorMonitoring, 'reportError');
    // eslint-disable-next-line no-console
    console.error('just a string, not an Error');
    await new Promise((r) => setImmediate(r));
    expect(reportSpy).not.toHaveBeenCalled();
    reportSpy.mockRestore();
  });
});

describe('configure', () => {
  it('merges options and logs', async () => {
    errorMonitoring.configure({ maxStoredErrors: 5 });
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      'Error monitoring configured',
      expect.objectContaining({
        options: expect.objectContaining({ maxStoredErrors: 5 }),
      })
    );
  });

  it('caps stored errors at maxStoredErrors on save', async () => {
    errorMonitoring.configure({ maxStoredErrors: 3 });
    for (let i = 0; i < 6; i++) {
      await errorMonitoring.reportError(new Error(`capped ${i}`));
    }
    expect(errorMonitoring.getAllErrors().length).toBeLessThanOrEqual(3);
  });
});

describe('saveErrorReports failure path', () => {
  it('warns when AsyncStorage.setItem rejects', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('storage full'));
    await errorMonitoring.reportError(new Error('storage will fail'));
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Failed to save error reports:',
      expect.objectContaining({ data: expect.any(Error) })
    );
  });
});

describe('getAllErrors', () => {
  it('returns a defensive copy', async () => {
    await errorMonitoring.reportError(new Error('copy test'));
    const a = errorMonitoring.getAllErrors();
    const b = errorMonitoring.getAllErrors();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('withErrorMonitoring HOC', () => {
  // No DOM/native renderer is available in this jest env, so we drive the
  // generated error-boundary class component through its lifecycle methods
  // directly (constructor -> render -> getDerivedStateFromError ->
  // componentDidCatch -> render). React.createElement is still real.

  function instantiate(Wrapped: any, props: Record<string, unknown> = {}) {
    const instance = new Wrapped(props);
    instance.props = props;
    return instance;
  }

  it('renders the wrapped component element in the no-error state', () => {
    const Child: React.FC<{ label: string }> = ({ label }) =>
      React.createElement('span', null, label);
    const Wrapped: any = withErrorMonitoring(Child, 'MyChild');

    const instance = instantiate(Wrapped, { label: 'hi' });
    expect(instance.state.hasError).toBe(false);

    const element = instance.render();
    expect(element.type).toBe(Child);
    expect(element.props.label).toBe('hi');
  });

  it('getDerivedStateFromError flips hasError to true', () => {
    const Child: React.FC = () => null;
    const Wrapped: any = withErrorMonitoring(Child, 'C');
    expect(Wrapped.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  it('componentDidCatch reports the error with the component context', () => {
    const reportSpy = jest.spyOn(errorMonitoring, 'reportError');
    const Child: React.FC = () => null;
    const Wrapped: any = withErrorMonitoring(Child, 'BoomComp');

    const instance = instantiate(Wrapped, { secret: 'x' });
    const err = new Error('render exploded');
    instance.componentDidCatch(err, { componentStack: 'at BoomComp' });

    expect(reportSpy).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        type: 'javascript',
        severity: 'high',
        context: expect.objectContaining({
          component: 'BoomComp',
          componentStack: 'at BoomComp',
          props: expect.objectContaining({ secret: 'x' }),
        }),
      })
    );
    reportSpy.mockRestore();
  });

  it('renders the fallback element once hasError is true', () => {
    const Child: React.FC = () => null;
    const Wrapped: any = withErrorMonitoring(Child, 'FallbackComp');
    const instance = instantiate(Wrapped);
    instance.state = { hasError: true };

    const element = instance.render();
    expect(element.type).toBe('div');
    expect(element.props.children).toBe('Error in FallbackComp component');
  });

  it('handles a missing componentStack', () => {
    const reportSpy = jest.spyOn(errorMonitoring, 'reportError');
    const Child: React.FC = () => null;
    const Wrapped: any = withErrorMonitoring(Child, 'NoStack');
    const instance = instantiate(Wrapped);
    instance.componentDidCatch(new Error('x'), {} as React.ErrorInfo);

    expect(reportSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({ componentStack: '' }),
      })
    );
    reportSpy.mockRestore();
  });

  it('derives a component name from displayName when none supplied', () => {
    const Named: React.FC = () => null;
    Named.displayName = 'DerivedName';
    const Wrapped: any = withErrorMonitoring(Named);
    const instance = instantiate(Wrapped);
    instance.state = { hasError: true };
    const element = instance.render();
    expect(element.props.children).toBe('Error in DerivedName component');
  });

  it('falls back to "Unknown" when no name is available', () => {
    // Arrow function with name stripped to force the Unknown branch.
    const anon: any = () => null;
    Object.defineProperty(anon, 'name', { value: '' });
    const Wrapped: any = withErrorMonitoring(anon);
    const instance = instantiate(Wrapped);
    instance.state = { hasError: true };
    expect(instance.render().props.children).toBe('Error in Unknown component');
  });
});

describe('useErrorReporting hook', () => {
  // Drive the hook outside a renderer by stubbing React.useCallback to return
  // the callback unchanged (its real semantics in this single-call context).
  let useCallbackSpy: jest.SpyInstance;

  beforeAll(() => {
    useCallbackSpy = jest
      .spyOn(React, 'useCallback')
      .mockImplementation((fn: any) => fn);
  });

  afterAll(() => {
    useCallbackSpy.mockRestore();
  });

  it('returns reportError, metrics and clearOldErrors bound to the singleton', async () => {
    const hookValue = useErrorReporting();

    expect(hookValue).toBeDefined();
    expect(typeof hookValue.reportError).toBe('function');
    expect(hookValue.metrics).toHaveProperty('totalErrors');
    expect(typeof hookValue.clearOldErrors).toBe('function');

    const id = await hookValue.reportError(new Error('via hook'), {
      type: 'user',
    });
    expect(id).toMatch(/^error_/);
    const report = errorMonitoring.getAllErrors().find((r) => r.id === id);
    expect(report?.type).toBe('user');
  });
});
