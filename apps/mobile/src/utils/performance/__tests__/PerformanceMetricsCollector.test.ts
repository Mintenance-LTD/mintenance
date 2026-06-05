/**
 * Tests for PerformanceMetricsCollector
 * Covers metric collection (memory/response/error), aggregation via collectMetrics,
 * budget violation checks, event emission/listeners, and system snapshot.
 */

import { PerformanceMetricsCollector } from '../PerformanceMetricsCollector';
import type {
  PerformanceMetrics,
  PerformanceBudget,
  PerformanceEvent,
} from '../types';

// --- Mock externals only ---------------------------------------------------

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetMemoryUsage = jest.fn();
// `memoryManager` resolves at call time via the getter so a test can null it out
// to exercise the default-fallback branch in getMemoryInfo().
let mockMemoryManagerImpl: unknown = {
  getMemoryUsage: (...args: unknown[]) => mockGetMemoryUsage(...args),
};
jest.mock('../../memoryManager', () => ({
  get memoryManager() {
    return mockMemoryManagerImpl;
  },
}));

import { logger } from '../../logger';

// --- Helpers ---------------------------------------------------------------

const originalPerformance = global.performance;

function setPerformance(value: unknown): void {
  Object.defineProperty(global, 'performance', {
    value,
    configurable: true,
    writable: true,
  });
}

function buildMetrics(
  overrides: Partial<PerformanceMetrics> = {}
): PerformanceMetrics {
  return {
    serviceName: 'svc',
    timestamp: 1000,
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    apiCallsPerMinute: 0,
    errorRate: 0,
    downloadSize: 0,
    budgetViolations: [],
    ...overrides,
  };
}

describe('PerformanceMetricsCollector', () => {
  let randomSpy: jest.SpyInstance;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Deterministic Math.random for estimate/error-rate paths.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    mockGetMemoryUsage.mockResolvedValue({
      used: 10,
      total: 20,
      limit: 30,
      percentage: 50,
      timestamp: 0,
      componentCounts: {},
      listenerCounts: {},
    });
  });

  afterEach(() => {
    randomSpy.mockRestore();
    nowSpy.mockRestore();
    setPerformance(originalPerformance);
    mockMemoryManagerImpl = {
      getMemoryUsage: (...args: unknown[]) => mockGetMemoryUsage(...args),
    };
  });

  // --- constructor / initializeDefaultCollectors --------------------------

  it('initializes default collectors and logs', () => {
    new PerformanceMetricsCollector();
    expect(logger.info).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Default collectors initialized',
      { collectorCount: 3 }
    );
  });

  // --- registerCollector ---------------------------------------------------

  it('registers a custom collector and logs', () => {
    const collector = new PerformanceMetricsCollector();
    const custom = jest.fn().mockResolvedValue({ cpuUsage: 42 });
    collector.registerCollector('cpu', custom);
    expect(logger.info).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Custom collector registered',
      { name: 'cpu' }
    );
  });

  // --- collectMetrics (aggregation) ---------------------------------------

  it('collects and aggregates metrics from all default collectors (perf.memory + navigation)', async () => {
    setPerformance({
      memory: {
        usedJSHeapSize: 8 * 1024 * 1024, // 8 MB
        totalJSHeapSize: 16 * 1024 * 1024,
        jsHeapSizeLimit: 32 * 1024 * 1024,
      },
      getEntriesByType: (type: string) =>
        type === 'navigation' ? [{ responseEnd: 250, requestStart: 100 }] : [],
    });

    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('my-service');

    expect(metrics.serviceName).toBe('my-service');
    expect(metrics.timestamp).toBe(1234567890);
    expect(metrics.budgetViolations).toEqual([]);
    expect(metrics.memoryUsage).toBe(8); // 8MB
    expect(metrics.responseTime).toBe(150); // 250 - 100
    // errorRate = Math.random()*2 = 0.5*2 = 1
    expect(metrics.errorRate).toBe(1);
  });

  it('includes results from a custom registered collector', async () => {
    setPerformance(undefined);
    const collector = new PerformanceMetricsCollector();
    collector.registerCollector('cpu', async () => ({ cpuUsage: 77 }));
    const metrics = await collector.collectMetrics('svc');
    expect(metrics.cpuUsage).toBe(77);
  });

  it('handles a throwing collector gracefully and continues', async () => {
    setPerformance(undefined);
    const collector = new PerformanceMetricsCollector();
    collector.registerCollector('boom', async () => {
      throw new Error('collector failure');
    });
    const metrics = await collector.collectMetrics('svc');
    // Other collectors still produced values.
    expect(metrics.serviceName).toBe('svc');
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Failed to collect boom metrics',
      { error: 'collector failure' }
    );
  });

  it('handles a throwing collector with a non-Error value', async () => {
    setPerformance(undefined);
    const collector = new PerformanceMetricsCollector();
    collector.registerCollector('weird', async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'string-error';
    });
    await collector.collectMetrics('svc');
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Failed to collect weird metrics',
      { error: 'string-error' }
    );
  });

  // --- collectMemoryMetrics via collectMetrics paths ----------------------

  it('memory metrics fall back to memoryManager when performance.memory absent', async () => {
    setPerformance({}); // no .memory, no getEntriesByType
    mockGetMemoryUsage.mockResolvedValue({
      used: 5,
      total: 10,
      limit: 15,
      percentage: 50,
      timestamp: 0,
      componentCounts: {},
      listenerCounts: {},
    });
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    // used 5MB -> bytes -> /1MB == 5
    expect(metrics.memoryUsage).toBe(5);
  });

  it('memory metrics return 0 when getMemoryInfo throws', async () => {
    setPerformance({}); // forces memoryManager path
    mockGetMemoryUsage.mockRejectedValue(new Error('mm fail'));
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    expect(metrics.memoryUsage).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Failed to collect memory metrics',
      { error: 'mm fail' }
    );
  });

  it('memoryManager limit defaults to 0 when undefined', async () => {
    setPerformance({});
    mockGetMemoryUsage.mockResolvedValue({
      used: 3,
      total: 6,
      // limit undefined -> ?? 0
      percentage: 50,
      timestamp: 0,
      componentCounts: {},
      listenerCounts: {},
    });
    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    expect(snapshot.memory.jsHeapSizeLimit).toBe(0);
    expect(snapshot.memory.usedJSHeapSize).toBe(3 * 1024 * 1024);
  });

  it('default-fallback memory (all zeros) when memoryManager unavailable', async () => {
    setPerformance({}); // no perf.memory
    mockMemoryManagerImpl = null; // force final default branch in getMemoryInfo
    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    expect(snapshot.memory).toEqual({
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    });
  });

  it('uses performance.memory with falsy fields defaulting to 0', async () => {
    setPerformance({
      memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      },
    });
    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    expect(snapshot.memory).toEqual({
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    });
  });

  // --- collectResponseTimeMetrics branches --------------------------------

  it('response time uses estimate fallback when no navigation entries', async () => {
    setPerformance({
      getEntriesByType: () => [], // empty navigation entries
    });
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    // estimate = 100 + random(0.5)*200 = 100 + 100 = 200
    expect(metrics.responseTime).toBe(200);
  });

  it('response time uses estimate fallback when performance is undefined', async () => {
    setPerformance(undefined);
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    expect(metrics.responseTime).toBe(200);
  });

  it('response time clamps negative values to 0 via Math.max', async () => {
    setPerformance({
      getEntriesByType: (type: string) =>
        type === 'navigation'
          ? [{ responseEnd: 50, requestStart: 200 }] // negative
          : [],
    });
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    expect(metrics.responseTime).toBe(0);
  });

  it('response time returns 0 when getEntriesByType throws', async () => {
    setPerformance({
      getEntriesByType: () => {
        throw new Error('entries fail');
      },
    });
    const collector = new PerformanceMetricsCollector();
    const metrics = await collector.collectMetrics('svc');
    expect(metrics.responseTime).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Failed to collect response time metrics',
      { error: 'entries fail' }
    );
  });

  // --- checkBudgetViolations ----------------------------------------------

  it('returns no violations when all metrics within budget', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({
      responseTime: 10,
      memoryUsage: 10,
      cpuUsage: 10,
      apiCallsPerMinute: 10,
      errorRate: 1,
      downloadSize: 10,
    });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 100,
        memoryUsage: 100,
        cpuUsage: 100,
        apiCalls: 100,
        errorRate: 100,
        downloadSize: 100,
      },
    };
    expect(collector.checkBudgetViolations(metrics, budget)).toEqual([]);
  });

  it('flags a warning-severity violation', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({ responseTime: 185 });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 100,
        memoryUsage: 1e9,
        cpuUsage: 1e9,
        apiCalls: 1e9,
        errorRate: 1e9,
        downloadSize: 1e9,
      },
      alertThresholds: { warning: 80, critical: 100 },
    };
    const violations = collector.checkBudgetViolations(metrics, budget);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      metric: 'responseTime',
      actual: 185,
      budget: 100,
      severity: 'warning', // 85% >= 80, < 100
      violationPercentage: 85,
    });
  });

  it('flags a critical-severity violation', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({ memoryUsage: 300 });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 1e9,
        memoryUsage: 100,
        cpuUsage: 1e9,
        apiCalls: 1e9,
        errorRate: 1e9,
        downloadSize: 1e9,
      },
      alertThresholds: { warning: 80, critical: 100 },
    };
    const violations = collector.checkBudgetViolations(metrics, budget);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe('critical'); // 200% >= 100
    expect(violations[0].violationPercentage).toBe(200);
  });

  it('keeps warning severity when below warning threshold (else-if not entered)', () => {
    const collector = new PerformanceMetricsCollector();
    // 10% over budget -> below warning threshold of 80, stays 'warning' default
    const metrics = buildMetrics({ cpuUsage: 110 });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 1e9,
        memoryUsage: 1e9,
        cpuUsage: 100,
        apiCalls: 1e9,
        errorRate: 1e9,
        downloadSize: 1e9,
      },
      alertThresholds: { warning: 80, critical: 100 },
    };
    const violations = collector.checkBudgetViolations(metrics, budget);
    expect(violations[0].metric).toBe('cpuUsage');
    expect(violations[0].severity).toBe('warning');
    expect(violations[0].violationPercentage).toBeCloseTo(10);
  });

  it('uses default thresholds (100/80) when alertThresholds missing', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({ apiCallsPerMinute: 250 });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 1e9,
        memoryUsage: 1e9,
        cpuUsage: 1e9,
        apiCalls: 100,
        errorRate: 1e9,
        downloadSize: 1e9,
      },
    };
    const violations = collector.checkBudgetViolations(metrics, budget);
    // 150% >= default critical 100
    expect(violations[0].metric).toBe('apiCalls');
    expect(violations[0].severity).toBe('critical');
  });

  it('uses budget 0 when budgets object is missing (all over budget)', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({
      responseTime: 1,
      memoryUsage: 1,
      cpuUsage: 1,
      apiCallsPerMinute: 1,
      errorRate: 1,
      downloadSize: 1,
    });
    const budget: PerformanceBudget = {}; // no budgets -> all default 0
    const violations = collector.checkBudgetViolations(metrics, budget);
    // every actual (1) > 0; violationPercentage = (1-0)/0*100 = Infinity
    expect(violations).toHaveLength(6);
    violations.forEach((v) => {
      expect(v.budget).toBe(0);
      expect(v.violationPercentage).toBe(Infinity);
      expect(v.severity).toBe('critical');
    });
  });

  it('flags downloadSize and errorRate violations specifically', () => {
    const collector = new PerformanceMetricsCollector();
    const metrics = buildMetrics({ downloadSize: 500, errorRate: 50 });
    const budget: PerformanceBudget = {
      budgets: {
        responseTime: 1e9,
        memoryUsage: 1e9,
        cpuUsage: 1e9,
        apiCalls: 1e9,
        errorRate: 10,
        downloadSize: 100,
      },
      alertThresholds: { warning: 80, critical: 100 },
    };
    const violations = collector.checkBudgetViolations(metrics, budget);
    const metricsFlagged = violations.map((v) => v.metric).sort();
    expect(metricsFlagged).toEqual(['downloadSize', 'errorRate']);
  });

  // --- emitPerformanceEvent / listeners -----------------------------------

  it('emits events to all registered listeners and logs', () => {
    const collector = new PerformanceMetricsCollector();
    const l1 = jest.fn();
    const l2 = jest.fn();
    collector.addEventListener('a', l1);
    collector.addEventListener('b', l2);

    const event: PerformanceEvent = {
      type: 'spike',
      serviceName: 'svc',
      timestamp: 999,
      data: { foo: 'bar' },
    };
    collector.emitPerformanceEvent(event);

    expect(l1).toHaveBeenCalledWith(event);
    expect(l2).toHaveBeenCalledWith(event);
    expect(logger.info).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Performance event emitted',
      { type: 'spike', serviceName: 'svc', timestamp: 999 }
    );
  });

  it('continues emitting when a listener throws and logs the failure', () => {
    const collector = new PerformanceMetricsCollector();
    const good = jest.fn();
    collector.addEventListener('bad', () => {
      throw new Error('listener boom');
    });
    collector.addEventListener('good', good);

    const event: PerformanceEvent = {
      type: 'x',
      serviceName: 's',
      timestamp: 1,
      data: {},
    };
    collector.emitPerformanceEvent(event);

    expect(good).toHaveBeenCalledWith(event);
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Event listener bad failed',
      { error: 'listener boom' }
    );
  });

  it('handles a non-Error thrown by a listener', () => {
    const collector = new PerformanceMetricsCollector();
    collector.addEventListener('bad', () => {
      // eslint-disable-next-line no-throw-literal
      throw 'plain';
    });
    collector.emitPerformanceEvent({
      type: 'x',
      serviceName: 's',
      timestamp: 1,
      data: {},
    });
    expect(logger.error).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Event listener bad failed',
      { error: 'plain' }
    );
  });

  it('removes an event listener so it no longer fires', () => {
    const collector = new PerformanceMetricsCollector();
    const l = jest.fn();
    collector.addEventListener('rm', l);
    collector.removeEventListener('rm');
    expect(logger.info).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Event listener removed',
      { name: 'rm' }
    );
    collector.emitPerformanceEvent({
      type: 'x',
      serviceName: 's',
      timestamp: 1,
      data: {},
    });
    expect(l).not.toHaveBeenCalled();
  });

  it('logs when adding an event listener', () => {
    const collector = new PerformanceMetricsCollector();
    collector.addEventListener('reg', jest.fn());
    expect(logger.info).toHaveBeenCalledWith(
      'PerformanceMetricsCollector',
      'Event listener registered',
      { name: 'reg' }
    );
  });

  // --- getSystemSnapshot --------------------------------------------------

  it('returns full system snapshot with timing and resources', async () => {
    const timing = { navigationStart: 1 } as unknown as PerformanceTiming;
    const resourceList = [{ name: 'res1' }];
    setPerformance({
      memory: {
        usedJSHeapSize: 1024 * 1024,
        totalJSHeapSize: 2 * 1024 * 1024,
        jsHeapSizeLimit: 4 * 1024 * 1024,
      },
      timing,
      getEntriesByType: (type: string) =>
        type === 'resource' ? resourceList : [],
    });

    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    expect(snapshot.memory.usedJSHeapSize).toBe(1024 * 1024);
    expect(snapshot.timing).toBe(timing);
    expect(snapshot.resources).toBe(resourceList);
  });

  it('snapshot timing null when performance.timing absent', async () => {
    setPerformance({
      memory: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      },
      // no timing, no getEntriesByType
    });
    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    expect(snapshot.timing).toBeNull();
    expect(snapshot.resources).toEqual([]);
  });

  it('snapshot when performance is entirely undefined', async () => {
    setPerformance(undefined);
    const collector = new PerformanceMetricsCollector();
    const snapshot = await collector.getSystemSnapshot();
    // memory comes from memoryManager fallback (used 10MB)
    expect(snapshot.memory.usedJSHeapSize).toBe(10 * 1024 * 1024);
    expect(snapshot.timing).toBeNull();
    expect(snapshot.resources).toEqual([]);
  });
});
