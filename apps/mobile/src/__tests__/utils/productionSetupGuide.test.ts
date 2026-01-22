import {
  initializeProductionSystems,
  validateDeploymentReadiness,
  runDailySecurityAudit,
  performanceTracking,
  errorTracking,
  systemMonitoring,
  webPlatform,
  developmentUtils,
  dashboardData
} from '../../utils/productionSetupGuide';

import { productionReadinessOrchestrator } from '../../utils/productionReadinessOrchestrator';
import { securityAuditService } from '../../utils/security';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { enhancedErrorAnalytics } from '../../utils/errorTracking';
import { monitoringAndAlerting } from '../../utils/monitoringAndAlerting';
import { WebOptimizations } from '../../utils/webOptimizations';
import { logger } from '../../utils/logger';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../../utils/productionReadinessOrchestrator', () => ({
  productionReadinessOrchestrator: {
    initialize: jest.fn(),
    createDeploymentReport: jest.fn(),
    checkProductionReadiness: jest.fn(),
    getLatestReadinessStatus: jest.fn(),
    getSystemStatusSummary: jest.fn(),
    getDeploymentHistory: jest.fn()
  }
}));

jest.mock('../../utils/security', () => ({
  securityAuditService: {
    runSecurityAudit: jest.fn(),
    runTestSuite: jest.fn(),
    getLatestAuditReport: jest.fn()
  }
}));

jest.mock('../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    recordStartupTime: jest.fn(),
    recordMemoryUsage: jest.fn(),
    startNavigationTimer: jest.fn(),
    recordNavigationTime: jest.fn(),
    startApiTimer: jest.fn(),
    recordApiResponseTime: jest.fn(),
    recordMetric: jest.fn(),
    generateReport: jest.fn(),
    getMetrics: jest.fn(),
    getBudgetStatus: jest.fn(),
    reset: jest.fn()
  }
}));

jest.mock('../../utils/errorTracking', () => ({
  enhancedErrorAnalytics: {
    recordError: jest.fn(),
    recordUserAction: jest.fn(),
    getErrorAnalytics: jest.fn(),
    getErrorPatterns: jest.fn()
  }
}));

jest.mock('../../utils/monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    checkSystemHealth: jest.fn()
  }
}));

jest.mock('../../utils/webOptimizations', () => ({
  WebOptimizations: {
    getInstance: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

describe('productionSetupGuide', () => {
  let mockWebOptimizationsInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock WebOptimizations instance
    mockWebOptimizationsInstance = {
      initialized: false,
      getCoreWebVitals: jest.fn().mockReturnValue({
        lcp: 2000,
        fid: 80,
        cls: 0.05
      })
    };

    (WebOptimizations.getInstance as jest.Mock).mockReturnValue(mockWebOptimizationsInstance);
  });

  describe('Module Exports', () => {
    it('should export all expected functions and utilities', () => {
      expect(initializeProductionSystems).toBeDefined();
      expect(typeof initializeProductionSystems).toBe('function');

      expect(validateDeploymentReadiness).toBeDefined();
      expect(typeof validateDeploymentReadiness).toBe('function');

      expect(runDailySecurityAudit).toBeDefined();
      expect(typeof runDailySecurityAudit).toBe('function');

      expect(performanceTracking).toBeDefined();
      expect(typeof performanceTracking).toBe('object');

      expect(errorTracking).toBeDefined();
      expect(typeof errorTracking).toBe('object');

      expect(systemMonitoring).toBeDefined();
      expect(typeof systemMonitoring).toBe('object');

      expect(webPlatform).toBeDefined();
      expect(typeof webPlatform).toBe('object');

      expect(developmentUtils).toBeDefined();
      expect(typeof developmentUtils).toBe('object');

      expect(dashboardData).toBeDefined();
      expect(typeof dashboardData).toBe('object');
    });

    it('should have all performance tracking methods', () => {
      expect(performanceTracking.trackNavigation).toBeDefined();
      expect(performanceTracking.trackApiCall).toBeDefined();
      expect(performanceTracking.trackMemory).toBeDefined();
      expect(performanceTracking.trackCustomMetric).toBeDefined();
      expect(performanceTracking.generateReport).toBeDefined();
    });

    it('should have all error tracking methods', () => {
      expect(errorTracking.trackError).toBeDefined();
      expect(errorTracking.trackUserAction).toBeDefined();
      expect(errorTracking.getErrorAnalytics).toBeDefined();
      expect(errorTracking.getErrorPatterns).toBeDefined();
    });

    it('should have all system monitoring methods', () => {
      expect(systemMonitoring.checkHealth).toBeDefined();
      expect(systemMonitoring.getReadinessStatus).toBeDefined();
      expect(systemMonitoring.getStatusSummary).toBeDefined();
      expect(systemMonitoring.checkReadiness).toBeDefined();
    });

    it('should have all web platform methods', () => {
      expect(webPlatform.isWeb).toBeDefined();
      expect(webPlatform.getCoreWebVitals).toBeDefined();
      expect(webPlatform.isOptimized).toBeDefined();
    });

    it('should have all development utilities', () => {
      expect(developmentUtils.runQuickSecurityTest).toBeDefined();
      expect(developmentUtils.getPerformanceBudgets).toBeDefined();
      expect(developmentUtils.getDeploymentHistory).toBeDefined();
      expect(developmentUtils.resetPerformanceMetrics).toBeDefined();
    });
  });

  describe('initializeProductionSystems', () => {
    it('should initialize all production systems successfully', async () => {
      (productionReadinessOrchestrator.initialize as jest.Mock).mockResolvedValue(undefined);

      await initializeProductionSystems();

      expect(productionReadinessOrchestrator.initialize).toHaveBeenCalled();
      expect(performanceMonitor.recordStartupTime).toHaveBeenCalled();
      expect(performanceMonitor.recordMemoryUsage).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'ProductionSetup',
        'All production systems initialized successfully'
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      (productionReadinessOrchestrator.initialize as jest.Mock).mockRejectedValue(error);

      await expect(initializeProductionSystems()).rejects.toThrow('Init failed');

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionSetup',
        'Failed to initialize production systems',
        error
      );
    });

    it('should log initialization start', async () => {
      (productionReadinessOrchestrator.initialize as jest.Mock).mockResolvedValue(undefined);

      await initializeProductionSystems();

      expect(logger.info).toHaveBeenCalledWith(
        'ProductionSetup',
        'Initializing all production systems...'
      );
    });
  });

  describe('validateDeploymentReadiness', () => {
    it('should approve deployment when all checks pass', async () => {
      const mockReport = {
        deploymentId: 'deploy_123',
        deploymentApproved: true,
        readinessCheck: { score: 95 },
        blockers: []
      };

      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock)
        .mockResolvedValue(mockReport);

      const result = await validateDeploymentReadiness('staging');

      expect(result.approved).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.report).toEqual(mockReport);
      expect(logger.info).toHaveBeenCalledWith(
        'ProductionSetup',
        '✅ Deployment APPROVED for staging',
        expect.objectContaining({ score: 95 })
      );
    });

    it('should block deployment when there are blockers', async () => {
      const mockReport = {
        deploymentId: 'deploy_456',
        deploymentApproved: false,
        readinessCheck: { score: 65 },
        blockers: [
          '❌ Critical security vulnerabilities found',
          '❌ Performance budget violations detected'
        ]
      };

      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock)
        .mockResolvedValue(mockReport);

      const result = await validateDeploymentReadiness('production');

      expect(result.approved).toBe(false);
      expect(result.blockers).toEqual(mockReport.blockers);
      expect(logger.warn).toHaveBeenCalledWith(
        'ProductionSetup',
        '❌ Deployment BLOCKED for production',
        expect.objectContaining({
          blockers: mockReport.blockers,
          score: 65
        })
      );
    });

    it('should handle validation failures gracefully', async () => {
      const error = new Error('Validation failed');
      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock)
        .mockRejectedValue(error);

      const result = await validateDeploymentReadiness('production');

      expect(result.approved).toBe(false);
      expect(result.report).toBeNull();
      expect(result.blockers).toEqual(['Deployment validation system failure']);
      expect(logger.error).toHaveBeenCalledWith(
        'ProductionSetup',
        'Deployment validation failed',
        error
      );
    });

    it('should handle reports without blockers array', async () => {
      const mockReport = {
        deploymentId: 'deploy_789',
        deploymentApproved: true,
        readinessCheck: { score: 90 },
        // blockers is undefined
      };

      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock)
        .mockResolvedValue(mockReport);

      const result = await validateDeploymentReadiness('staging');

      expect(result.approved).toBe(true);
      expect(result.blockers).toEqual([]);
    });
  });

  describe('runDailySecurityAudit', () => {
    it('should complete security audit successfully', async () => {
      const mockAudit = {
        vulnerabilities: [],
        summary: {
          overallScore: 95,
          riskLevel: 'low'
        }
      };

      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue(mockAudit);

      await runDailySecurityAudit();

      expect(securityAuditService.runSecurityAudit).toHaveBeenCalledWith('production');
      expect(logger.info).toHaveBeenCalledWith(
        'ProductionSetup',
        'Daily security audit completed',
        expect.objectContaining({
          overallScore: 95,
          riskLevel: 'low',
          totalVulnerabilities: 0
        })
      );
    });

    it('should report critical vulnerabilities', async () => {
      const mockAudit = {
        vulnerabilities: [
          { severity: 'critical', title: 'SQL Injection in API' },
          { severity: 'critical', title: 'XSS in user input' }
        ],
        summary: {
          overallScore: 45,
          riskLevel: 'critical'
        }
      };

      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue(mockAudit);

      await runDailySecurityAudit();

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionSetup',
        '🚨 CRITICAL: 2 critical vulnerabilities found!',
        expect.objectContaining({
          vulnerabilities: ['SQL Injection in API', 'XSS in user input']
        })
      );
    });

    it('should report high severity vulnerabilities', async () => {
      const mockAudit = {
        vulnerabilities: [
          { severity: 'high', title: 'Weak encryption' },
          { severity: 'high', title: 'Missing auth check' },
          { severity: 'medium', title: 'Deprecated library' }
        ],
        summary: {
          overallScore: 65,
          riskLevel: 'high'
        }
      };

      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue(mockAudit);

      await runDailySecurityAudit();

      expect(logger.warn).toHaveBeenCalledWith(
        'ProductionSetup',
        '⚠️ HIGH: 2 high severity vulnerabilities found',
        expect.objectContaining({
          vulnerabilities: ['Weak encryption', 'Missing auth check']
        })
      );
    });

    it('should handle audit failures', async () => {
      const error = new Error('Audit failed');
      (securityAuditService.runSecurityAudit as jest.Mock).mockRejectedValue(error);

      await runDailySecurityAudit();

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionSetup',
        'Daily security audit failed',
        error
      );
    });
  });

  describe('performanceTracking', () => {
    it('should track navigation', () => {
      performanceTracking.trackNavigation('HomeScreen');

      expect(performanceMonitor.startNavigationTimer).toHaveBeenCalled();
    });

    it('should track API calls', () => {
      performanceTracking.trackApiCall('req_123', '/api/users');

      expect(performanceMonitor.startApiTimer).toHaveBeenCalledWith('req_123');
    });

    it('should track memory', () => {
      performanceTracking.trackMemory();

      expect(performanceMonitor.recordMemoryUsage).toHaveBeenCalled();
    });

    it('should track custom metrics', () => {
      performanceTracking.trackCustomMetric('customMetric', 42);

      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith('customMetric', 42);
    });

    it('should generate performance report', () => {
      const mockReport = { metrics: {}, timestamp: Date.now() };
      (performanceMonitor.generateReport as jest.Mock).mockReturnValue(mockReport);

      const report = performanceTracking.generateReport();

      expect(report).toEqual(mockReport);
      expect(performanceMonitor.generateReport).toHaveBeenCalled();
    });
  });

  describe('errorTracking', () => {
    it('should track errors with full context', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.js:10';
      const context = { userId: 'user123', action: 'button_click' };

      errorTracking.trackError(error, context);

      expect(enhancedErrorAnalytics.recordError).toHaveBeenCalledWith({
        message: 'Test error',
        stack: error.stack,
        timestamp: expect.any(Number),
        context,
        severity: 'error',
        fingerprint: 'Test error' + error.stack
      });
    });

    it('should track errors without stack', () => {
      const error = new Error('Simple error');
      delete error.stack;

      errorTracking.trackError(error);

      expect(enhancedErrorAnalytics.recordError).toHaveBeenCalledWith({
        message: 'Simple error',
        stack: undefined,
        timestamp: expect.any(Number),
        context: undefined,
        severity: 'error',
        fingerprint: 'Simple error'
      });
    });

    it('should track user actions', () => {
      const actionData = { buttonId: 'submit', formId: 'loginForm' };

      errorTracking.trackUserAction('form_submit', actionData);

      expect(enhancedErrorAnalytics.recordUserAction).toHaveBeenCalledWith({
        type: 'form_submit',
        timestamp: expect.any(Number),
        data: actionData
      });
    });

    it('should get error analytics', () => {
      const mockAnalytics = { errorRate: 0.02, totalErrors: 100 };
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue(mockAnalytics);

      const analytics = errorTracking.getErrorAnalytics();

      expect(analytics).toEqual(mockAnalytics);
    });

    it('should get error patterns', () => {
      const mockPatterns = [{ pattern: 'NetworkError', count: 50 }];
      (enhancedErrorAnalytics.getErrorPatterns as jest.Mock).mockReturnValue(mockPatterns);

      const patterns = errorTracking.getErrorPatterns();

      expect(patterns).toEqual(mockPatterns);
    });
  });

  describe('systemMonitoring', () => {
    it('should check system health', async () => {
      const mockHealth = { status: 'healthy', uptime: 3600000 };
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue(mockHealth);

      const health = await systemMonitoring.checkHealth();

      expect(health).toEqual(mockHealth);
    });

    it('should get readiness status', () => {
      const mockStatus = { overall: 'ready', score: 95 };
      (productionReadinessOrchestrator.getLatestReadinessStatus as jest.Mock)
        .mockReturnValue(mockStatus);

      const status = systemMonitoring.getReadinessStatus();

      expect(status).toEqual(mockStatus);
    });

    it('should get system status summary', () => {
      const mockSummary = { overall: 'healthy', components: {} };
      (productionReadinessOrchestrator.getSystemStatusSummary as jest.Mock)
        .mockReturnValue(mockSummary);

      const summary = systemMonitoring.getStatusSummary();

      expect(summary).toEqual(mockSummary);
    });

    it('should check readiness for different environments', async () => {
      const mockReadiness = { overall: 'ready', score: 90 };
      (productionReadinessOrchestrator.checkProductionReadiness as jest.Mock)
        .mockResolvedValue(mockReadiness);

      const readiness = await systemMonitoring.checkReadiness('staging');

      expect(readiness).toEqual(mockReadiness);
      expect(productionReadinessOrchestrator.checkProductionReadiness)
        .toHaveBeenCalledWith('staging');
    });
  });

  describe('webPlatform', () => {
    it('should detect web platform', () => {
      (Platform as any).OS = 'web';

      const isWeb = webPlatform.isWeb();

      expect(isWeb).toBe(true);

      // Reset
      (Platform as any).OS = 'ios';
    });

    it('should detect non-web platform', () => {
      (Platform as any).OS = 'ios';

      const isWeb = webPlatform.isWeb();

      expect(isWeb).toBe(false);
    });

    it('should get Core Web Vitals on web platform', () => {
      (Platform as any).OS = 'web';
      const mockVitals = { lcp: 2000, fid: 80, cls: 0.05 };
      mockWebOptimizationsInstance.getCoreWebVitals.mockReturnValue(mockVitals);

      const vitals = webPlatform.getCoreWebVitals();

      expect(vitals).toEqual(mockVitals);

      // Reset
      (Platform as any).OS = 'ios';
    });

    it('should return null for Core Web Vitals on non-web platform', () => {
      (Platform as any).OS = 'ios';

      const vitals = webPlatform.getCoreWebVitals();

      expect(vitals).toBeNull();
    });

    it('should check optimization status on web', () => {
      (Platform as any).OS = 'web';
      mockWebOptimizationsInstance.initialized = true;

      const isOptimized = webPlatform.isOptimized();

      expect(isOptimized).toBe(true);

      // Reset
      (Platform as any).OS = 'ios';
    });

    it('should return true for optimization status on non-web', () => {
      (Platform as any).OS = 'ios';

      const isOptimized = webPlatform.isOptimized();

      expect(isOptimized).toBe(true); // Not applicable on mobile
    });
  });

  describe('developmentUtils', () => {
    it('should run quick security test', async () => {
      const mockTestResult = { passed: 10, failed: 0 };
      (securityAuditService.runTestSuite as jest.Mock).mockResolvedValue(mockTestResult);

      const result = await developmentUtils.runQuickSecurityTest();

      expect(result).toEqual(mockTestResult);
      expect(securityAuditService.runTestSuite).toHaveBeenCalledWith('authentication');
    });

    it('should get performance budgets', () => {
      const mockBudgets = [{ name: 'bundleSize', status: 'pass' }];
      (performanceMonitor.getBudgetStatus as jest.Mock).mockReturnValue(mockBudgets);

      const budgets = developmentUtils.getPerformanceBudgets();

      expect(budgets).toEqual(mockBudgets);
    });

    it('should get deployment history', () => {
      const mockHistory = [{ deploymentId: 'deploy_123' }];
      (productionReadinessOrchestrator.getDeploymentHistory as jest.Mock)
        .mockReturnValue(mockHistory);

      const history = developmentUtils.getDeploymentHistory();

      expect(history).toEqual(mockHistory);
    });

    it('should reset performance metrics', () => {
      developmentUtils.resetPerformanceMetrics();

      expect(performanceMonitor.reset).toHaveBeenCalled();
    });
  });

  describe('dashboardData', () => {
    it('should get complete dashboard status', async () => {
      // Setup mocks
      const mockReadinessStatus = {
        overall: 'ready',
        score: 95,
        timestamp: Date.now()
      };
      const mockPerformanceMetrics = {
        startupTime: 3000,
        memoryUsage: 100000000,
        navigationTime: 200,
        apiResponseTime: 150,
        fps: 60
      };
      const mockErrorAnalytics = {
        errorRate: 0.02,
        totalErrors: 100,
        uniqueErrors: 10,
        criticalErrors: 2
      };
      const mockSystemHealth = {
        status: 'healthy',
        uptime: 3600000,
        timestamp: Date.now()
      };
      const mockAuditReport = {
        timestamp: Date.now(),
        summary: {
          vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 5,
            low: 10,
            info: 20
          }
        }
      };

      (productionReadinessOrchestrator.getLatestReadinessStatus as jest.Mock)
        .mockReturnValue(mockReadinessStatus);
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockPerformanceMetrics);
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue(mockErrorAnalytics);
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue(mockSystemHealth);
      (securityAuditService.getLatestAuditReport as jest.Mock).mockReturnValue(mockAuditReport);

      const status = await dashboardData.getCompleteStatus();

      expect(status).toEqual({
        overall: {
          status: 'ready',
          score: 95,
          lastCheck: mockReadinessStatus.timestamp
        },
        performance: {
          startupTime: 3000,
          memoryUsage: 100000000,
          navigationTime: 200,
          apiResponseTime: 150,
          fps: 60
        },
        errors: {
          errorRate: 0.02,
          totalErrors: 100,
          uniqueErrors: 10,
          criticalErrors: 2
        },
        security: {
          lastAudit: mockAuditReport.timestamp,
          vulnerabilities: mockAuditReport.summary.vulnerabilities
        },
        health: {
          status: 'healthy',
          uptime: 3600000,
          lastCheck: mockSystemHealth.timestamp
        }
      });
    });

    it('should handle missing data gracefully', async () => {
      // All mocks return undefined/null
      (productionReadinessOrchestrator.getLatestReadinessStatus as jest.Mock)
        .mockReturnValue(undefined);
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({});
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue({});
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({});
      (securityAuditService.getLatestAuditReport as jest.Mock).mockReturnValue(undefined);

      const status = await dashboardData.getCompleteStatus();

      expect(status).toEqual({
        overall: {
          status: 'unknown',
          score: 0,
          lastCheck: 0
        },
        performance: {
          startupTime: undefined,
          memoryUsage: undefined,
          navigationTime: undefined,
          apiResponseTime: undefined,
          fps: undefined
        },
        errors: {
          errorRate: undefined,
          totalErrors: undefined,
          uniqueErrors: undefined,
          criticalErrors: undefined
        },
        security: {
          lastAudit: 0,
          vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0
          }
        },
        health: {
          status: undefined,
          uptime: undefined,
          lastCheck: undefined
        }
      });
    });

    it('should handle partial data', async () => {
      const mockReadinessStatus = {
        overall: 'warning',
        score: 75,
        timestamp: Date.now()
      };
      const mockPerformanceMetrics = {
        startupTime: 4000,
        // Other metrics missing
      };
      const mockErrorAnalytics = {
        errorRate: 0.05,
        totalErrors: 200,
        // Other metrics missing
      };

      (productionReadinessOrchestrator.getLatestReadinessStatus as jest.Mock)
        .mockReturnValue(mockReadinessStatus);
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mockPerformanceMetrics);
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue(mockErrorAnalytics);
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({
        status: 'degraded',
        timestamp: Date.now()
      });
      (securityAuditService.getLatestAuditReport as jest.Mock).mockReturnValue(null);

      const status = await dashboardData.getCompleteStatus();

      expect(status.overall.status).toBe('warning');
      expect(status.overall.score).toBe(75);
      expect(status.performance.startupTime).toBe(4000);
      expect(status.performance.memoryUsage).toBeUndefined();
      expect(status.errors.errorRate).toBe(0.05);
      expect(status.errors.uniqueErrors).toBeUndefined();
      expect(status.health.status).toBe('degraded');
      expect(status.health.uptime).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error tracking with non-Error objects', () => {
      const customError = {
        message: 'Custom error',
        stack: undefined
      };

      errorTracking.trackError(customError as Error);

      expect(enhancedErrorAnalytics.recordError).toHaveBeenCalledWith({
        message: 'Custom error',
        stack: undefined,
        timestamp: expect.any(Number),
        context: undefined,
        severity: 'error',
        fingerprint: 'Custom error'
      });
    });

    it('should handle user actions without data', () => {
      errorTracking.trackUserAction('simple_action');

      expect(enhancedErrorAnalytics.recordUserAction).toHaveBeenCalledWith({
        type: 'simple_action',
        timestamp: expect.any(Number),
        data: undefined
      });
    });

    it('should handle deployment validation with null blockers', () => {
      const mockReport = {
        deploymentId: 'deploy_null',
        deploymentApproved: true,
        readinessCheck: { score: 88 },
        blockers: null
      };

      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock)
        .mockResolvedValue(mockReport);

      validateDeploymentReadiness('staging').then(result => {
        expect(result.blockers).toEqual([]);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete initialization and validation flow', async () => {
      // Setup mocks for successful flow
      (productionReadinessOrchestrator.initialize as jest.Mock).mockResolvedValue(undefined);
      (productionReadinessOrchestrator.createDeploymentReport as jest.Mock).mockResolvedValue({
        deploymentId: 'deploy_integration',
        deploymentApproved: true,
        readinessCheck: { score: 92 },
        blockers: []
      });
      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue({
        vulnerabilities: [],
        summary: { overallScore: 90, riskLevel: 'low' }
      });

      // Initialize systems
      await initializeProductionSystems();

      // Validate deployment readiness
      const validation = await validateDeploymentReadiness('staging');

      // Run security audit
      await runDailySecurityAudit();

      // Track some performance metrics
      performanceTracking.trackNavigation('HomeScreen');
      performanceTracking.trackApiCall('req_123', '/api/users');
      performanceTracking.trackMemory();

      // Track an error
      const error = new Error('Test error');
      errorTracking.trackError(error, { test: true });
      errorTracking.trackUserAction('test_action');

      // Verify all systems were called
      expect(productionReadinessOrchestrator.initialize).toHaveBeenCalled();
      expect(validation.approved).toBe(true);
      expect(securityAuditService.runSecurityAudit).toHaveBeenCalledWith('production');
      expect(performanceMonitor.startNavigationTimer).toHaveBeenCalled();
      expect(performanceMonitor.startApiTimer).toHaveBeenCalledWith('req_123');
      expect(performanceMonitor.recordMemoryUsage).toHaveBeenCalled();
      expect(enhancedErrorAnalytics.recordError).toHaveBeenCalled();
      expect(enhancedErrorAnalytics.recordUserAction).toHaveBeenCalled();
    });

    it('should handle complete dashboard data collection', async () => {
      // Setup comprehensive mocks
      const now = Date.now();

      (productionReadinessOrchestrator.getLatestReadinessStatus as jest.Mock)
        .mockReturnValue({
          overall: 'ready',
          score: 93,
          timestamp: now
        });

      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
        startupTime: 2800,
        memoryUsage: 95000000,
        navigationTime: 180,
        apiResponseTime: 120,
        fps: 59
      });

      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue({
        errorRate: 0.015,
        totalErrors: 75,
        uniqueErrors: 8,
        criticalErrors: 1
      });

      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({
        status: 'healthy',
        uptime: 7200000,
        timestamp: now
      });

      (securityAuditService.getLatestAuditReport as jest.Mock).mockReturnValue({
        timestamp: now - 3600000,
        summary: {
          vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 3,
            low: 12,
            info: 25
          }
        }
      });

      const dashboardStatus = await dashboardData.getCompleteStatus();

      // Verify comprehensive data structure
      expect(dashboardStatus.overall.status).toBe('ready');
      expect(dashboardStatus.overall.score).toBe(93);
      expect(dashboardStatus.performance.startupTime).toBe(2800);
      expect(dashboardStatus.performance.fps).toBe(59);
      expect(dashboardStatus.errors.errorRate).toBe(0.015);
      expect(dashboardStatus.errors.criticalErrors).toBe(1);
      expect(dashboardStatus.security.vulnerabilities.medium).toBe(3);
      expect(dashboardStatus.health.status).toBe('healthy');
      expect(dashboardStatus.health.uptime).toBe(7200000);
    });
  });
});