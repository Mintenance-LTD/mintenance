/**
 * Unit tests for PerformanceBudgetManager
 * Mocks ONLY externals: logger, errorMonitoring, PerformanceBudgetRepository,
 * PerformanceMetricsCollector. The manager itself is exercised for real.
 */

import { PerformanceBudgetManager } from '../PerformanceBudgetManager';
import { logger } from '../../logger';
import { errorMonitoring } from '../../errorMonitoring';
import type {
  PerformanceBudget,
  PerformanceMetrics,
  BudgetViolation,
  PerformanceAlert,
  PerformanceEvent,
  PerformanceReport,
} from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../errorMonitoring', () => ({
  errorMonitoring: {
    reportError: jest.fn(),
  },
}));

// Controllable mock instances for the orchestrated collaborators.
const makeRepoMock = () => ({
  setBudget: jest.fn(),
  getBudget: jest.fn(),
  getAllBudgets: jest.fn(() => new Map()),
  storeMetrics: jest.fn(),
  getMetrics: jest.fn(() => []),
  storeAlert: jest.fn(),
  getAlerts: jest.fn(() => []),
  cleanup: jest.fn(),
  generateReport: jest.fn(),
});

const makeCollectorMock = () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  collectMetrics: jest.fn(async () => ({})),
  checkBudgetViolations: jest.fn(() => []),
  emitPerformanceEvent: jest.fn(),
});

let mockRepo = makeRepoMock();
let mockCollector = makeCollectorMock();

jest.mock('../PerformanceBudgetRepository', () => ({
  PerformanceBudgetRepository: jest.fn(() => mockRepo),
}));

jest.mock('../PerformanceMetricsCollector', () => ({
  PerformanceMetricsCollector: jest.fn(() => mockCollector),
}));

const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedErrorMonitoring = errorMonitoring as jest.Mocked<
  typeof errorMonitoring
>;

const sampleBudget = (serviceName = 'svc'): PerformanceBudget => ({
  serviceName,
  budgets: {
    responseTime: 500,
    memoryUsage: 200,
    cpuUsage: 70,
    apiCalls: 1000,
    errorRate: 5,
    downloadSize: 50,
  },
  alertThresholds: { warning: 80, critical: 95 },
});

const makeViolation = (
  overrides: Partial<BudgetViolation> = {}
): BudgetViolation => ({
  metric: 'responseTime',
  actual: 800,
  budget: 500,
  severity: 'warning',
  violationPercentage: 60,
  ...overrides,
});

describe('PerformanceBudgetManager', () => {
  let manager: PerformanceBudgetManager;
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = makeRepoMock();
    mockCollector = makeCollectorMock();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    manager = new PerformanceBudgetManager(
      mockRepo as never,
      mockCollector as never
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    (Date.now as jest.Mock).mockRestore?.();
  });

  describe('construction + event listener wiring', () => {
    it('registers a collector event listener on construction', () => {
      expect(mockCollector.addEventListener).toHaveBeenCalledWith(
        'budget_manager',
        expect.any(Function)
      );
    });

    it('handlePerformanceEvent logs the received event', () => {
      const listener = mockCollector.addEventListener.mock.calls[0][1] as (
        e: PerformanceEvent
      ) => void;
      listener({
        type: 'budget_violation',
        serviceName: 'svc',
        timestamp: NOW,
        data: {},
      });
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Performance event received',
        { type: 'budget_violation', serviceName: 'svc' }
      );
    });

    it('falls back to default collaborators when none provided', () => {
      const m = new PerformanceBudgetManager();
      expect(m).toBeInstanceOf(PerformanceBudgetManager);
    });
  });

  describe('setBudget / getBudget', () => {
    it('delegates setBudget to repository and logs', () => {
      const budget = sampleBudget('ml');
      manager.setBudget(budget);
      expect(mockRepo.setBudget).toHaveBeenCalledWith(budget);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Budget configured',
        { serviceName: 'ml', responseTime: 500, memoryUsage: 200 }
      );
    });

    it('handles a budget without a budgets sub-object', () => {
      const budget: PerformanceBudget = { serviceName: 'bare' };
      manager.setBudget(budget);
      expect(mockRepo.setBudget).toHaveBeenCalledWith(budget);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Budget configured',
        { serviceName: 'bare', responseTime: undefined, memoryUsage: undefined }
      );
    });

    it('delegates getBudget to repository', () => {
      const budget = sampleBudget('auth');
      mockRepo.getBudget.mockReturnValue(budget);
      expect(manager.getBudget('auth')).toBe(budget);
      expect(mockRepo.getBudget).toHaveBeenCalledWith('auth');
    });
  });

  describe('recordMetrics', () => {
    it('warns and returns early when no budget exists', async () => {
      mockRepo.getBudget.mockReturnValue(undefined);
      await manager.recordMetrics('missing', 100);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'No performance budget found for service: missing'
      );
      expect(mockCollector.collectMetrics).not.toHaveBeenCalled();
      expect(mockRepo.storeMetrics).not.toHaveBeenCalled();
    });

    it('records metrics with no violations: uses explicit args, stores, emits improvement event, logs debug', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([]);

      await manager.recordMetrics('svc', 120, 50, 30, 200, 1, 10);

      expect(mockCollector.collectMetrics).toHaveBeenCalledWith('svc');
      expect(mockRepo.storeMetrics).toHaveBeenCalledTimes(1);
      const stored = mockRepo.storeMetrics.mock
        .calls[0][0] as PerformanceMetrics;
      expect(stored).toMatchObject({
        serviceName: 'svc',
        timestamp: NOW,
        responseTime: 120,
        memoryUsage: 50,
        cpuUsage: 30,
        apiCallsPerMinute: 200,
        errorRate: 1,
        downloadSize: 10,
        budgetViolations: [],
      });

      // improvement event (no violations)
      expect(mockCollector.emitPerformanceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance_improvement',
          serviceName: 'svc',
          timestamp: NOW,
        })
      );
      // debug-level perf log
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Performance metrics recorded',
        expect.objectContaining({ serviceName: 'svc', violations: 0 })
      );
      // no alerts stored
      expect(mockRepo.storeAlert).not.toHaveBeenCalled();
    });

    it('falls back to collected metrics when optional args are omitted', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({
        memoryUsage: 77,
        cpuUsage: 44,
        apiCallsPerMinute: 333,
        errorRate: 2,
        downloadSize: 9,
      });
      mockCollector.checkBudgetViolations.mockReturnValue([]);

      await manager.recordMetrics('svc', 100);

      const stored = mockRepo.storeMetrics.mock
        .calls[0][0] as PerformanceMetrics;
      expect(stored.memoryUsage).toBe(77);
      expect(stored.cpuUsage).toBe(44);
      expect(stored.apiCallsPerMinute).toBe(333);
      expect(stored.errorRate).toBe(2);
      expect(stored.downloadSize).toBe(9);
    });

    it('defaults collected metrics to 0 when both args and collected values are absent', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([]);

      await manager.recordMetrics('svc', 100);

      const stored = mockRepo.storeMetrics.mock
        .calls[0][0] as PerformanceMetrics;
      expect(stored.memoryUsage).toBe(0);
      expect(stored.cpuUsage).toBe(0);
      expect(stored.apiCallsPerMinute).toBe(0);
      expect(stored.errorRate).toBe(0);
      expect(stored.downloadSize).toBe(0);
    });

    it('handles violations: stores alert, triggers handler, logs warn, emits violation event', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([makeViolation()]);

      const handler = jest.fn();
      manager.onAlert('h1', handler);

      await manager.recordMetrics('svc', 800);

      // alert stored with generated message
      expect(mockRepo.storeAlert).toHaveBeenCalledTimes(1);
      const alert = mockRepo.storeAlert.mock.calls[0][0] as PerformanceAlert;
      expect(alert).toMatchObject({
        serviceName: 'svc',
        metric: 'responseTime',
        severity: 'warning',
        actual: 800,
        budget: 500,
        violationPercentage: 60,
      });
      expect(alert.message).toBe(
        'svc response time exceeded budget: 800.00ms > 500.00ms (+60.0%)'
      );

      // handler invoked with the alert
      expect(handler).toHaveBeenCalledWith(alert);

      // warn-level perf log (violations > 0)
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Budget violation detected',
        expect.objectContaining({ serviceName: 'svc', metric: 'responseTime' })
      );

      // violation event emitted
      expect(mockCollector.emitPerformanceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'budget_violation',
          serviceName: 'svc',
        })
      );

      // not critical -> no error monitoring
      expect(mockedErrorMonitoring.reportError).not.toHaveBeenCalled();
    });

    it('reports critical violations to error monitoring', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('payment'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([
        makeViolation({
          severity: 'critical',
          metric: 'errorRate',
          violationPercentage: 150,
        }),
      ]);

      await manager.recordMetrics(
        'payment',
        100,
        undefined,
        undefined,
        undefined,
        12
      );

      expect(mockedErrorMonitoring.reportError).toHaveBeenCalledTimes(1);
      const [err, opts] = mockedErrorMonitoring.reportError.mock.calls[0];
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain(
        'Critical performance budget violation'
      );
      expect(opts).toMatchObject({
        severity: 'high',
        context: expect.objectContaining({
          component: 'PerformanceBudgetManager',
        }),
      });
    });

    it('aggregates multiple violations into multiple alerts', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([
        makeViolation({ metric: 'memoryUsage' }),
        makeViolation({
          metric: 'cpuUsage',
          severity: 'critical',
          violationPercentage: 200,
        }),
      ]);

      await manager.recordMetrics('svc', 100);

      expect(mockRepo.storeAlert).toHaveBeenCalledTimes(2);
      expect(mockedErrorMonitoring.reportError).toHaveBeenCalledTimes(1); // only the critical one
    });
  });

  describe('generateViolationMessage (via recordMetrics) — display names + units', () => {
    const cases: Array<[string, string]> = [
      ['responseTime', 'response time exceeded budget: 800.00ms'],
      ['memoryUsage', 'memory usage exceeded budget: 800.00MB'],
      ['cpuUsage', 'CPU usage exceeded budget: 800.00%'],
      ['apiCalls', 'API calls/min exceeded budget: 800.00/min'],
      ['errorRate', 'error rate exceeded budget: 800.00%'],
      ['downloadSize', 'download size exceeded budget: 800.00KB'],
    ];

    it.each(cases)('formats %s correctly', async (metric, expectedFragment) => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([
        makeViolation({ metric }),
      ]);
      await manager.recordMetrics('svc', 100);
      const alert = mockRepo.storeAlert.mock.calls[0][0] as PerformanceAlert;
      expect(alert.message).toContain(expectedFragment);
    });

    it('falls back to the raw metric name + empty unit for unknown metrics', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([
        makeViolation({ metric: 'somethingNew' }),
      ]);
      await manager.recordMetrics('svc', 100);
      const alert = mockRepo.storeAlert.mock.calls[0][0] as PerformanceAlert;
      expect(alert.message).toBe(
        'svc somethingNew exceeded budget: 800.00 > 500.00 (+60.0%)'
      );
    });
  });

  describe('triggerAlertHandlers error handling', () => {
    it('logs but does not throw when a handler rejects', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([makeViolation()]);

      const bad = jest.fn().mockRejectedValue(new Error('boom'));
      const good = jest.fn();
      manager.onAlert('bad', bad);
      manager.onAlert('good', good);

      await expect(manager.recordMetrics('svc', 800)).resolves.toBeUndefined();

      expect(good).toHaveBeenCalled();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Alert handler bad failed',
        expect.any(Error)
      );
    });
  });

  describe('startMonitoring / stopMonitoring / isMonitoring', () => {
    it('starts monitoring, sets the flag, schedules interval, and logs', () => {
      jest.useFakeTimers();
      expect(manager.isMonitoring()).toBe(false);
      manager.startMonitoring(1000);
      expect(manager.isMonitoring()).toBe(true);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Continuous monitoring started',
        { intervalMs: 1000 }
      );
    });

    it('uses the default interval when none provided', () => {
      jest.useFakeTimers();
      manager.startMonitoring();
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Continuous monitoring started',
        { intervalMs: 60000 }
      );
    });

    it('warns and no-ops when already monitoring', () => {
      jest.useFakeTimers();
      manager.startMonitoring(1000);
      mockedLogger.warn.mockClear();
      manager.startMonitoring(1000);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Monitoring already started'
      );
    });

    it('stops monitoring, clears the flag, and logs', () => {
      jest.useFakeTimers();
      manager.startMonitoring(1000);
      manager.stopMonitoring();
      expect(manager.isMonitoring()).toBe(false);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Continuous monitoring stopped'
      );
    });

    it('warns when stopping while not running', () => {
      manager.stopMonitoring();
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Monitoring not running'
      );
    });
  });

  describe('performScheduledMonitoring (via the scheduled interval)', () => {
    it('collects + records for each budgeted service then cleans up', async () => {
      jest.useFakeTimers();
      mockRepo.getAllBudgets.mockReturnValue(
        new Map<string, PerformanceBudget>([
          ['svcA', sampleBudget('svcA')],
          ['svcB', sampleBudget('svcB')],
        ])
      );
      // getBudget needed by recordMetrics
      mockRepo.getBudget.mockImplementation((n: string) => sampleBudget(n));
      mockCollector.collectMetrics.mockResolvedValue({
        responseTime: 123,
        memoryUsage: 10,
      });
      mockCollector.checkBudgetViolations.mockReturnValue([]);

      manager.startMonitoring(1000);
      await jest.advanceTimersByTimeAsync(1000);

      // collectMetrics called for both services (scheduled) + again inside recordMetrics
      expect(mockCollector.collectMetrics).toHaveBeenCalledWith('svcA');
      expect(mockCollector.collectMetrics).toHaveBeenCalledWith('svcB');
      expect(mockRepo.storeMetrics).toHaveBeenCalledTimes(2);
      expect(mockRepo.cleanup).toHaveBeenCalledTimes(1);
    });

    it('skips recordMetrics for a service when responseTime is undefined', async () => {
      jest.useFakeTimers();
      mockRepo.getAllBudgets.mockReturnValue(
        new Map<string, PerformanceBudget>([['svcA', sampleBudget('svcA')]])
      );
      mockRepo.getBudget.mockReturnValue(sampleBudget('svcA'));
      mockCollector.collectMetrics.mockResolvedValue({ memoryUsage: 5 }); // no responseTime
      manager.startMonitoring(1000);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockRepo.storeMetrics).not.toHaveBeenCalled();
      expect(mockRepo.cleanup).toHaveBeenCalledTimes(1);
    });

    it('logs an error when scheduled monitoring throws', async () => {
      jest.useFakeTimers();
      mockRepo.getAllBudgets.mockImplementation(() => {
        throw new Error('repo down');
      });
      manager.startMonitoring(1000);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Scheduled monitoring failed',
        expect.any(Error)
      );
    });
  });

  describe('alert handler registration', () => {
    it('onAlert registers a handler and logs', () => {
      const h = jest.fn();
      manager.onAlert('x', h);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Alert handler registered',
        { name: 'x' }
      );
    });

    it('removeAlertHandler removes a handler and logs', () => {
      manager.onAlert('x', jest.fn());
      manager.removeAlertHandler('x');
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PerformanceBudgetManager',
        'Alert handler removed',
        { name: 'x' }
      );
    });

    it('a removed handler is not invoked on subsequent violations', async () => {
      mockRepo.getBudget.mockReturnValue(sampleBudget('svc'));
      mockCollector.collectMetrics.mockResolvedValue({});
      mockCollector.checkBudgetViolations.mockReturnValue([makeViolation()]);
      const h = jest.fn();
      manager.onAlert('x', h);
      manager.removeAlertHandler('x');
      await manager.recordMetrics('svc', 800);
      expect(h).not.toHaveBeenCalled();
    });
  });

  describe('reporting + querying', () => {
    it('getPerformanceReport delegates to repository with the time range', () => {
      const report = {
        serviceName: 'svc',
        summary: { totalMetrics: 0 },
      } as PerformanceReport;
      mockRepo.generateReport.mockReturnValue(report);
      expect(manager.getPerformanceReport('svc', 5000)).toBe(report);
      expect(mockRepo.generateReport).toHaveBeenCalledWith('svc', 5000);
    });

    it('getMetrics delegates to repository with limit', () => {
      const metrics = [
        { serviceName: 'svc' },
      ] as unknown as PerformanceMetrics[];
      mockRepo.getMetrics.mockReturnValue(metrics);
      expect(manager.getMetrics('svc', 10)).toBe(metrics);
      expect(mockRepo.getMetrics).toHaveBeenCalledWith('svc', 10);
    });

    it('getAlerts for a specific service delegates directly', () => {
      const alerts = [{ serviceName: 'svc' }] as unknown as PerformanceAlert[];
      mockRepo.getAlerts.mockReturnValue(alerts);
      expect(manager.getAlerts('svc', 'critical')).toBe(alerts);
      expect(mockRepo.getAlerts).toHaveBeenCalledWith('svc', 'critical');
    });

    it('getAlerts without a service aggregates across all budgets, sorted desc by timestamp', () => {
      mockRepo.getAllBudgets.mockReturnValue(
        new Map<string, PerformanceBudget>([
          ['svcA', sampleBudget('svcA')],
          ['svcB', sampleBudget('svcB')],
        ])
      );
      const a: PerformanceAlert = {
        serviceName: 'svcA',
        metric: 'm',
        severity: 'warning',
        message: '',
        timestamp: 100,
        actual: 1,
        budget: 1,
        violationPercentage: 1,
      };
      const b: PerformanceAlert = { ...a, serviceName: 'svcB', timestamp: 300 };
      mockRepo.getAlerts.mockImplementation((service: string) =>
        service === 'svcA' ? [a] : [b]
      );

      const result = manager.getAlerts();
      expect(result).toEqual([b, a]); // newest first
      expect(mockRepo.getAlerts).toHaveBeenCalledWith('svcA', undefined);
      expect(mockRepo.getAlerts).toHaveBeenCalledWith('svcB', undefined);
    });
  });

  describe('getStatus', () => {
    it('returns monitoring flag, budget count, alert count and lastUpdate', () => {
      mockRepo.getAllBudgets.mockReturnValue(
        new Map<string, PerformanceBudget>([
          ['svcA', sampleBudget('svcA')],
          ['svcB', sampleBudget('svcB')],
        ])
      );
      mockRepo.getAlerts.mockReturnValue([]);

      const status = manager.getStatus();
      expect(status).toEqual({
        monitoring: false,
        budgetCount: 2,
        alertCount: 0,
        lastUpdate: NOW,
      });
    });

    it('reflects an active monitoring flag', () => {
      jest.useFakeTimers();
      mockRepo.getAllBudgets.mockReturnValue(new Map());
      manager.startMonitoring(1000);
      expect(manager.getStatus().monitoring).toBe(true);
    });
  });
});
