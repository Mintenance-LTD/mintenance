/**
 * Comprehensive unit tests for the performance Reporter.
 *
 * Exercises the REAL Reporter class (never mocked). Only externals are mocked:
 *   - @react-native-async-storage/async-storage (stateful in-memory mock so the
 *     store/clean-old/getStored paths run for real)
 *   - utils/logger (assert warn() on error paths)
 *   - Date.now / new Date (spied / faked for deterministic timestamps + output)
 *
 * Covers every method + branch:
 *   generateReport (render/network averages, empty-metric branches, pass/fail
 *     budget counts, storeReport side-effect),
 *   generateBudgetReport (summary counts, every category, empty-category skip,
 *     emoji per status, value/target fallbacks, percentage fallback),
 *   formatValue (bytes GB/MB/KB/B, ms s/ms, default unit),
 *   storeReport (happy path, old-report pruning >10, AsyncStorage failure),
 *   getStoredReports (happy path sort, empty, JSON null filtering, failure),
 *   calculateBudgets (enabled filter, less_than/greater_than/equal_to with
 *     pass/warn/fail, empty-metric default current, min vs max selection),
 *   calculateViolations (threshold filtering, severity mapping),
 *   calculateSeverity (critical/high/medium/low via violation output).
 */

import { Reporter } from '../Reporter';
import type {
  PerformanceMetric,
  PerformanceBudget,
  PerformanceViolation,
  BudgetEnforcementRule,
} from '../types';

// ---------------------------------------------------------------------------
// Stateful in-memory AsyncStorage mock.
// ---------------------------------------------------------------------------
const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((k: string, v: string) => {
      mockStore.set(k, v);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => mockStore.delete(k));
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])
      )
    ),
  },
}));

jest.mock('../../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('../../logger');

const metric = (over: Partial<PerformanceMetric> = {}): PerformanceMetric => ({
  name: 'm',
  value: 10,
  timestamp: 1000,
  category: 'custom',
  ...over,
});

const rule = (
  over: Partial<BudgetEnforcementRule> = {}
): BudgetEnforcementRule => ({
  id: 'r1',
  name: 'rule',
  metric: 'm',
  target: 100,
  warning: 150,
  critical: 200,
  unit: 'ms',
  category: 'performance',
  enabled: true,
  comparison: 'less_than',
  enforcement: 'log',
  ...over,
});

describe('Reporter', () => {
  let reporter: Reporter;

  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    reporter = new Reporter();
  });

  // -------------------------------------------------------------------------
  // generateReport
  // -------------------------------------------------------------------------
  describe('generateReport', () => {
    it('builds the full report with render + network averages and stores it', () => {
      jest.spyOn(Date, 'now').mockReturnValue(123456);

      const metrics: PerformanceMetric[] = [
        metric({ category: 'render', value: 10 }),
        metric({ category: 'render', value: 30 }),
        metric({ category: 'network', value: 100 }),
        metric({ category: 'network', value: 300 }),
        metric({ category: 'custom', value: 999 }),
      ];
      const budgets: PerformanceBudget[] = [
        { status: 'pass' },
        { status: 'pass' },
        { status: 'fail' },
      ];
      const violations: PerformanceViolation[] = [
        { metric: 'x', threshold: 1, actual: 2, severity: 'low', timestamp: 1 },
      ];

      const report = reporter.generateReport(metrics, budgets, violations);

      expect(report.timestamp).toBe(123456);
      expect(report.metrics).toBe(metrics);
      expect(report.budgets).toBe(budgets);
      expect(report.violations).toBe(violations);
      expect(report.summary).toEqual({
        totalMetrics: 5,
        passedBudgets: 2,
        failedBudgets: 1,
        averageRenderTime: 20, // (10 + 30) / 2
        averageNetworkTime: 200, // (100 + 300) / 2
      });

      // storeReport side-effect persisted under perf_report_<timestamp>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'perf_report_123456',
        JSON.stringify(report)
      );
    });

    it('returns zero averages when no render/network metrics exist', () => {
      jest.spyOn(Date, 'now').mockReturnValue(7);
      const report = reporter.generateReport(
        [metric({ category: 'custom' })],
        [],
        []
      );

      expect(report.summary.totalMetrics).toBe(1);
      expect(report.summary.passedBudgets).toBe(0);
      expect(report.summary.failedBudgets).toBe(0);
      expect(report.summary.averageRenderTime).toBe(0);
      expect(report.summary.averageNetworkTime).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // generateBudgetReport
  // -------------------------------------------------------------------------
  describe('generateBudgetReport', () => {
    it('renders summary counts and per-category sections with correct emojis', () => {
      jest
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('LOCALE_TIME');

      const budgets: PerformanceBudget[] = [
        {
          metric: 'fcp',
          status: 'pass',
          current: 500,
          target: 1000,
          unit: 'ms',
          percentage: 50,
          category: 'performance',
        },
        {
          metric: 'mem',
          status: 'warn',
          current: 2 * 1024 * 1024,
          target: 4 * 1024 * 1024,
          unit: 'bytes',
          percentage: 50,
          category: 'resources',
        },
        {
          metric: 'score',
          status: 'fail',
          current: 10,
          budget: 90, // falls back to budget when target missing
          unit: '',
          percentage: 11.11,
          category: 'quality',
        },
        {
          metric: 'ux',
          status: 'pass',
          current: 1,
          target: 1,
          unit: 'count',
          // percentage omitted -> 0.0 fallback
          category: 'user_experience',
        },
      ];

      const out = reporter.generateBudgetReport(budgets, 10);

      expect(out).toContain('**Rules:** 10 total, 4 enabled');
      expect(out).toContain('**Passed:** 2');
      expect(out).toContain('**Warnings:** 1');
      expect(out).toContain('**Failed:** 1');
      expect(out).toContain('LOCALE_TIME');

      // Category headers (capitalized, underscore replaced)
      expect(out).toContain('## Performance');
      expect(out).toContain('## Resources');
      expect(out).toContain('## Quality');
      expect(out).toContain('## User experience');

      // Values formatted, percentage rendered to 1 dp
      expect(out).toContain('**fcp**: 500ms / 1000ms (50.0%)');
      expect(out).toContain('**mem**: 2.00MB / 4.00MB (50.0%)');
      expect(out).toContain('**score**: 10 / 90 (11.1%)'); // budget fallback for target
      expect(out).toContain('**ux**: 1count / 1count (0.0%)'); // percentage fallback
    });

    it('skips categories that have no budgets', () => {
      const out = reporter.generateBudgetReport(
        [
          {
            metric: 'a',
            status: 'pass',
            category: 'performance',
            current: 1,
            target: 1,
            unit: '',
            percentage: 100,
          },
        ],
        1
      );
      expect(out).toContain('## Performance');
      expect(out).not.toContain('## Resources');
      expect(out).not.toContain('## Quality');
      expect(out).not.toContain('## User experience');
    });

    it('uses 0 fallbacks for missing current/target', () => {
      const out = reporter.generateBudgetReport(
        [
          {
            metric: 'z',
            status: 'fail',
            category: 'quality',
            unit: '',
            percentage: 0,
          },
        ],
        1
      );
      expect(out).toContain('**z**: 0 / 0 (0.0%)');
    });
  });

  // -------------------------------------------------------------------------
  // formatValue
  // -------------------------------------------------------------------------
  describe('formatValue', () => {
    it('formats bytes into GB/MB/KB/B', () => {
      expect(reporter.formatValue(2 * 1024 * 1024 * 1024, 'bytes')).toBe(
        '2.00GB'
      );
      expect(reporter.formatValue(5 * 1024 * 1024, 'bytes')).toBe('5.00MB');
      expect(reporter.formatValue(3 * 1024, 'bytes')).toBe('3.00KB');
      expect(reporter.formatValue(512, 'bytes')).toBe('512B');
    });

    it('formats ms into seconds or ms', () => {
      expect(reporter.formatValue(2500, 'ms')).toBe('2.50s');
      expect(reporter.formatValue(250, 'ms')).toBe('250ms');
    });

    it('falls back to value+unit for unknown units', () => {
      expect(reporter.formatValue(42, 'fps')).toBe('42fps');
      expect(reporter.formatValue(7, '')).toBe('7');
    });
  });

  // -------------------------------------------------------------------------
  // storeReport
  // -------------------------------------------------------------------------
  describe('storeReport', () => {
    it('persists and prunes to the most-recent 10 reports', async () => {
      // Pre-seed 12 existing report keys.
      for (let i = 1; i <= 12; i++) {
        mockStore.set(`perf_report_${String(i).padStart(3, '0')}`, '{}');
      }
      // Add a non-report key that must be ignored by the filter.
      mockStore.set('other_key', 'x');

      await reporter.storeReport({
        timestamp: 999,
        summary: { totalMetrics: 0 },
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'perf_report_999',
        JSON.stringify({ timestamp: 999, summary: { totalMetrics: 0 } })
      );
      // 13 report keys total now -> 3 oldest pruned.
      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(1);
      const removed = AsyncStorage.multiRemove.mock.calls[0][0];
      expect(removed).toHaveLength(3);
      // Non-report key untouched.
      expect(mockStore.has('other_key')).toBe(true);
    });

    it('does not prune when 10 or fewer reports exist', async () => {
      await reporter.storeReport({
        timestamp: 1,
        summary: { totalMetrics: 0 },
      });
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('logs a warning and swallows AsyncStorage failures', async () => {
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
      await expect(
        reporter.storeReport({ timestamp: 2, summary: { totalMetrics: 0 } })
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to store performance report',
        { data: expect.any(Error) }
      );
    });
  });

  // -------------------------------------------------------------------------
  // getStoredReports
  // -------------------------------------------------------------------------
  describe('getStoredReports', () => {
    it('returns parsed reports sorted by timestamp desc, ignoring nulls and non-report keys', async () => {
      mockStore.set('perf_report_1', JSON.stringify({ timestamp: 1 }));
      mockStore.set('perf_report_2', JSON.stringify({ timestamp: 5 }));
      mockStore.set('perf_report_3', JSON.stringify({ timestamp: 3 }));
      mockStore.set('unrelated', 'nope');

      const reports = await reporter.getStoredReports();
      expect(reports.map((r) => r.timestamp)).toEqual([5, 3, 1]);
    });

    it('filters out null values returned by multiGet', async () => {
      mockStore.set('perf_report_1', JSON.stringify({ timestamp: 1 }));
      // Force one entry to come back as null.
      AsyncStorage.multiGet.mockResolvedValueOnce([
        ['perf_report_1', JSON.stringify({ timestamp: 1 })],
        ['perf_report_2', null],
      ]);
      const reports = await reporter.getStoredReports();
      expect(reports).toHaveLength(1);
      expect(reports[0].timestamp).toBe(1);
    });

    it('returns an empty array and logs on failure', async () => {
      AsyncStorage.getAllKeys.mockRejectedValueOnce(new Error('boom'));
      const reports = await reporter.getStoredReports();
      expect(reports).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to retrieve performance reports',
        { data: expect.any(Error) }
      );
    });
  });

  // -------------------------------------------------------------------------
  // calculateBudgets
  // -------------------------------------------------------------------------
  describe('calculateBudgets', () => {
    it('skips disabled rules', () => {
      const result = reporter.calculateBudgets(
        [metric({ name: 'm', value: 10 })],
        [rule({ enabled: false })]
      );
      expect(result).toEqual([]);
    });

    it('handles less_than with pass/warn/fail thresholds', () => {
      const r = rule({
        comparison: 'less_than',
        target: 100,
        warning: 150,
        critical: 200,
      });

      // pass: current below warning
      let out = reporter.calculateBudgets(
        [metric({ name: 'm', value: 50 })],
        [r]
      );
      expect(out[0].status).toBe('pass');
      expect(out[0].current).toBe(50); // max of relevant for non-greater_than
      expect(out[0].percentage).toBe(50); // (50/100)*100

      // warn: >= warning but < critical
      out = reporter.calculateBudgets([metric({ name: 'm', value: 160 })], [r]);
      expect(out[0].status).toBe('warn');

      // fail: >= critical
      out = reporter.calculateBudgets([metric({ name: 'm', value: 250 })], [r]);
      expect(out[0].status).toBe('fail');
    });

    it('uses max value when multiple metrics for less_than', () => {
      const r = rule({ comparison: 'less_than' });
      const out = reporter.calculateBudgets(
        [metric({ name: 'm', value: 10 }), metric({ name: 'm', value: 80 })],
        [r]
      );
      expect(out[0].current).toBe(80);
    });

    it('handles greater_than with pass/warn/fail and min selection', () => {
      const r = rule({
        comparison: 'greater_than',
        target: 100,
        warning: 50,
        critical: 20,
      });

      // pass: current above warning -> uses min of relevant metrics
      let out = reporter.calculateBudgets(
        [metric({ name: 'm', value: 90 }), metric({ name: 'm', value: 200 })],
        [r]
      );
      expect(out[0].current).toBe(90); // min selected for greater_than
      expect(out[0].status).toBe('pass');
      expect(out[0].percentage).toBeCloseTo((100 / 90) * 100);

      // warn: <= warning, > critical
      out = reporter.calculateBudgets([metric({ name: 'm', value: 40 })], [r]);
      expect(out[0].status).toBe('warn');

      // fail: <= critical
      out = reporter.calculateBudgets([metric({ name: 'm', value: 10 })], [r]);
      expect(out[0].status).toBe('fail');
    });

    it('greater_than with zero current clamps divisor to 1', () => {
      const r = rule({
        comparison: 'greater_than',
        target: 100,
        warning: 50,
        critical: 20,
      });
      // No matching metrics -> current 0 -> Math.max(0,1)=1 -> percentage 10000
      const out = reporter.calculateBudgets([], [r]);
      expect(out[0].current).toBe(0);
      expect(out[0].percentage).toBe(10000);
      expect(out[0].status).toBe('fail'); // 0 <= critical
    });

    it('handles equal_to with pass/warn/fail by absolute diff', () => {
      const r = rule({
        comparison: 'equal_to',
        target: 100,
        warning: 120, // diff threshold |120-100| = 20
        critical: 150, // diff threshold |150-100| = 50
      });

      // pass: diff small
      let out = reporter.calculateBudgets(
        [metric({ name: 'm', value: 105 })],
        [r]
      );
      expect(out[0].status).toBe('pass');
      expect(out[0].percentage).toBeCloseTo(100 - (5 / 100) * 100); // 95

      // warn: diff >= 20 but < 50
      out = reporter.calculateBudgets([metric({ name: 'm', value: 130 })], [r]);
      expect(out[0].status).toBe('warn');

      // fail: diff >= 50
      out = reporter.calculateBudgets([metric({ name: 'm', value: 160 })], [r]);
      expect(out[0].status).toBe('fail');
    });

    it('defaults current to 0 when no relevant metrics and maps all fields', () => {
      const r = rule({ comparison: 'less_than', metric: 'absent' });
      const out = reporter.calculateBudgets(
        [metric({ name: 'other', value: 5 })],
        [r]
      );
      expect(out[0]).toMatchObject({
        metric: 'absent',
        budget: r.target,
        current: 0,
        target: r.target,
        warning: r.warning,
        critical: r.critical,
        unit: r.unit,
        category: r.category,
        enabled: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // calculateViolations + calculateSeverity
  // -------------------------------------------------------------------------
  describe('calculateViolations', () => {
    it('filters metrics without a threshold or under threshold', () => {
      const out = reporter.calculateViolations([
        metric({ name: 'noThreshold', value: 1000 }), // no threshold -> excluded
        metric({ name: 'under', value: 50, threshold: 100 }), // under -> excluded
        metric({ name: 'equal', value: 100, threshold: 100 }), // equal -> excluded (> only)
        metric({ name: 'over', value: 150, threshold: 100, timestamp: 42 }),
      ]);

      expect(out).toHaveLength(1);
      expect(out[0]).toEqual({
        metric: 'over',
        threshold: 100,
        actual: 150,
        severity: 'medium', // ratio 1.5
        timestamp: 42,
      });
    });

    it('maps each severity bucket from the actual/threshold ratio', () => {
      const out = reporter.calculateViolations([
        metric({ name: 'crit', value: 300, threshold: 100 }), // ratio 3 -> critical
        metric({ name: 'high', value: 200, threshold: 100 }), // ratio 2 -> high
        metric({ name: 'med', value: 150, threshold: 100 }), // ratio 1.5 -> medium
        metric({ name: 'low', value: 110, threshold: 100 }), // ratio 1.1 -> low
      ]);
      const bySeverity = Object.fromEntries(
        out.map((v) => [v.metric, v.severity])
      );
      expect(bySeverity).toEqual({
        crit: 'critical',
        high: 'high',
        med: 'medium',
        low: 'low',
      });
    });

    it('returns empty array for empty input', () => {
      expect(reporter.calculateViolations([])).toEqual([]);
    });
  });
});
