/**
 * Comprehensive unit tests for the orchestrator PerformanceMonitor
 * (apps/mobile/src/utils/performance/PerformanceMonitor.ts).
 *
 * The unit under test (PerformanceMonitor) AND its real siblings
 * (MetricsCollector, BudgetEnforcer, BudgetRuleManager, Reporter) are exercised
 * for real to maximise true function/statement coverage. Only the platform
 * externals are mocked, all of which are already provided by the mobile jest
 * setup (globalMocks + manual mocks):
 *   - react-native (DeviceEventEmitter) — global manual mock
 *   - @react-native-async-storage/async-storage — global manual mock
 *   - ../logger — spied on so we can assert warn() fires on critical violations
 *
 * Date.now is spied to drive the report time-range / violation-cooldown logic
 * deterministically, and fake timers + --forceExit guard the constructor's
 * 30s periodic-report setInterval.
 */

import { logger } from '../../logger';
import { DeviceEventEmitter } from 'react-native';
import { PerformanceMonitor, performanceMonitor } from '../PerformanceMonitor';
import type { BudgetEnforcementRule, PerformanceMetric } from '../types';

jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never);
jest.spyOn(logger, 'info').mockImplementation(() => undefined as never);
jest.spyOn(logger, 'debug').mockImplementation(() => undefined as never);
jest.spyOn(logger, 'error').mockImplementation(() => undefined as never);

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockEmit = DeviceEventEmitter.emit as jest.Mock;

const makeRule = (
  over: Partial<BudgetEnforcementRule> = {}
): BudgetEnforcementRule => ({
  id: 'custom_rule',
  name: 'Custom Rule',
  metric: 'custom_metric',
  target: 100,
  warning: 200,
  critical: 300,
  unit: 'ms',
  category: 'performance',
  enabled: true,
  comparison: 'less_than',
  enforcement: 'warn',
  ...over,
});

describe('PerformanceMonitor (orchestrator)', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Operate on the real singleton; reset its collected state each test.
    monitor = PerformanceMonitor.getInstance();
    monitor.setEnabled(true);
    monitor.setEnforcementEnabled(true);
    monitor.clearMetrics();
  });

  afterEach(() => {
    monitor.stopPeriodicReporting();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Singleton
  // -------------------------------------------------------------------------
  describe('singleton', () => {
    it('exports the class and a singleton instance', () => {
      expect(typeof PerformanceMonitor).toBe('function');
      expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('getInstance returns the same cached instance', () => {
      expect(PerformanceMonitor.getInstance()).toBe(performanceMonitor);
      expect(PerformanceMonitor.getInstance()).toBe(monitor);
    });
  });

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------
  describe('configuration', () => {
    it('setEnabled toggles metric collection', () => {
      monitor.setEnabled(false);
      monitor.recordMetric('disabled_metric', 5);
      // when disabled, MetricsCollector does not push the metric
      expect(monitor.getMetrics()).toHaveLength(0);

      monitor.setEnabled(true);
      monitor.recordMetric('enabled_metric', 5);
      expect(monitor.getMetrics()).toHaveLength(1);
    });

    it('setEnforcementEnabled gates violation enforcement', () => {
      monitor.setEnforcementEnabled(false);
      // a metric that would normally violate produces no emit when disabled
      monitor.setBudget('gated_metric', 10);
      monitor.recordMetric('gated_metric', 9999);
      expect(mockEmit).not.toHaveBeenCalledWith(
        'performance_violation',
        expect.anything()
      );
    });

    it('setBudget / getBudget round-trip via the rule manager', () => {
      monitor.setBudget('my_budget', 1234);
      expect(monitor.getBudget('my_budget')).toBe(1234);
    });

    it('getBudget returns undefined for an unknown metric', () => {
      expect(monitor.getBudget('does_not_exist_metric_xyz')).toBeUndefined();
    });

    it('exposes the seeded default budgets from BudgetRuleManager', () => {
      // app_start_time is seeded by initializeDefaultBudgets (3000) but then
      // overwritten to the advanced rule's `critical` (5000) when the
      // app_startup_time_enhanced rule is registered in initializeAdvancedBudgets.
      expect(monitor.getBudget('app_start_time')).toBe(5000);
      // storage_operation_time has no advanced rule, so its default survives.
      expect(monitor.getBudget('storage_operation_time')).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Budget rule management (delegation chain)
  // -------------------------------------------------------------------------
  describe('budget rule management', () => {
    afterEach(() => {
      monitor.removeBudgetRule('custom_rule');
    });

    it('addBudgetRule + getBudgetRule round-trip', () => {
      monitor.addBudgetRule(makeRule());
      const rule = monitor.getBudgetRule('custom_rule');
      expect(rule?.id).toBe('custom_rule');
      expect(rule?.metric).toBe('custom_metric');
    });

    it('getAllBudgetRules includes seeded + added rules', () => {
      const before = monitor.getAllBudgetRules().length;
      monitor.addBudgetRule(makeRule());
      const after = monitor.getAllBudgetRules();
      expect(after.length).toBe(before + 1);
      expect(after.some((r) => r.id === 'custom_rule')).toBe(true);
    });

    it('updateBudgetRule mutates an existing rule and returns true', () => {
      monitor.addBudgetRule(makeRule());
      expect(monitor.updateBudgetRule('custom_rule', { target: 42 })).toBe(
        true
      );
      expect(monitor.getBudgetRule('custom_rule')?.target).toBe(42);
    });

    it('updateBudgetRule returns false for an unknown rule', () => {
      expect(monitor.updateBudgetRule('nope', { target: 1 })).toBe(false);
    });

    it('setBudgetRuleEnabled toggles the enabled flag', () => {
      monitor.addBudgetRule(makeRule());
      expect(monitor.setBudgetRuleEnabled('custom_rule', false)).toBe(true);
      expect(monitor.getBudgetRule('custom_rule')?.enabled).toBe(false);
    });

    it('setBudgetRuleEnabled returns false for an unknown rule', () => {
      expect(monitor.setBudgetRuleEnabled('missing', true)).toBe(false);
    });

    it('removeBudgetRule returns true then false', () => {
      monitor.addBudgetRule(makeRule());
      expect(monitor.removeBudgetRule('custom_rule')).toBe(true);
      expect(monitor.removeBudgetRule('custom_rule')).toBe(false);
      expect(monitor.getBudgetRule('custom_rule')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Metric collection + enforcement
  // -------------------------------------------------------------------------
  describe('recordMetric', () => {
    it('records a metric with default category and stores it', () => {
      monitor.recordMetric('plain_metric', 12);
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        name: 'plain_metric',
        value: 12,
        category: 'custom',
      });
    });

    it('records with explicit category and tags', () => {
      monitor.recordMetric('net_metric', 50, 'network', { url: '/x' });
      const [m] = monitor.getMetrics('network');
      expect(m.category).toBe('network');
      expect(m.tags).toEqual({ url: '/x' });
    });

    it('logs a warning when a critical legacy-threshold violation occurs', () => {
      // Use a metric NOT covered by an advanced rule so the legacy
      // threshold->severity path runs. ratio = 100/10 = 10 => critical.
      monitor.setBudget('legacy_only_metric', 10);
      monitor.recordMetric('legacy_only_metric', 100, 'custom', { a: 'b' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Performance violation: legacy_only_metric',
        expect.objectContaining({
          data: expect.objectContaining({ expected: 10, actual: 100 }),
        })
      );
      // legacy violation also emits a DeviceEvent
      expect(mockEmit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('does NOT warn for a low-severity legacy violation', () => {
      // ratio = 11/10 = 1.1 => low, so no critical warn log
      monitor.setBudget('low_metric', 10);
      monitor.recordMetric('low_metric', 11);
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'Performance violation: low_metric',
        expect.anything()
      );
    });

    it('within-budget metric produces no violation emit', () => {
      monitor.setBudget('fast_metric', 1000);
      monitor.recordMetric('fast_metric', 5);
      expect(mockEmit).not.toHaveBeenCalledWith(
        'performance_violation',
        expect.anything()
      );
    });
  });

  // -------------------------------------------------------------------------
  // Timing utilities
  // -------------------------------------------------------------------------
  describe('timing utilities', () => {
    it('startTimer returns a stop fn that records a duration metric', () => {
      const stop = monitor.startTimer('timed_op', { phase: 'x' });
      expect(typeof stop).toBe('function');
      stop();
      const [m] = monitor.getMetrics();
      expect(m.name).toBe('timed_op');
      expect(typeof m.value).toBe('number');
      expect(m.tags).toEqual({ phase: 'x' });
    });

    it('measureSync runs the fn, returns its value, records success', () => {
      const result = monitor.measureSync('sync_op', () => 7, 'custom', {
        k: 'v',
      });
      expect(result).toBe(7);
      const [m] = monitor.getMetrics();
      expect(m.name).toBe('sync_op');
      expect(m.tags).toMatchObject({ k: 'v', status: 'success' });
    });

    it('measureSync records error tag then rethrows', () => {
      expect(() =>
        monitor.measureSync('sync_fail', () => {
          throw new Error('boom');
        })
      ).toThrow('boom');
      const [m] = monitor.getMetrics();
      expect(m.tags).toMatchObject({ status: 'error' });
    });

    it('measureAsync awaits the fn, returns its value, records success', async () => {
      const result = await monitor.measureAsync(
        'async_op',
        async () => 'done',
        'network'
      );
      expect(result).toBe('done');
      const [m] = monitor.getMetrics('network');
      expect(m.name).toBe('async_op');
      expect(m.tags).toMatchObject({ status: 'success' });
    });

    it('measureAsync records error tag then rejects', async () => {
      await expect(
        monitor.measureAsync('async_fail', async () => {
          throw new Error('nope');
        })
      ).rejects.toThrow('nope');
      const [m] = monitor.getMetrics();
      expect(m.tags).toMatchObject({ status: 'error' });
    });
  });

  // -------------------------------------------------------------------------
  // Component performance tracking
  // -------------------------------------------------------------------------
  describe('component tracking', () => {
    it('trackComponentRender accumulates per-component stats', () => {
      monitor.trackComponentRender('Button', 10);
      monitor.trackComponentRender('Button', 20);

      const [c] = monitor.getComponentMetrics('Button');
      expect(c.componentName).toBe('Button');
      expect(c.renderCount).toBe(2);
      expect(c.totalRenderTime).toBe(30);
      expect(c.averageRenderTime).toBe(15);
      expect(c.lastRenderTime).toBe(20);
    });

    it('getComponentMetrics() with no name returns all tracked components', () => {
      monitor.trackComponentRender('A', 5);
      monitor.trackComponentRender('B', 6);
      const all = monitor.getComponentMetrics();
      expect(all.map((c) => c.componentName).sort()).toEqual(['A', 'B']);
    });

    it('getComponentMetrics returns empty for an unknown component', () => {
      expect(monitor.getComponentMetrics('Ghost')).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Memory + network monitoring
  // -------------------------------------------------------------------------
  describe('memory & network', () => {
    it('recordMemoryUsage records 3 heap metrics when memory info present', () => {
      const original = (global.performance as { memory?: unknown }).memory;
      (global.performance as { memory?: unknown }).memory = {
        usedJSHeapSize: 1000,
        totalJSHeapSize: 2000,
        jsHeapSizeLimit: 3000,
      };
      try {
        monitor.recordMemoryUsage();
        const names = monitor.getMetrics().map((m) => m.name);
        expect(names).toEqual(
          expect.arrayContaining([
            'js_heap_size_used',
            'js_heap_size_total',
            'js_heap_size_limit',
          ])
        );
      } finally {
        (global.performance as { memory?: unknown }).memory = original;
      }
    });

    it('recordMemoryUsage is a no-op when no memory info is available', () => {
      const original = (global.performance as { memory?: unknown }).memory;
      (global.performance as { memory?: unknown }).memory = undefined;
      try {
        monitor.recordMemoryUsage();
        expect(monitor.getMetrics()).toHaveLength(0);
      } finally {
        (global.performance as { memory?: unknown }).memory = original;
      }
    });

    it('trackNetworkRequest records an api_response_time metric', () => {
      monitor.trackNetworkRequest('https://api.test/v1/jobs', 100, 350, true);
      const [m] = monitor.getMetrics('network');
      expect(m.name).toBe('api_response_time');
      expect(m.value).toBe(250);
      expect(m.tags).toMatchObject({
        url: 'https://api.test/v1/jobs',
        success: 'true',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Reporting & analytics
  // -------------------------------------------------------------------------
  describe('reporting', () => {
    let nowSpy: jest.SpyInstance;

    beforeEach(() => {
      // Freeze Date.now so getMetricsInTimeRange windows include our metrics.
      nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it('generateReport returns a structured report over recent metrics', () => {
      monitor.recordMetric('render_a', 10, 'render');
      monitor.recordMetric('net_a', 20, 'network');

      const report = monitor.generateReport();
      expect(report.timestamp).toBe(1_000_000);
      expect(report.summary.totalMetrics).toBeGreaterThanOrEqual(2);
      expect(report.summary.averageRenderTime).toBe(10);
      expect(report.summary.averageNetworkTime).toBe(20);
      expect(Array.isArray(report.budgets)).toBe(true);
      expect(Array.isArray(report.violations)).toBe(true);
    });

    it('getBudgetStatus returns the report budgets array', () => {
      const status = monitor.getBudgetStatus();
      expect(Array.isArray(status)).toBe(true);
    });

    it('getAdvancedBudgetStatus computes budgets from enabled rules', () => {
      // Drive a real budget calculation against api_response_time rule.
      monitor.recordMetric('api_response_time', 500, 'network');
      const status = monitor.getAdvancedBudgetStatus();
      expect(Array.isArray(status)).toBe(true);
      const api = status.find((b) => b.metric === 'api_response_time');
      expect(api).toBeDefined();
      expect(api?.current).toBe(500);
    });

    it('generateBudgetReport returns a markdown string', () => {
      monitor.recordMetric('api_response_time', 500, 'network');
      const report = monitor.generateBudgetReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('Performance Budget Report');
      expect(report).toContain('Summary');
    });

    it('getStoredReports resolves to an array (AsyncStorage-backed)', async () => {
      const reports = await monitor.getStoredReports();
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Periodic reporting lifecycle
  // -------------------------------------------------------------------------
  describe('periodic reporting', () => {
    it('stopPeriodicReporting clears the timer without throwing', () => {
      expect(() => monitor.stopPeriodicReporting()).not.toThrow();
      // idempotent: a second stop is also safe (timer already undefined)
      expect(() => monitor.stopPeriodicReporting()).not.toThrow();
    });

    it('a freshly constructed instance fires generateReport on its interval', () => {
      // The private constructor schedules a 30s setInterval -> generateReport.
      // Build a fresh instance (bypassing the cached singleton) so its timer is
      // registered under the active fake-timer system, then advance time to run
      // the interval callback (line 184) for real.
      const Ctor = PerformanceMonitor as unknown as {
        new (): PerformanceMonitor;
      };
      const fresh = new Ctor();
      const reportSpy = jest.spyOn(fresh, 'generateReport');
      try {
        jest.advanceTimersByTime(30000);
        expect(reportSpy).toHaveBeenCalled();
      } finally {
        fresh.stopPeriodicReporting();
        reportSpy.mockRestore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Utility methods
  // -------------------------------------------------------------------------
  describe('utility methods', () => {
    it('clearMetrics empties both metric and component collections', () => {
      monitor.recordMetric('m', 1);
      monitor.trackComponentRender('C', 1);
      monitor.clearMetrics();
      expect(monitor.getMetrics()).toHaveLength(0);
      expect(monitor.getComponentMetrics()).toHaveLength(0);
    });

    it('getMetrics filters by category', () => {
      monitor.recordMetric('r', 1, 'render');
      monitor.recordMetric('n', 1, 'network');
      expect(monitor.getMetrics('render')).toHaveLength(1);
      expect(monitor.getMetrics('network')).toHaveLength(1);
      expect(monitor.getMetrics()).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Event listeners
  // -------------------------------------------------------------------------
  describe('event listeners', () => {
    it('onMetric subscribes, fires on record, and unsubscribes', () => {
      const received: PerformanceMetric[] = [];
      const unsubscribe = monitor.onMetric((m) => received.push(m));

      monitor.recordMetric('listened', 99);
      expect(received).toHaveLength(1);
      expect(received[0].name).toBe('listened');

      unsubscribe();
      monitor.recordMetric('after_unsub', 1);
      expect(received).toHaveLength(1); // not incremented after unsubscribe
    });

    it('onBudgetViolation fires for an advanced-rule critical violation', () => {
      const violations: unknown[] = [];
      const unsubscribe = monitor.onBudgetViolation((v) => violations.push(v));

      // Add a greater_than rule so a tiny value triggers a critical violation.
      monitor.addBudgetRule(
        makeRule({
          id: 'listener_rule',
          metric: 'listener_metric',
          comparison: 'greater_than',
          target: 100,
          warning: 50,
          critical: 10,
        })
      );

      monitor.recordMetric('listener_metric', 5); // 5 <= critical(10) => critical
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(mockEmit).toHaveBeenCalledWith(
        'performance_budget_violation',
        expect.anything()
      );

      unsubscribe();
      monitor.removeBudgetRule('listener_rule');
    });
  });

  // -------------------------------------------------------------------------
  // Compatibility stubs
  // -------------------------------------------------------------------------
  describe('compatibility stubs', () => {
    it('initialize resolves and logs', async () => {
      await expect(monitor.initialize()).resolves.toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PerformanceMonitor',
        'Initializing performance monitoring'
      );
    });

    it('recordMetrics records a response_time metric (no context branch)', () => {
      monitor.recordMetrics('payments', 123);
      const [m] = monitor.getMetrics();
      expect(m.name).toBe('payments_response_time');
      expect(m.value).toBe(123);
    });

    it('recordMetrics with context also logs an info line', () => {
      monitor.recordMetrics('jobs', 80, { detail: 'x' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PerformanceMonitor',
        'Recorded metrics for jobs',
        { detail: 'x' }
      );
    });
  });
});
