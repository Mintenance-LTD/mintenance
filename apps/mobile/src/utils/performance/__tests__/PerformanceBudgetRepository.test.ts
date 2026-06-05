/**
 * Comprehensive unit tests for the REAL PerformanceBudgetRepository.
 *
 * The class under test is never mocked. It is a purely in-memory store (four
 * Maps) with NO AsyncStorage / filesystem dependency, so the only external is
 * the logger. `Date.now` is spied for deterministic cleanup/report time windows.
 *
 * Covers every method + branch:
 *   constructor -> initializeDefaultBudgets (5 seeded services + logger.info)
 *   setBudget (named service, missing-serviceName fallback to 'unknown', overwrite)
 *   getBudget (hit + miss)
 *   getAllBudgets (snapshot copy semantics)
 *   storeMetrics (first insert creates array, append, 100-cap shift)
 *   getMetrics (no limit, with limit slice, missing service -> [])
 *   getAllMetrics (snapshot copy)
 *   storeAlert (first insert, append, 50-cap shift)
 *   getAlerts (all, severity filter, missing service -> [])
 *   cleanup (default + custom window, prunes metrics + alerts, logs only when >0)
 *   generateReport (populated averages/peak, empty branches, alert counts, time window)
 *   generateRecommendations via report (no-budget skip, empty-metrics skip,
 *     each of the 4 recommendation thresholds, critical-alert threshold)
 */

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { PerformanceBudgetRepository } from '../PerformanceBudgetRepository';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loggerMock = require('../../logger').logger as {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};
import type {
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceBudget,
} from '../types';

const NOW = 1_700_000_000_000;

function makeMetrics(
  overrides: Partial<PerformanceMetrics> = {}
): PerformanceMetrics {
  return {
    serviceName: 'svc',
    timestamp: NOW,
    responseTime: 100,
    memoryUsage: 50,
    cpuUsage: 10,
    apiCallsPerMinute: 5,
    errorRate: 0,
    downloadSize: 1,
    budgetViolations: [],
    ...overrides,
  };
}

function makeAlert(
  overrides: Partial<PerformanceAlert> = {}
): PerformanceAlert {
  return {
    serviceName: 'svc',
    metric: 'responseTime',
    severity: 'warning',
    message: 'msg',
    timestamp: NOW,
    actual: 100,
    budget: 50,
    violationPercentage: 100,
    ...overrides,
  };
}

describe('PerformanceBudgetRepository', () => {
  let nowSpy: jest.SpyInstance;
  let repo: PerformanceBudgetRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    repo = new PerformanceBudgetRepository();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  describe('constructor / default budgets', () => {
    it('seeds the 5 default service budgets', () => {
      const all = repo.getAllBudgets();
      expect(all.size).toBe(5);
      expect([...all.keys()].sort()).toEqual(
        ['auth', 'database', 'file_service', 'ml_service', 'payment'].sort()
      );
    });

    it('seeds correct numeric values for ml_service', () => {
      const ml = repo.getBudget('ml_service')!;
      expect(ml.budgets).toEqual({
        responseTime: 500,
        memoryUsage: 200,
        cpuUsage: 70,
        apiCalls: 1000,
        errorRate: 5,
        downloadSize: 50,
      });
      expect(ml.alertThresholds).toEqual({ warning: 80, critical: 95 });
    });

    it('seeds payment with its critical 1% error rate', () => {
      expect(repo.getBudget('payment')!.budgets!.errorRate).toBe(1);
      expect(repo.getBudget('payment')!.alertThresholds).toEqual({
        warning: 80,
        critical: 90,
      });
    });

    it('logs init summary with budgetCount=5 and a set log per service', () => {
      expect(loggerMock.info).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Default budgets initialized',
        { budgetCount: 5 }
      );
      // 5 "Budget set" + 1 "initialized"
      expect(loggerMock.info).toHaveBeenCalledTimes(6);
    });
  });

  describe('setBudget / getBudget', () => {
    it('stores and retrieves a named budget', () => {
      const budget: PerformanceBudget = {
        serviceName: 'custom',
        budgets: {
          responseTime: 1,
          memoryUsage: 2,
          cpuUsage: 3,
          apiCalls: 4,
          errorRate: 5,
          downloadSize: 6,
        },
        alertThresholds: { warning: 70, critical: 90 },
      };
      repo.setBudget(budget);
      expect(repo.getBudget('custom')).toBe(budget);
      expect(loggerMock.info).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Budget set for service',
        { serviceName: 'custom', budgets: budget.budgets }
      );
    });

    it('falls back to "unknown" when serviceName is absent', () => {
      const budget: PerformanceBudget = { budget: 10 };
      repo.setBudget(budget);
      expect(repo.getBudget('unknown')).toBe(budget);
      expect(loggerMock.info).toHaveBeenLastCalledWith(
        'PerformanceBudgetRepository',
        'Budget set for service',
        { serviceName: 'unknown', budgets: undefined }
      );
    });

    it('overwrites an existing budget for the same service', () => {
      const replacement: PerformanceBudget = {
        serviceName: 'auth',
        budget: 999,
      };
      repo.setBudget(replacement);
      expect(repo.getBudget('auth')).toBe(replacement);
      expect(repo.getAllBudgets().size).toBe(5); // still 5, replaced not added
    });

    it('returns undefined for a missing service', () => {
      expect(repo.getBudget('nope')).toBeUndefined();
    });
  });

  describe('getAllBudgets', () => {
    it('returns a defensive copy that does not mutate the internal map', () => {
      const snapshot = repo.getAllBudgets();
      snapshot.delete('auth');
      expect(repo.getBudget('auth')).toBeDefined();
      expect(repo.getAllBudgets().size).toBe(5);
    });
  });

  describe('storeMetrics / getMetrics / getAllMetrics', () => {
    it('creates the service array on first insert', () => {
      const m = makeMetrics({ serviceName: 'a' });
      repo.storeMetrics(m);
      expect(repo.getMetrics('a')).toEqual([m]);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Metrics stored',
        { serviceName: 'a', timestamp: NOW, violationCount: 0 }
      );
    });

    it('appends subsequent metrics for the same service', () => {
      const m1 = makeMetrics({ serviceName: 'a', responseTime: 1 });
      const m2 = makeMetrics({ serviceName: 'a', responseTime: 2 });
      repo.storeMetrics(m1);
      repo.storeMetrics(m2);
      expect(repo.getMetrics('a')).toEqual([m1, m2]);
    });

    it('logs the violation count from budgetViolations', () => {
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'a',
          budgetViolations: [
            {
              metric: 'responseTime',
              actual: 5,
              budget: 1,
              severity: 'critical',
              violationPercentage: 400,
            },
          ],
        })
      );
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Metrics stored',
        expect.objectContaining({ violationCount: 1 })
      );
    });

    it('caps retained metrics at 100 (drops oldest)', () => {
      for (let i = 0; i < 105; i++) {
        repo.storeMetrics(makeMetrics({ serviceName: 'cap', responseTime: i }));
      }
      const stored = repo.getMetrics('cap');
      expect(stored).toHaveLength(100);
      // oldest 5 (responseTime 0..4) dropped, first retained is 5
      expect(stored[0].responseTime).toBe(5);
      expect(stored[stored.length - 1].responseTime).toBe(104);
    });

    it('getMetrics with a limit returns the last N', () => {
      for (let i = 0; i < 10; i++) {
        repo.storeMetrics(makeMetrics({ serviceName: 'lim', responseTime: i }));
      }
      const last3 = repo.getMetrics('lim', 3);
      expect(last3.map((m) => m.responseTime)).toEqual([7, 8, 9]);
    });

    it('getMetrics returns [] for a missing service', () => {
      expect(repo.getMetrics('missing')).toEqual([]);
      expect(repo.getMetrics('missing', 5)).toEqual([]);
    });

    it('getAllMetrics returns a defensive copy', () => {
      repo.storeMetrics(makeMetrics({ serviceName: 'a' }));
      const snap = repo.getAllMetrics();
      snap.delete('a');
      expect(repo.getMetrics('a')).toHaveLength(1);
    });
  });

  describe('storeAlert / getAlerts', () => {
    it('creates the service array on first alert and logs a warn', () => {
      const a = makeAlert({ serviceName: 'x' });
      repo.storeAlert(a);
      expect(repo.getAlerts('x')).toEqual([a]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Alert stored',
        { serviceName: 'x', severity: 'warning', metric: 'responseTime' }
      );
    });

    it('appends subsequent alerts', () => {
      const a1 = makeAlert({ serviceName: 'x', metric: 'm1' });
      const a2 = makeAlert({ serviceName: 'x', metric: 'm2' });
      repo.storeAlert(a1);
      repo.storeAlert(a2);
      expect(repo.getAlerts('x')).toEqual([a1, a2]);
    });

    it('caps retained alerts at 50 (drops oldest)', () => {
      for (let i = 0; i < 55; i++) {
        repo.storeAlert(makeAlert({ serviceName: 'capA', metric: `m${i}` }));
      }
      const stored = repo.getAlerts('capA');
      expect(stored).toHaveLength(50);
      expect(stored[0].metric).toBe('m5');
      expect(stored[stored.length - 1].metric).toBe('m54');
    });

    it('filters by severity', () => {
      repo.storeAlert(
        makeAlert({ serviceName: 'sev', severity: 'warning', metric: 'w' })
      );
      repo.storeAlert(
        makeAlert({ serviceName: 'sev', severity: 'critical', metric: 'c' })
      );
      expect(repo.getAlerts('sev', 'warning').map((a) => a.metric)).toEqual([
        'w',
      ]);
      expect(repo.getAlerts('sev', 'critical').map((a) => a.metric)).toEqual([
        'c',
      ]);
      expect(repo.getAlerts('sev')).toHaveLength(2);
    });

    it('returns [] for a missing service', () => {
      expect(repo.getAlerts('missing')).toEqual([]);
      expect(repo.getAlerts('missing', 'critical')).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('prunes metrics and alerts older than the default 24h window and logs count', () => {
      const day = 24 * 60 * 60 * 1000;
      repo.storeMetrics(
        makeMetrics({ serviceName: 's', timestamp: NOW - day - 1 })
      ); // old
      repo.storeMetrics(makeMetrics({ serviceName: 's', timestamp: NOW })); // fresh
      repo.storeAlert(
        makeAlert({ serviceName: 's', timestamp: NOW - day - 1 })
      ); // old
      repo.storeAlert(makeAlert({ serviceName: 's', timestamp: NOW })); // fresh

      loggerMock.info.mockClear();
      repo.cleanup();

      expect(repo.getMetrics('s')).toHaveLength(1);
      expect(repo.getAlerts('s')).toHaveLength(1);
      expect(loggerMock.info).toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Cleaned old data',
        expect.objectContaining({ cleanedCount: 2 })
      );
    });

    it('honours a custom window', () => {
      repo.storeMetrics(
        makeMetrics({ serviceName: 's', timestamp: NOW - 2000 })
      );
      repo.storeMetrics(
        makeMetrics({ serviceName: 's', timestamp: NOW - 500 })
      );
      repo.cleanup(1000); // cutoff = NOW - 1000
      expect(repo.getMetrics('s')).toHaveLength(1);
      expect(repo.getMetrics('s')[0].timestamp).toBe(NOW - 500);
    });

    it('does not log when nothing was cleaned', () => {
      repo.storeMetrics(makeMetrics({ serviceName: 's', timestamp: NOW }));
      loggerMock.info.mockClear();
      repo.cleanup();
      expect(loggerMock.info).not.toHaveBeenCalledWith(
        'PerformanceBudgetRepository',
        'Cleaned old data',
        expect.anything()
      );
    });
  });

  describe('generateReport', () => {
    it('returns zeroed summary + empty trends when there are no metrics', () => {
      const report = repo.generateReport('empty');
      expect(report.serviceName).toBe('empty');
      expect(report.timeRange).toEqual({
        start: NOW - 60 * 60 * 1000,
        end: NOW,
      });
      expect(report.summary).toEqual({
        totalMetrics: 0,
        violations: { warning: 0, critical: 0 },
        averageResponseTime: 0,
        peakMemoryUsage: 0,
        errorRate: 0,
      });
      expect(report.trends).toEqual({
        responseTime: [],
        memoryUsage: [],
        errorRate: [],
      });
      expect(report.recommendations).toEqual([]);
    });

    it('computes averages, peak, trends and alert counts inside the window', () => {
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'r',
          responseTime: 100,
          memoryUsage: 40,
          errorRate: 2,
          timestamp: NOW,
        })
      );
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'r',
          responseTime: 300,
          memoryUsage: 80,
          errorRate: 4,
          timestamp: NOW,
        })
      );
      repo.storeAlert(
        makeAlert({ serviceName: 'r', severity: 'warning', timestamp: NOW })
      );
      repo.storeAlert(
        makeAlert({ serviceName: 'r', severity: 'critical', timestamp: NOW })
      );
      repo.storeAlert(
        makeAlert({ serviceName: 'r', severity: 'critical', timestamp: NOW })
      );

      const report = repo.generateReport('r');
      expect(report.summary!.totalMetrics).toBe(2);
      expect(report.summary!.averageResponseTime).toBe(200);
      expect(report.summary!.peakMemoryUsage).toBe(80);
      expect(report.summary!.errorRate).toBe(3);
      expect(report.summary!.violations).toEqual({ warning: 1, critical: 2 });
      expect(report.trends).toEqual({
        responseTime: [100, 300],
        memoryUsage: [40, 80],
        errorRate: [2, 4],
      });
    });

    it('excludes metrics/alerts outside the time range', () => {
      repo.storeMetrics(
        makeMetrics({ serviceName: 'r', timestamp: NOW - 2 * 60 * 60 * 1000 })
      ); // 2h old
      repo.storeMetrics(makeMetrics({ serviceName: 'r', timestamp: NOW })); // in window
      const report = repo.generateReport('r'); // default 1h window
      expect(report.summary!.totalMetrics).toBe(1);
    });

    it('respects a custom time range', () => {
      repo.storeMetrics(
        makeMetrics({ serviceName: 'r', timestamp: NOW - 90 * 1000 })
      );
      const wide = repo.generateReport('r', 2 * 60 * 1000); // 2 min window
      expect(wide.summary!.totalMetrics).toBe(1);
      const narrow = repo.generateReport('r', 60 * 1000); // 1 min window
      expect(narrow.summary!.totalMetrics).toBe(0);
    });
  });

  describe('generateRecommendations (via generateReport)', () => {
    it('returns no recommendations when the service has no budget', () => {
      // 'noBudgetSvc' has metrics but no budget configured
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'noBudgetSvc',
          responseTime: 9999,
          timestamp: NOW,
        })
      );
      const report = repo.generateReport('noBudgetSvc');
      expect(report.recommendations).toEqual([]);
    });

    it('returns no recommendations when budget exists but no metrics', () => {
      const report = repo.generateReport('auth'); // seeded budget, no metrics
      expect(report.recommendations).toEqual([]);
    });

    it('recommends optimizing response time when avg > 80% of budget', () => {
      // auth responseTime budget = 1000 -> threshold 800
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'auth',
          responseTime: 900,
          memoryUsage: 1,
          errorRate: 0,
          timestamp: NOW,
        })
      );
      const report = repo.generateReport('auth');
      expect(
        report.recommendations!.some((r) =>
          r.includes('optimizing auth response time')
        )
      ).toBe(true);
      expect(report.recommendations!.some((r) => r.includes('900.00ms'))).toBe(
        true
      );
    });

    it('recommends monitoring memory when peak > 90% of budget', () => {
      // auth memoryUsage budget = 50 -> threshold 45
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'auth',
          responseTime: 1,
          memoryUsage: 48,
          errorRate: 0,
          timestamp: NOW,
        })
      );
      const report = repo.generateReport('auth');
      expect(
        report.recommendations!.some((r) => r.includes('memory usage'))
      ).toBe(true);
      expect(report.recommendations!.some((r) => r.includes('48.00MB'))).toBe(
        true
      );
    });

    it('recommends investigating error rate when avg > 50% of budget', () => {
      // auth errorRate budget = 2 -> threshold 1
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'auth',
          responseTime: 1,
          memoryUsage: 1,
          errorRate: 1.5,
          timestamp: NOW,
        })
      );
      const report = repo.generateReport('auth');
      expect(
        report.recommendations!.some((r) => r.includes('error rate'))
      ).toBe(true);
      expect(report.recommendations!.some((r) => r.includes('1.50%'))).toBe(
        true
      );
    });

    it('recommends addressing critical alerts when > 5 in window', () => {
      // Keep metrics well under budget so only the critical-alert rec fires.
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'auth',
          responseTime: 1,
          memoryUsage: 1,
          errorRate: 0,
          timestamp: NOW,
        })
      );
      for (let i = 0; i < 6; i++) {
        repo.storeAlert(
          makeAlert({
            serviceName: 'auth',
            severity: 'critical',
            timestamp: NOW,
            metric: `c${i}`,
          })
        );
      }
      const report = repo.generateReport('auth');
      expect(
        report.recommendations!.some((r) =>
          r.includes('Address critical performance issues in auth (6 alerts)')
        )
      ).toBe(true);
    });

    it('produces no recommendations when all metrics are comfortably under budget', () => {
      repo.storeMetrics(
        makeMetrics({
          serviceName: 'auth',
          responseTime: 1,
          memoryUsage: 1,
          errorRate: 0,
          timestamp: NOW,
        })
      );
      const report = repo.generateReport('auth');
      expect(report.recommendations).toEqual([]);
    });
  });
});
