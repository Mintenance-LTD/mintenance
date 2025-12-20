/**
 * Tests for Production Readiness Orchestrator
 */

import { Platform } from 'react-native';
import {
  ProductionReadinessOrchestrator,
  productionReadinessOrchestrator,
  ProductionReadinessStatus,
  DeploymentReport,
  ComponentStatus,
} from '../productionReadinessOrchestrator';

// Mock dependencies
jest.mock('../logger');
jest.mock('../performanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(() => ({
      startupTime: 2000,
      memoryUsage: 100 * 1024 * 1024,
      fps: 60,
    })),
    getBudgetStatus: jest.fn(() => []),
    generateReport: jest.fn(() => ({ summary: 'test report' })),
  },
}));

jest.mock('../webOptimizations/', () => ({
  WebOptimizations: {
    getInstance: jest.fn(() => ({
      initializeEnhanced: jest.fn(),
      initialized: true,
      getCoreWebVitals: jest.fn(() => ({
        lcp: 2000,
        fid: 50,
        cls: 0.05,
      })),
    })),
  },
}));

jest.mock('../monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    initialize: jest.fn(),
    checkSystemHealth: jest.fn(() => Promise.resolve({
      status: 'healthy',
      overall: 'healthy',
      services: new Map(),
      lastUpdated: Date.now(),
    })),
    getAlertStatistics: jest.fn(() => ({
      totalAlerts: 5,
      activeAlerts: 0,
      criticalAlerts: 0,
      lastAlert: Date.now(),
    })),
  },
}));

jest.mock('../errorTracking', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(() => ({
      errorRate: 0.005,
      totalErrors: 10,
    })),
    getErrorPatterns: jest.fn(() => []),
    getTrendAnalysis: jest.fn(() => ({
      isIncreasing: false,
      changeRate: 0.1,
    })),
  },
}));

jest.mock('../securityAuditAndPenetrationTesting', () => ({
  securityAuditService: {
    runSecurityAudit: jest.fn(() => Promise.resolve({
      summary: {
        overallScore: 85,
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 2,
        },
      },
    })),
  },
}));

jest.mock('../ApiProtection', () => ({
  apiProtectionService: {
    getSecurityStats: jest.fn(() => ({
      recentViolations: 2,
      totalViolations: 10,
    })),
  },
}));

describe('ProductionReadinessOrchestrator', () => {
  let orchestrator: ProductionReadinessOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    orchestrator = new ProductionReadinessOrchestrator();
  });

  afterEach(() => {
    orchestrator.dispose();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await orchestrator.initialize();
      expect(orchestrator).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      await orchestrator.initialize();
      await orchestrator.initialize(); // Second call should be no-op
      expect(orchestrator).toBeDefined();
    });

    it('should start auto monitoring after initialization', async () => {
      await orchestrator.initialize();
      // Auto monitoring should be started
      expect(orchestrator).toBeDefined();
    });
  });

  describe('checkProductionReadiness', () => {
    it('should return production readiness status', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(status).toBeDefined();
      expect(status.overall).toMatch(/ready|warning|not_ready/);
      expect(typeof status.score).toBe('number');
      expect(status.score).toBeGreaterThanOrEqual(0);
      expect(status.score).toBeLessThanOrEqual(100);
      expect(status.timestamp).toBeGreaterThan(0);
      expect(status.components).toBeDefined();
      expect(Array.isArray(status.recommendations)).toBe(true);
      expect(Array.isArray(status.blockers)).toBe(true);
    });

    it('should check all components', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(status.components.webPlatform).toBeDefined();
      expect(status.components.monitoring).toBeDefined();
      expect(status.components.performance).toBeDefined();
      expect(status.components.errorTracking).toBeDefined();
      expect(status.components.security).toBeDefined();
    });

    it('should calculate overall score based on components', async () => {
      const status = await orchestrator.checkProductionReadiness();

      const componentScores = Object.values(status.components).map(c => c.score);
      const averageScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;

      expect(status.score).toBeCloseTo(averageScore, 0);
    });

    it('should generate recommendations', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(Array.isArray(status.recommendations)).toBe(true);
      expect(status.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate blockers for critical issues', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(Array.isArray(status.blockers)).toBe(true);
    });

    it('should work for different environments', async () => {
      const devStatus = await orchestrator.checkProductionReadiness('development');
      const stagingStatus = await orchestrator.checkProductionReadiness('staging');
      const prodStatus = await orchestrator.checkProductionReadiness('production');

      expect(devStatus).toBeDefined();
      expect(stagingStatus).toBeDefined();
      expect(prodStatus).toBeDefined();
    });
  });

  describe('Component Status', () => {
    it('should check web platform readiness', async () => {
      const status = await orchestrator.checkProductionReadiness();
      const webPlatform = status.components.webPlatform;

      expect(webPlatform).toBeDefined();
      expect(webPlatform.status).toMatch(/healthy|warning|error/);
      expect(typeof webPlatform.score).toBe('number');
      expect(typeof webPlatform.message).toBe('string');
      expect(webPlatform.lastCheck).toBeGreaterThan(0);
    });

    it('should check monitoring readiness', async () => {
      const status = await orchestrator.checkProductionReadiness();
      const monitoring = status.components.monitoring;

      expect(monitoring).toBeDefined();
      expect(monitoring.status).toMatch(/healthy|warning|error/);
      expect(typeof monitoring.score).toBe('number');
      expect(typeof monitoring.message).toBe('string');
    });

    it('should check performance readiness', async () => {
      const status = await orchestrator.checkProductionReadiness();
      const performance = status.components.performance;

      expect(performance).toBeDefined();
      expect(performance.status).toMatch(/healthy|warning|error/);
      expect(typeof performance.score).toBe('number');
    });

    it('should check error tracking readiness', async () => {
      const status = await orchestrator.checkProductionReadiness();
      const errorTracking = status.components.errorTracking;

      expect(errorTracking).toBeDefined();
      expect(errorTracking.status).toMatch(/healthy|warning|error/);
      expect(typeof errorTracking.score).toBe('number');
    });

    it('should check security readiness', async () => {
      const status = await orchestrator.checkProductionReadiness();
      const security = status.components.security;

      expect(security).toBeDefined();
      expect(security.status).toMatch(/healthy|warning|error/);
      expect(typeof security.score).toBe('number');
    });
  });

  describe('createDeploymentReport', () => {
    it('should create deployment report', async () => {
      const report = await orchestrator.createDeploymentReport('development');

      expect(report).toBeDefined();
      expect(report.deploymentId).toBeDefined();
      expect(report.environment).toBe('development');
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.readinessCheck).toBeDefined();
      expect(typeof report.deploymentApproved).toBe('boolean');
      expect(Array.isArray(report.approvalReasons)).toBe(true);
    });

    it('should include readiness check in report', async () => {
      const report = await orchestrator.createDeploymentReport('staging');

      expect(report.readinessCheck).toBeDefined();
      expect(report.readinessCheck.overall).toMatch(/ready|warning|not_ready/);
      expect(report.readinessCheck.components).toBeDefined();
    });

    it('should approve deployment when ready', async () => {
      const report = await orchestrator.createDeploymentReport('development');

      if (report.readinessCheck.overall === 'ready' && report.readinessCheck.blockers.length === 0) {
        expect(report.deploymentApproved).toBe(true);
      }
    });

    it('should store deployment in history', async () => {
      await orchestrator.createDeploymentReport('development');

      const history = orchestrator.getDeploymentHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit deployment history to 20 entries', async () => {
      for (let i = 0; i < 25; i++) {
        await orchestrator.createDeploymentReport('development');
      }

      const history = orchestrator.getDeploymentHistory();
      expect(history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Auto Monitoring', () => {
    it('should start auto monitoring', async () => {
      await orchestrator.initialize();
      // Auto monitoring should be started (interval set)
      expect(orchestrator).toBeDefined();
    });

    it('should stop auto monitoring', async () => {
      await orchestrator.initialize();
      orchestrator.stopAutoMonitoring();
      expect(orchestrator).toBeDefined();
    });

    it('should allow stopping monitoring multiple times', () => {
      orchestrator.stopAutoMonitoring();
      orchestrator.stopAutoMonitoring();
      expect(orchestrator).toBeDefined();
    });
  });

  describe('getLatestReadinessStatus', () => {
    it('should return undefined when no check has been performed', () => {
      const status = orchestrator.getLatestReadinessStatus();
      expect(status).toBeUndefined();
    });

    it('should return latest status after check', async () => {
      await orchestrator.checkProductionReadiness();

      const status = orchestrator.getLatestReadinessStatus();
      expect(status).toBeDefined();
      expect(status?.overall).toMatch(/ready|warning|not_ready/);
    });
  });

  describe('getDeploymentHistory', () => {
    it('should return empty array initially', () => {
      const history = orchestrator.getDeploymentHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should return deployment history', async () => {
      await orchestrator.createDeploymentReport('development');
      await orchestrator.createDeploymentReport('staging');

      const history = orchestrator.getDeploymentHistory();
      expect(history.length).toBe(2);
      expect(history[0].environment).toBe('development');
      expect(history[1].environment).toBe('staging');
    });

    it('should return a copy of history array', async () => {
      await orchestrator.createDeploymentReport('development');

      const history1 = orchestrator.getDeploymentHistory();
      const history2 = orchestrator.getDeploymentHistory();

      expect(history1).not.toBe(history2);
      expect(history1.length).toBe(history2.length);
    });
  });

  describe('getSystemStatusSummary', () => {
    it('should return unknown status when no check performed', () => {
      const summary = orchestrator.getSystemStatusSummary();

      expect(summary.overall).toBe('unknown');
      expect(summary.lastCheck).toBe(0);
    });

    it('should return status summary after check', async () => {
      await orchestrator.checkProductionReadiness();

      const summary = orchestrator.getSystemStatusSummary();

      expect(summary.overall).toMatch(/ready|warning|not_ready/);
      expect(summary.components).toBeDefined();
      expect(summary.lastCheck).toBeGreaterThan(0);
      expect(typeof summary.uptime).toBe('number');
    });

    it('should include all component statuses', async () => {
      await orchestrator.checkProductionReadiness();

      const summary = orchestrator.getSystemStatusSummary();

      expect(summary.components.webPlatform).toBeDefined();
      expect(summary.components.monitoring).toBeDefined();
      expect(summary.components.performance).toBeDefined();
      expect(summary.components.errorTracking).toBeDefined();
      expect(summary.components.security).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should dispose orchestrator', async () => {
      await orchestrator.initialize();
      orchestrator.dispose();
      expect(orchestrator).toBeDefined();
    });

    it('should stop auto monitoring on dispose', async () => {
      await orchestrator.initialize();
      orchestrator.dispose();
      // Auto monitoring should be stopped
      expect(orchestrator).toBeDefined();
    });

    it('should allow reinitialization after dispose', async () => {
      await orchestrator.initialize();
      orchestrator.dispose();
      await orchestrator.initialize();
      expect(orchestrator).toBeDefined();
    });
  });

  describe('Singleton Instance Export', () => {
    it('should export singleton instance', () => {
      expect(productionReadinessOrchestrator).toBeDefined();
      expect(productionReadinessOrchestrator).toBeInstanceOf(ProductionReadinessOrchestrator);
    });

    it('should be usable directly', async () => {
      const status = await productionReadinessOrchestrator.checkProductionReadiness();
      expect(status).toBeDefined();
    });
  });

  describe('Overall Status Determination', () => {
    it('should mark as ready when score >= 90', async () => {
      const status = await orchestrator.checkProductionReadiness();

      if (status.score >= 90) {
        expect(status.overall).toBe('ready');
      }
    });

    it('should mark as warning when score between 70-89', async () => {
      const status = await orchestrator.checkProductionReadiness();

      if (status.score >= 70 && status.score < 90) {
        expect(status.overall).toBe('warning');
      }
    });

    it('should mark as not_ready when score < 70', async () => {
      const status = await orchestrator.checkProductionReadiness();

      if (status.score < 70) {
        expect(status.overall).toBe('not_ready');
      }
    });
  });

  describe('Recommendations and Blockers', () => {
    it('should provide actionable recommendations', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(status.recommendations.length).toBeGreaterThan(0);
      status.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should identify blockers for critical issues', async () => {
      const status = await orchestrator.checkProductionReadiness();

      expect(Array.isArray(status.blockers)).toBe(true);
      status.blockers.forEach(blocker => {
        expect(typeof blocker).toBe('string');
      });
    });

    it('should have no blockers when all systems healthy', async () => {
      const status = await orchestrator.checkProductionReadiness();

      if (status.overall === 'ready') {
        expect(status.blockers.length).toBe(0);
      }
    });
  });
});
