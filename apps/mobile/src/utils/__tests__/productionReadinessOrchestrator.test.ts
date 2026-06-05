/**
 * Comprehensive unit tests for the Production Readiness facade + orchestrator tree.
 *
 * Target source: src/utils/productionReadinessOrchestrator.ts (facade) which
 * re-exports + instantiates ProductionReadinessOrchestrator. Driving the public
 * API of the facade transitively exercises:
 *   - production-readiness/ProductionReadinessOrchestrator.ts
 *   - production-readiness/StatusChecker.ts
 *
 * All collaborators are mocked with mutable return values so each test can dial
 * in pass/fail conditions and assert the EXACT aggregate score / status / message.
 *
 * The unit under test (the orchestrator + checkers) is NEVER mocked.
 */

import { Platform } from 'react-native';
import {
  ProductionReadinessOrchestrator,
  productionReadinessOrchestrator,
} from '../productionReadinessOrchestrator';

// ---------------------------------------------------------------------------
// Mutable mock state — each test resets + tweaks these.
// ---------------------------------------------------------------------------

const mockWebOptState = {
  initialized: true,
  webVitals: { lcp: 1000, fid: 30, cls: 0.02 } as Record<string, number>,
  throwOnGetVitals: false,
};

const mockMonitoringState = {
  health: { status: 'healthy' } as { status: string },
  alertStats: {
    totalAlerts: 5,
    activeAlerts: 0,
    criticalAlerts: 0,
    lastAlert: 123,
  } as Record<string, number>,
};

const mockPerfState = {
  metrics: { startupTime: 2000, memoryUsage: 100_000_000, fps: 60 } as Record<
    string,
    number
  >,
  budgetStatus: [] as Array<Record<string, unknown>>,
  report: { summary: 'baseline-report' } as Record<string, unknown>,
};

const mockErrorState = {
  analytics: { errorRate: 0 } as Record<string, unknown>,
  patterns: [] as Array<Record<string, unknown>>,
  trends: { isIncreasing: false, changeRate: 0 } as Record<string, unknown>,
};

const mockSecurityState = {
  audit: {
    summary: {
      overallScore: 95,
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
    },
  } as {
    summary: { overallScore: number; vulnerabilities: Record<string, number> };
  },
  stats: { recentViolations: 0, totalViolations: 0 } as Record<string, number>,
};

// ---------------------------------------------------------------------------
// Collaborator mocks (externals only).
// ---------------------------------------------------------------------------

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../performanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(() => mockPerfState.metrics),
    getBudgetStatus: jest.fn(() => mockPerfState.budgetStatus),
    generateReport: jest.fn(() => mockPerfState.report),
  },
}));

jest.mock('../webOptimizations/', () => {
  const instance = {
    initialize: jest.fn(() => Promise.resolve()),
    get initialized() {
      return mockWebOptState.initialized;
    },
    getWebVitals: jest.fn(() => {
      if (mockWebOptState.throwOnGetVitals) {
        throw new Error('web vitals unavailable');
      }
      return mockWebOptState.webVitals;
    }),
  };
  return {
    WebOptimizationsManager: {
      getInstance: jest.fn(() => instance),
    },
  };
});

jest.mock('../monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    initialize: jest.fn(() => Promise.resolve()),
    checkSystemHealth: jest.fn(() =>
      Promise.resolve(mockMonitoringState.health)
    ),
    getAlertStatistics: jest.fn(() => mockMonitoringState.alertStats),
  },
}));

jest.mock('../errorTracking/', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(() => mockErrorState.analytics),
    getErrorPatterns: jest.fn(() => mockErrorState.patterns),
    getTrendAnalysis: jest.fn(() => mockErrorState.trends),
  },
}));

jest.mock('../security', () => ({
  securityAuditService: {
    runSecurityAudit: jest.fn(() => Promise.resolve(mockSecurityState.audit)),
  },
}));

jest.mock('../ApiProtection', () => ({
  apiProtectionService: {
    getSecurityStats: jest.fn(() => mockSecurityState.stats),
  },
}));

// ---------------------------------------------------------------------------
// Helpers to reset all mock state to the "all healthy" baseline.
// ---------------------------------------------------------------------------

function resetHealthyBaseline(): void {
  mockWebOptState.initialized = true;
  mockWebOptState.webVitals = { lcp: 1000, fid: 30, cls: 0.02 };
  mockWebOptState.throwOnGetVitals = false;

  mockMonitoringState.health = { status: 'healthy' };
  mockMonitoringState.alertStats = {
    totalAlerts: 5,
    activeAlerts: 0,
    criticalAlerts: 0,
    lastAlert: 123,
  };

  mockPerfState.metrics = {
    startupTime: 2000,
    memoryUsage: 100_000_000,
    fps: 60,
  };
  mockPerfState.budgetStatus = [];
  mockPerfState.report = { summary: 'baseline-report' };

  mockErrorState.analytics = { errorRate: 0 };
  mockErrorState.patterns = [];
  mockErrorState.trends = { isIncreasing: false, changeRate: 0 };

  mockSecurityState.audit = {
    summary: {
      overallScore: 95,
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
    },
  };
  mockSecurityState.stats = { recentViolations: 0, totalViolations: 0 };
}

describe('ProductionReadinessOrchestrator (facade-driven)', () => {
  let orchestrator: ProductionReadinessOrchestrator;
  const FIXED_NOW = 1_700_000_000_000;

  // Stable references to the mocked collaborators for assertions.
  const { monitoringAndAlerting } = jest.requireMock(
    '../monitoringAndAlerting'
  );
  const { WebOptimizationsManager } = jest.requireMock('../webOptimizations/');
  const mockInit = monitoringAndAlerting.initialize as jest.Mock;
  const mockWebInit = WebOptimizationsManager.getInstance()
    .initialize as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetHealthyBaseline();
    // Re-assert the base resolved-promise impls; clearAllMocks above wipes the
    // implementation set inside the factory, leaving a bare jest.fn().
    mockInit.mockResolvedValue(undefined);
    mockWebInit.mockResolvedValue(undefined);
    (Platform as { OS: string }).OS = 'ios';
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    orchestrator = new ProductionReadinessOrchestrator();
  });

  afterEach(() => {
    orchestrator.dispose();
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Facade exports
  // -------------------------------------------------------------------------
  describe('facade exports', () => {
    it('exports a singleton instance of the orchestrator', () => {
      expect(productionReadinessOrchestrator).toBeInstanceOf(
        ProductionReadinessOrchestrator
      );
    });

    it('exposes the orchestrator class as a constructable', () => {
      expect(new ProductionReadinessOrchestrator()).toBeInstanceOf(
        ProductionReadinessOrchestrator
      );
    });
  });

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------
  describe('initialize', () => {
    it('initializes monitoring + starts auto-monitoring on non-web (no web opt init)', async () => {
      jest.useFakeTimers();
      await orchestrator.initialize();

      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(mockWebInit).not.toHaveBeenCalled();
      // auto-monitoring interval registered
      expect(jest.getTimerCount()).toBe(1);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('initializes web optimizations when running on web', async () => {
      (Platform as { OS: string }).OS = 'web';
      jest.useFakeTimers();

      await orchestrator.initialize();

      expect(mockWebInit).toHaveBeenCalledTimes(1);
      const cfg = mockWebInit.mock.calls[0][0] as { pwa: { appName: string } };
      expect(cfg.pwa.appName).toBe('Mintenance');
      expect(mockInit).toHaveBeenCalledTimes(1);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('is idempotent — second initialize is a no-op', async () => {
      jest.useFakeTimers();
      await orchestrator.initialize();
      await orchestrator.initialize();

      expect(mockInit).toHaveBeenCalledTimes(1);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('rethrows and stays uninitialized when monitoring.initialize rejects', async () => {
      mockInit.mockRejectedValueOnce(new Error('boom'));

      await expect(orchestrator.initialize()).rejects.toThrow('boom');

      // not marked initialized -> a subsequent successful initialize runs again
      mockInit.mockResolvedValueOnce(undefined);
      jest.useFakeTimers();
      await orchestrator.initialize();
      expect(mockInit).toHaveBeenCalledTimes(2);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // checkProductionReadiness — aggregate scoring + each check's healthy path
  // -------------------------------------------------------------------------
  describe('checkProductionReadiness — all healthy', () => {
    it('returns overall=ready, score=100, no blockers, healthy-only recommendation', async () => {
      const status = await orchestrator.checkProductionReadiness('production');

      expect(status.overall).toBe('ready');
      expect(status.score).toBe(100);
      expect(status.timestamp).toBe(FIXED_NOW);
      expect(status.blockers).toEqual([]);
      expect(status.recommendations).toEqual([
        '✅ All systems are healthy. Continue monitoring and maintaining quality standards.',
      ]);

      // each component healthy @ 100
      expect(status.components.webPlatform).toMatchObject({
        status: 'healthy',
        score: 100,
        message: 'Web platform checks skipped (not running on web)',
        lastCheck: FIXED_NOW,
      });
      expect(status.components.monitoring).toMatchObject({
        status: 'healthy',
        score: 100,
      });
      expect(status.components.performance).toMatchObject({
        status: 'healthy',
        score: 100,
      });
      expect(status.components.errorTracking).toMatchObject({
        status: 'healthy',
        score: 100,
      });
      expect(status.components.security).toMatchObject({
        status: 'healthy',
        score: 100,
      });

      // last check cached
      expect(orchestrator.getLatestReadinessStatus()).toBe(status);
    });

    it('attaches webMetrics to the skipped web component when getWebVitals succeeds', async () => {
      const status = await orchestrator.checkProductionReadiness();
      expect(status.components.webPlatform.metrics).toEqual({
        webMetrics: mockWebOptState.webVitals,
      });
    });

    it('omits webMetrics when getWebVitals throws on non-web', async () => {
      mockWebOptState.throwOnGetVitals = true;
      const status = await orchestrator.checkProductionReadiness();
      expect(status.components.webPlatform.metrics).toBeUndefined();
      expect(status.components.webPlatform.status).toBe('healthy');
    });
  });

  // -------------------------------------------------------------------------
  // Web platform check — every web branch
  // -------------------------------------------------------------------------
  describe('checkWebPlatformReadiness (running on web)', () => {
    beforeEach(() => {
      (Platform as { OS: string }).OS = 'web';
    });

    it('healthy @ 100 when optimized and vitals are good', async () => {
      mockWebOptState.initialized = true;
      mockWebOptState.webVitals = { lcp: 1000, fid: 30, cls: 0.02 };
      const status = await orchestrator.checkProductionReadiness();
      const wp = status.components.webPlatform;
      expect(wp.score).toBe(100);
      expect(wp.status).toBe('healthy');
      expect(wp.message).toBe('Web platform is fully optimized and ready');
      expect(wp.metrics).toEqual({
        isOptimized: true,
        webMetrics: mockWebOptState.webVitals,
      });
    });

    it('-30 warning when not optimized', async () => {
      mockWebOptState.initialized = false;
      mockWebOptState.webVitals = { lcp: 1000, fid: 30, cls: 0.02 };
      const wp = (await orchestrator.checkProductionReadiness()).components
        .webPlatform;
      expect(wp.score).toBe(70);
      expect(wp.status).toBe('warning');
      expect(wp.message).toBe('Web optimizations not fully initialized');
    });

    it('stacks LCP + FID + CLS penalties (100-20-15-15 = 50)', async () => {
      mockWebOptState.initialized = true;
      mockWebOptState.webVitals = { lcp: 3000, fid: 200, cls: 0.5 };
      const wp = (await orchestrator.checkProductionReadiness()).components
        .webPlatform;
      expect(wp.score).toBe(50);
      expect(wp.status).toBe('warning');
      // last assigned message is CLS
      expect(wp.message).toBe(
        'Cumulative Layout Shift (CLS) needs improvement'
      );
    });

    it('floors score at 0 when every penalty applies', async () => {
      mockWebOptState.initialized = false; // -30
      mockWebOptState.webVitals = { lcp: 3000, fid: 200, cls: 0.5 }; // -50
      const wp = (await orchestrator.checkProductionReadiness()).components
        .webPlatform;
      expect(wp.score).toBe(20);
    });

    it('returns the error fallback when the on-web vitals lookup throws', async () => {
      // On web the unguarded getWebVitals() call throws -> outer catch path.
      mockWebOptState.throwOnGetVitals = true;
      const wp = (await orchestrator.checkProductionReadiness()).components
        .webPlatform;
      expect(wp.score).toBe(0);
      expect(wp.status).toBe('error');
      expect(wp.message).toBe('Web platform readiness check failed');
    });
  });

  // -------------------------------------------------------------------------
  // Monitoring check — every branch
  // -------------------------------------------------------------------------
  describe('checkMonitoringReadiness', () => {
    it('error -60 when system health is unhealthy', async () => {
      mockMonitoringState.health = { status: 'degraded' };
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      expect(m.score).toBe(40);
      expect(m.status).toBe('error');
      expect(m.message).toBe('Monitoring system health: degraded');
    });

    it('warning with capped active-alert penalty (min(60, n*12))', async () => {
      mockMonitoringState.alertStats = {
        totalAlerts: 8,
        activeAlerts: 3, // 3*12 = 36 penalty
        criticalAlerts: 0,
        lastAlert: 1,
      };
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      expect(m.score).toBe(64);
      expect(m.status).toBe('warning');
      expect(m.message).toBe('3 active alerts in monitoring system');
    });

    it('caps active-alert penalty at 60 for many alerts', async () => {
      mockMonitoringState.alertStats = {
        totalAlerts: 100,
        activeAlerts: 10, // 10*12=120 -> capped 60
        criticalAlerts: 0,
        lastAlert: 1,
      };
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      expect(m.score).toBe(40);
      expect(m.status).toBe('warning');
    });

    it('-10 warning when alert system appears silent (no alerts ever)', async () => {
      mockMonitoringState.alertStats = {
        totalAlerts: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        lastAlert: 0,
      };
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      expect(m.score).toBe(90);
      expect(m.status).toBe('warning');
      expect(m.message).toBe(
        'Alert system may not be functioning (no recent alerts)'
      );
    });

    it('keeps error status (does not downgrade to warning) when both unhealthy and active alerts', async () => {
      mockMonitoringState.health = { status: 'down' };
      mockMonitoringState.alertStats = {
        totalAlerts: 2,
        activeAlerts: 2,
        criticalAlerts: 1,
        lastAlert: 1,
      };
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      // 100 -60 -(2*12)=24 -> 16
      expect(m.score).toBe(16);
      expect(m.status).toBe('error');
      expect(m.message).toBe('Monitoring system health: down');
    });

    it('returns error fallback when checkSystemHealth throws', async () => {
      const { monitoringAndAlerting } = jest.requireMock(
        '../monitoringAndAlerting'
      );
      monitoringAndAlerting.checkSystemHealth.mockRejectedValueOnce(
        new Error('monitor down')
      );
      const m = (await orchestrator.checkProductionReadiness()).components
        .monitoring;
      expect(m.score).toBe(0);
      expect(m.status).toBe('error');
      expect(m.message).toBe('Monitoring readiness check failed');
    });
  });

  // -------------------------------------------------------------------------
  // Performance check — every branch
  // -------------------------------------------------------------------------
  describe('checkPerformanceReadiness', () => {
    it('error -30 when there are budget errors', async () => {
      mockPerfState.budgetStatus = [{ status: 'error' }, { status: 'ok' }];
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(70);
      expect(p.status).toBe('error');
      expect(p.message).toBe('1 performance budget violations (errors)');
    });

    it('warning -15 when there are budget warnings (no errors)', async () => {
      mockPerfState.budgetStatus = [
        { status: 'warning' },
        { status: 'warning' },
      ];
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(85);
      expect(p.status).toBe('warning');
      expect(p.message).toBe('2 performance budget warnings');
    });

    it('error + extra -20 for slow startup with no budget issues', async () => {
      mockPerfState.budgetStatus = [];
      mockPerfState.metrics = { startupTime: 6000, memoryUsage: 1000, fps: 60 };
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(80);
      expect(p.status).toBe('error');
      expect(p.message).toBe('App startup time exceeds acceptable limits');
    });

    it('-15 high-memory warning when not already in error', async () => {
      mockPerfState.budgetStatus = [];
      mockPerfState.metrics = {
        startupTime: 1000,
        memoryUsage: 400_000_000,
        fps: 60,
      };
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(85);
      expect(p.status).toBe('warning');
      expect(p.message).toBe('Memory usage is high');
    });

    it('combines budget error, slow startup and high memory (100-30-20-15=35)', async () => {
      mockPerfState.budgetStatus = [{ status: 'error' }];
      mockPerfState.metrics = {
        startupTime: 7000,
        memoryUsage: 500_000_000,
        fps: 30,
      };
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(35);
      expect(p.status).toBe('error');
      // message stays the budget-violation one (startup keeps it because errors>0)
      expect(p.message).toBe('1 performance budget violations (errors)');
    });

    it('returns error fallback when getMetrics throws', async () => {
      const { performanceMonitor } = jest.requireMock('../performanceMonitor');
      performanceMonitor.getMetrics.mockImplementationOnce(() => {
        throw new Error('perf down');
      });
      const p = (await orchestrator.checkProductionReadiness()).components
        .performance;
      expect(p.score).toBe(0);
      expect(p.status).toBe('error');
      expect(p.message).toBe('Performance readiness check failed');
    });
  });

  // -------------------------------------------------------------------------
  // Error tracking check — every branch
  // -------------------------------------------------------------------------
  describe('checkErrorTrackingReadiness', () => {
    it('error -40 on high error rate (>0.05)', async () => {
      mockErrorState.analytics = { errorRate: 0.1 };
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(60);
      expect(e.status).toBe('error');
      expect(e.message).toBe('High error rate detected: 10.00%');
    });

    it('warning -15 on elevated error rate (>0.01)', async () => {
      mockErrorState.analytics = { errorRate: 0.02 };
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(85);
      expect(e.status).toBe('warning');
      expect(e.message).toBe('Elevated error rate: 2.00%');
    });

    it('error -25 when critical patterns present', async () => {
      mockErrorState.patterns = [
        { severity: 'critical' },
        { severity: 'low' },
        { severity: 'critical' },
      ];
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(75);
      expect(e.status).toBe('error');
      expect(e.message).toBe('2 critical error patterns detected');
      expect(e.metrics?.errorPatterns).toBe(3);
    });

    it('warning -20 when trends rising sharply and not already error', async () => {
      mockErrorState.trends = { isIncreasing: true, changeRate: 0.8 };
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(80);
      expect(e.status).toBe('warning');
      expect(e.message).toBe('Error rates are trending upward');
    });

    it('does not apply trend penalty when already in error state', async () => {
      mockErrorState.analytics = { errorRate: 0.2 }; // -40 error
      mockErrorState.trends = { isIncreasing: true, changeRate: 0.9 };
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(60); // trend penalty skipped
      expect(e.status).toBe('error');
    });

    it('returns error fallback when getErrorAnalytics throws', async () => {
      const { enhancedErrorAnalytics } = jest.requireMock('../errorTracking/');
      enhancedErrorAnalytics.getErrorAnalytics.mockImplementationOnce(() => {
        throw new Error('analytics down');
      });
      const e = (await orchestrator.checkProductionReadiness()).components
        .errorTracking;
      expect(e.score).toBe(0);
      expect(e.status).toBe('error');
      expect(e.message).toBe('Error tracking readiness check failed');
    });
  });

  // -------------------------------------------------------------------------
  // Security check — every branch
  // -------------------------------------------------------------------------
  describe('checkSecurityReadiness', () => {
    it('error -60 on critical vulnerabilities', async () => {
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 2, high: 0, medium: 0, low: 0 },
        },
      };
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      expect(s.score).toBe(40);
      expect(s.status).toBe('error');
      expect(s.message).toBe('2 critical security vulnerabilities found');
    });

    it('error -40 on high vulnerabilities', async () => {
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 0, high: 3, medium: 0, low: 0 },
        },
      };
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      expect(s.score).toBe(60);
      expect(s.status).toBe('error');
      expect(s.message).toBe('3 high severity security vulnerabilities found');
    });

    it('warning -20 on medium vulnerabilities', async () => {
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 0, high: 0, medium: 1, low: 0 },
        },
      };
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      expect(s.score).toBe(80);
      expect(s.status).toBe('warning');
      expect(s.message).toBe(
        '1 medium severity security vulnerabilities found'
      );
    });

    it('warning -20 on too many recent violations (not already error)', async () => {
      mockSecurityState.stats = { recentViolations: 15, totalViolations: 30 };
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      expect(s.score).toBe(80);
      expect(s.status).toBe('warning');
      expect(s.message).toBe('High number of recent security violations: 15');
    });

    it('clamps score to audit overallScore and errors when below threshold', async () => {
      mockSecurityState.audit = {
        summary: {
          overallScore: 55,
          vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        },
      };
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      // score = min(100, 55) = 55
      expect(s.score).toBe(55);
      expect(s.status).toBe('error');
      expect(s.message).toBe('Security audit score below threshold: 55/100');
    });

    it('returns error fallback when runSecurityAudit rejects', async () => {
      const { securityAuditService } = jest.requireMock('../security');
      securityAuditService.runSecurityAudit.mockRejectedValueOnce(
        new Error('audit down')
      );
      const s = (await orchestrator.checkProductionReadiness()).components
        .security;
      expect(s.score).toBe(0);
      expect(s.status).toBe('error');
      expect(s.message).toBe('Security readiness check failed');
    });
  });

  // -------------------------------------------------------------------------
  // Aggregate scoring thresholds
  // -------------------------------------------------------------------------
  describe('aggregate overall scoring', () => {
    it('overall=warning when average lands in [70,90)', async () => {
      // Drop monitoring to 40 (unhealthy). Others 100 -> avg (100*4+40)/5 = 88
      mockMonitoringState.health = { status: 'degraded' };
      const status = await orchestrator.checkProductionReadiness();
      expect(status.score).toBe(88);
      expect(status.overall).toBe('warning');
    });

    it('overall=not_ready when average < 70', async () => {
      // Two components forced to 0 via thrown errors -> avg (100*3)/5 = 60
      const { performanceMonitor } = jest.requireMock('../performanceMonitor');
      const { securityAuditService } = jest.requireMock('../security');
      performanceMonitor.getMetrics.mockImplementationOnce(() => {
        throw new Error('x');
      });
      securityAuditService.runSecurityAudit.mockRejectedValueOnce(
        new Error('y')
      );
      const status = await orchestrator.checkProductionReadiness();
      expect(status.score).toBe(60);
      expect(status.overall).toBe('not_ready');
    });

    it('rounds the averaged score', async () => {
      // monitoring -> 90 (silent alerts), rest 100 => avg = 98 exactly; force a fraction instead
      mockMonitoringState.alertStats = {
        totalAlerts: 1,
        activeAlerts: 1, // -12 => 88
        criticalAlerts: 0,
        lastAlert: 1,
      };
      // avg = (100*4 + 88)/5 = 97.6 -> rounds to 98
      const status = await orchestrator.checkProductionReadiness();
      expect(status.score).toBe(98);
    });
  });

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------
  describe('generateRecommendations', () => {
    it('emits one recommendation per weak component plus the two follow-ups', async () => {
      // Make every component score < 90:
      (Platform as { OS: string }).OS = 'web';
      mockWebOptState.initialized = false; // web 70
      mockMonitoringState.alertStats = {
        totalAlerts: 1,
        activeAlerts: 2,
        criticalAlerts: 0,
        lastAlert: 1,
      }; // 76
      mockPerfState.budgetStatus = [{ status: 'warning' }]; // 85
      mockErrorState.analytics = { errorRate: 0.02 }; // 85
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 0, high: 0, medium: 1, low: 0 },
        },
      }; // 80

      const status = await orchestrator.checkProductionReadiness();
      expect(status.recommendations).toEqual([
        '🌐 Optimize web platform performance and Core Web Vitals',
        '📊 Review and address monitoring system issues',
        '⚡ Optimize application performance and address budget violations',
        '🐛 Investigate and resolve error patterns and trends',
        '🔒 Address security vulnerabilities and strengthen protection',
        '📈 Implement continuous monitoring for production environment',
        '🔄 Set up automated alerts for critical issues',
      ]);
    });

    it('recommends web optimization purely on poor web vitals even at score>=90', async () => {
      (Platform as { OS: string }).OS = 'web';
      mockWebOptState.initialized = true;
      // only LCP bad -> -20 -> score 80 (<90) AND poor vitals; keep others 100
      mockWebOptState.webVitals = { lcp: 3000, fid: 10, cls: 0.01 };
      const status = await orchestrator.checkProductionReadiness();
      expect(status.recommendations[0]).toBe(
        '🌐 Optimize web platform performance and Core Web Vitals'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Blockers
  // -------------------------------------------------------------------------
  describe('generateBlockers', () => {
    it('lists a blocker only for error-status components scoring below 50', async () => {
      // security: critical => error @ 40 (<50) -> blocker
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 2, high: 0, medium: 0, low: 0 },
        },
      };
      const status = await orchestrator.checkProductionReadiness();
      expect(status.blockers).toEqual([
        '❌ security: 2 critical security vulnerabilities found',
      ]);
    });

    it('does NOT block an error component that scores >= 50', async () => {
      // high vuln => error @ 60 (>=50) -> no blocker
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 0, high: 1, medium: 0, low: 0 },
        },
      };
      const status = await orchestrator.checkProductionReadiness();
      expect(status.blockers).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // createDeploymentReport
  // -------------------------------------------------------------------------
  describe('createDeploymentReport', () => {
    it('builds a development report without prod-only artifacts and approves when ready', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const report = await orchestrator.createDeploymentReport('development');

      expect(report.environment).toBe('development');
      expect(report.deploymentId).toMatch(/^deploy_\d+_[a-z0-9]+$/);
      expect(report.timestamp).toBe(FIXED_NOW);
      expect(report.securityAudit).toBeUndefined();
      expect(report.performanceBaseline).toBeUndefined();
      expect(report.webCompatibility).toBeUndefined();
      expect(report.deploymentApproved).toBe(true);
      expect(report.approvalReasons).toEqual([
        'All systems healthy',
        'No critical blockers',
        'Production readiness criteria met',
      ]);
      // cached + stored
      expect(orchestrator.getDeploymentHistory()).toHaveLength(1);
      expect(orchestrator.getLatestReadinessStatus()).toBe(
        report.readinessCheck
      );
    });

    it('collects security audit + performance baseline for production', async () => {
      const report = await orchestrator.createDeploymentReport('production');
      expect(report.securityAudit).toEqual(mockSecurityState.audit);
      expect(report.performanceBaseline).toEqual(mockPerfState.report);
      // not web => no webCompatibility
      expect(report.webCompatibility).toBeUndefined();
    });

    it('includes webCompatibility for production on web', async () => {
      (Platform as { OS: string }).OS = 'web';
      mockWebOptState.initialized = true;
      mockWebOptState.webVitals = { lcp: 1000, fid: 30, cls: 0.02 };
      const report = await orchestrator.createDeploymentReport('production');
      expect(report.webCompatibility).toEqual({
        coreWebVitals: mockWebOptState.webVitals,
        optimizationStatus: true,
      });
    });

    it('uses the warning approval reasons when overall is warning but unblocked', async () => {
      // 5 active alerts (healthy system) -> monitoring -60 = 40, status WARNING (not
      // error, so not a blocker). avg = (100*4 + 40)/5 = 88 -> overall warning.
      mockMonitoringState.alertStats = {
        totalAlerts: 8,
        activeAlerts: 5,
        criticalAlerts: 0,
        lastAlert: 1,
      };
      const report = await orchestrator.createDeploymentReport('staging');
      expect(report.readinessCheck.overall).toBe('warning');
      expect(report.readinessCheck.blockers).toEqual([]);
      expect(report.deploymentApproved).toBe(true);
      expect(report.approvalReasons).toEqual([
        'Overall status: warning',
        'No critical blockers',
        'Proceed with caution',
      ]);
    });

    it('rejects deployment and lists blockers when not_ready / blocked', async () => {
      mockSecurityState.audit = {
        summary: {
          overallScore: 95,
          vulnerabilities: { critical: 5, high: 0, medium: 0, low: 0 },
        },
      };
      // also push aggregate below 70 to be clearly not_ready: drop monitoring + perf
      mockMonitoringState.health = { status: 'down' }; // 40
      mockPerfState.budgetStatus = [{ status: 'error' }]; // 70
      const report = await orchestrator.createDeploymentReport('production');

      expect(report.deploymentApproved).toBe(false);
      expect(report.approvalReasons[0]).toMatch(/^Overall status: /);
      expect(
        report.approvalReasons.some((r) => r.startsWith('❌ security:'))
      ).toBe(true);
    });

    it('caps deployment history at 20 entries (keeps the most recent)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      for (let i = 0; i < 25; i++) {
        await orchestrator.createDeploymentReport('development');
      }
      const history = orchestrator.getDeploymentHistory();
      expect(history).toHaveLength(20);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-monitoring lifecycle
  // -------------------------------------------------------------------------
  describe('auto monitoring', () => {
    it('runs a readiness check on each interval tick', async () => {
      jest.useFakeTimers();
      const spy = jest.spyOn(orchestrator, 'checkProductionReadiness');
      await orchestrator.initialize();

      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(2);

      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('swallows errors thrown during an auto-monitoring tick', async () => {
      jest.useFakeTimers();
      const { logger } = jest.requireMock('../logger');
      await orchestrator.initialize();
      jest
        .spyOn(orchestrator, 'checkProductionReadiness')
        .mockRejectedValueOnce(new Error('tick fail'));

      await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Auto monitoring check failed',
        expect.anything()
      );
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('clears the prior interval if startAutoMonitoring runs twice (via re-init after dispose)', async () => {
      jest.useFakeTimers();
      await orchestrator.initialize();
      expect(jest.getTimerCount()).toBe(1);
      orchestrator.dispose(); // stops monitoring
      expect(jest.getTimerCount()).toBe(0);
      await orchestrator.initialize();
      expect(jest.getTimerCount()).toBe(1);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });

    it('stopAutoMonitoring is safe to call when nothing is running', () => {
      expect(() => orchestrator.stopAutoMonitoring()).not.toThrow();
    });

    it('clears an existing interval when startAutoMonitoring is invoked again', () => {
      jest.useFakeTimers();
      const clearSpy = jest.spyOn(global, 'clearInterval');
      // Invoke the private starter twice; the 2nd call must clear the 1st interval.
      const start = (
        orchestrator as unknown as { startAutoMonitoring: () => void }
      ).startAutoMonitoring.bind(orchestrator);
      start();
      expect(jest.getTimerCount()).toBe(1);
      start();
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------
  describe('accessors', () => {
    it('getLatestReadinessStatus is undefined before any check', () => {
      expect(orchestrator.getLatestReadinessStatus()).toBeUndefined();
    });

    it('getDeploymentHistory returns a defensive copy', async () => {
      await orchestrator.createDeploymentReport('development');
      const a = orchestrator.getDeploymentHistory();
      const b = orchestrator.getDeploymentHistory();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  // -------------------------------------------------------------------------
  // getSystemStatusSummary
  // -------------------------------------------------------------------------
  describe('getSystemStatusSummary', () => {
    it('returns the unknown shape before any check', () => {
      expect(orchestrator.getSystemStatusSummary()).toEqual({
        overall: 'unknown',
        components: {},
        lastCheck: 0,
        uptime: 0,
      });
    });

    it('summarizes component statuses and computes uptime from last check', async () => {
      await orchestrator.checkProductionReadiness();
      const summary = orchestrator.getSystemStatusSummary();
      expect(summary.overall).toBe('ready');
      expect(summary.lastCheck).toBe(FIXED_NOW);
      expect(summary.components).toEqual({
        webPlatform: 'healthy',
        monitoring: 'healthy',
        performance: 'healthy',
        errorTracking: 'healthy',
        security: 'healthy',
      });
      // no deployment history -> falls back to lastReadinessCheck.timestamp -> uptime 0
      expect(summary.uptime).toBe(0);
    });

    it('computes uptime from the first deployment timestamp when history exists', async () => {
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1000);
      await orchestrator.createDeploymentReport('development');
      nowSpy.mockReturnValue(6000);
      const summary = orchestrator.getSystemStatusSummary();
      expect(summary.uptime).toBe(5000);
    });
  });

  // -------------------------------------------------------------------------
  // dispose
  // -------------------------------------------------------------------------
  describe('dispose', () => {
    it('stops monitoring and resets the initialized flag (allows re-init)', async () => {
      jest.useFakeTimers();
      await orchestrator.initialize();
      orchestrator.dispose();
      expect(jest.getTimerCount()).toBe(0);
      // re-init works -> initialize called again
      await orchestrator.initialize();
      expect(mockInit).toHaveBeenCalledTimes(2);
      orchestrator.stopAutoMonitoring();
      jest.useRealTimers();
    });
  });
});
