import { productionReadinessOrchestrator } from '../../utils/productionReadinessOrchestrator';
import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { WebOptimizationsManager } from '../../utils/webOptimizations/';
import { monitoringAndAlerting } from '../../utils/monitoringAndAlerting';
import { enhancedErrorAnalytics } from '../../utils/errorTracking/';
import { securityAuditService } from '../../utils/security';
import { apiProtectionService } from '../../utils/ApiProtection';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    getMetrics: jest.fn(),
    getBudgetStatus: jest.fn(),
    generateReport: jest.fn()
  }
}));

jest.mock('../../utils/webOptimizations', () => ({
  WebOptimizationsManager: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getWebVitals: jest.fn(() => ({ lcp: 2000, fid: 50, cls: 0.05 })),
      initialized: true,
    })),
  },
}));
jest.mock('../../utils/webOptimizations/', () => ({
  WebOptimizationsManager: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getWebVitals: jest.fn(() => ({ lcp: 2000, fid: 50, cls: 0.05 })),
      initialized: true,
    })),
  },
}));

jest.mock('../../utils/monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    initialize: jest.fn(),
    checkSystemHealth: jest.fn(),
    getAlertStatistics: jest.fn()
  }
}));

jest.mock('../../utils/errorTracking', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(),
    getErrorPatterns: jest.fn(),
    getTrendAnalysis: jest.fn()
  }
}));
jest.mock('../../utils/errorTracking/', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(),
    getErrorPatterns: jest.fn(),
    getTrendAnalysis: jest.fn()
  }
}));

jest.mock('../../utils/security', () => ({
  securityAuditService: {
    runSecurityAudit: jest.fn()
  }
}));

jest.mock('../../utils/ApiProtection', () => ({
  apiProtectionService: {
    getSecurityStats: jest.fn()
  }
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

describe('ProductionReadinessOrchestrator', () => {
  let mockWebOptimizationsInstance: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset orchestrator state
    (productionReadinessOrchestrator as any).isInitialized = false;
    (productionReadinessOrchestrator as any).lastReadinessCheck = undefined;
    (productionReadinessOrchestrator as any).deploymentHistory = [];
    (productionReadinessOrchestrator as any).autoCheckInterval = undefined;

    (monitoringAndAlerting.initialize as jest.Mock).mockResolvedValue(undefined);
    (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({ status: 'healthy' });
    (monitoringAndAlerting.getAlertStatistics as jest.Mock).mockReturnValue({
      activeAlerts: 0,
      totalAlerts: 10,
      lastAlert: Date.now()
    });

    (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
      startupTime: 3000,
      memoryUsage: 100000000
    });
    (performanceMonitor.getBudgetStatus as jest.Mock).mockReturnValue([]);

    (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue({ errorRate: 0.005 });
    (enhancedErrorAnalytics.getErrorPatterns as jest.Mock).mockReturnValue([]);
    (enhancedErrorAnalytics.getTrendAnalysis as jest.Mock).mockReturnValue({
      isIncreasing: false,
      changeRate: 0.1
    });

    (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue({
      summary: {
        overallScore: 85,
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 5
        }
      }
    });
    (apiProtectionService.getSecurityStats as jest.Mock).mockReturnValue({ recentViolations: 2 });

    // Setup mock WebOptimizationsManager instance
    mockWebOptimizationsInstance = {
      initialized: false,
      initialize: jest.fn().mockResolvedValue(undefined),
      getWebVitals: jest.fn().mockReturnValue({
        lcp: 2000,
        fid: 80,
        cls: 0.05
      })
    };

    (WebOptimizationsManager.getInstance as jest.Mock).mockReturnValue(mockWebOptimizationsInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
    productionReadinessOrchestrator.dispose();
  });

  describe('Module Structure', () => {
    it('should export productionReadinessOrchestrator instance', () => {
      expect(productionReadinessOrchestrator).toBeDefined();
      expect(productionReadinessOrchestrator).toHaveProperty('initialize');
      expect(productionReadinessOrchestrator).toHaveProperty('checkProductionReadiness');
      expect(productionReadinessOrchestrator).toHaveProperty('createDeploymentReport');
    });

    it('should have all public methods', () => {
      expect(typeof productionReadinessOrchestrator.initialize).toBe('function');
      expect(typeof productionReadinessOrchestrator.checkProductionReadiness).toBe('function');
      expect(typeof productionReadinessOrchestrator.createDeploymentReport).toBe('function');
      expect(typeof productionReadinessOrchestrator.stopAutoMonitoring).toBe('function');
      expect(typeof productionReadinessOrchestrator.getLatestReadinessStatus).toBe('function');
      expect(typeof productionReadinessOrchestrator.getDeploymentHistory).toBe('function');
      expect(typeof productionReadinessOrchestrator.getSystemStatusSummary).toBe('function');
      expect(typeof productionReadinessOrchestrator.dispose).toBe('function');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully on non-web platform', async () => {
      await productionReadinessOrchestrator.initialize();

      expect(monitoringAndAlerting.initialize).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Production readiness orchestrator initialized successfully'
      );
      expect((productionReadinessOrchestrator as any).isInitialized).toBe(true);
    });

    it('should initialize web optimizations when on web platform', async () => {
      (Platform as any).OS = 'web';

      await productionReadinessOrchestrator.initialize();

      expect(WebOptimizationsManager.getInstance).toHaveBeenCalled();
      expect(mockWebOptimizationsInstance.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          pwa: expect.objectContaining({ appName: 'Mintenance', themeColor: '#007AFF' }),
          image: expect.objectContaining({ enableWebP: true, enableLazyLoading: true }),
          seo: expect.objectContaining({ siteName: 'Mintenance' }),
          analytics: expect.objectContaining({ googleAnalyticsId: 'G-XXXXXXXXXX' }),
        })
      );

      expect(monitoringAndAlerting.initialize).toHaveBeenCalled();

      // Reset Platform.OS
      (Platform as any).OS = 'ios';
    });

    it('should warn if already initialized', async () => {
      await productionReadinessOrchestrator.initialize();
      await productionReadinessOrchestrator.initialize();

      expect(logger.warn).toHaveBeenCalledWith('ProductionReadiness', 'Already initialized');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      (monitoringAndAlerting.initialize as jest.Mock).mockRejectedValue(error);

      await expect(productionReadinessOrchestrator.initialize()).rejects.toThrow('Init failed');

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Failed to initialize orchestrator',
        { error }
      );
    });

    it('should start auto monitoring after initialization', async () => {
      await productionReadinessOrchestrator.initialize();

      expect((productionReadinessOrchestrator as any).autoCheckInterval).toBeDefined();
    });
  });

  describe('checkProductionReadiness', () => {
    const setupMocks = (overrides = {}) => {
      const defaults = {
        webMetrics: { lcp: 2000, fid: 80, cls: 0.05 },
        healthStatus: { status: 'healthy' },
        alertStats: { activeAlerts: 0, totalAlerts: 10, lastAlert: Date.now() },
        performanceMetrics: { startupTime: 3000, memoryUsage: 100000000 },
        budgetStatus: [],
        errorAnalytics: { errorRate: 0.005 },
        errorPatterns: [],
        trendAnalysis: { isIncreasing: false, changeRate: 0.1 },
        auditReport: {
          summary: {
            overallScore: 85,
            vulnerabilities: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 5
            }
          }
        },
        securityStats: { recentViolations: 2 }
      };

      const mocks = { ...defaults, ...overrides };

      mockWebOptimizationsInstance.getWebVitals.mockReturnValue(mocks.webMetrics);
      mockWebOptimizationsInstance.initialized = true;

      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue(mocks.healthStatus);
      (monitoringAndAlerting.getAlertStatistics as jest.Mock).mockReturnValue(mocks.alertStats);

      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue(mocks.performanceMetrics);
      (performanceMonitor.getBudgetStatus as jest.Mock).mockReturnValue(mocks.budgetStatus);

      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue(mocks.errorAnalytics);
      (enhancedErrorAnalytics.getErrorPatterns as jest.Mock).mockReturnValue(mocks.errorPatterns);
      (enhancedErrorAnalytics.getTrendAnalysis as jest.Mock).mockReturnValue(mocks.trendAnalysis);

      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue(mocks.auditReport);
      (apiProtectionService.getSecurityStats as jest.Mock).mockReturnValue(mocks.securityStats);
    };

    it('should return ready status when all components are healthy', async () => {
      setupMocks();

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.overall).toBe('ready');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.blockers).toHaveLength(0);
      expect(result.components.webPlatform.status).toBe('healthy');
      expect(result.components.monitoring.status).toBe('healthy');
      expect(result.components.performance.status).toBe('healthy');
      expect(result.components.errorTracking.status).toBe('healthy');
      expect(result.components.security.status).toBe('healthy');
    });

    it('should return warning status for moderate issues', async () => {
      setupMocks({
        webMetrics: { lcp: 3000, fid: 150, cls: 0.2 }, // Poor web vitals
        alertStats: { activeAlerts: 5, totalAlerts: 10, lastAlert: Date.now() }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.overall).toBe('warning');
      expect(result.score).toBeLessThan(90);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should return not_ready status for critical issues', async () => {
      setupMocks({
        healthStatus: { status: 'error' },
        errorAnalytics: { errorRate: 0.1 }, // 10% error rate
        auditReport: {
          summary: {
            overallScore: 50,
            vulnerabilities: {
              critical: 2,
              high: 5,
              medium: 10,
              low: 20
            }
          }
        }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.overall).toBe('not_ready');
      expect(result.score).toBeLessThan(70);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should skip web platform checks on non-web platform', async () => {
      setupMocks();
      (Platform as any).OS = 'ios';

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.components.webPlatform.message).toContain('Web platform checks skipped');
      expect(result.components.webPlatform.score).toBe(100);
    });

    it('should detect performance budget violations', async () => {
      setupMocks({
        budgetStatus: [
          { name: 'bundleSize', status: 'error', current: 2000000, budget: 1000000 },
          { name: 'startupTime', status: 'warning', current: 4000, budget: 3000 }
        ],
        performanceMetrics: { startupTime: 6000, memoryUsage: 100000000 }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.components.performance.status).not.toBe('healthy');
      expect(result.components.performance.message).toContain('budget');
    });

    it('should detect high error rates', async () => {
      setupMocks({
        errorAnalytics: { errorRate: 0.08 }, // 8% error rate
        errorPatterns: [
          { severity: 'critical', pattern: 'OutOfMemory', count: 50 },
          { severity: 'critical', pattern: 'NetworkError', count: 30 }
        ],
        trendAnalysis: { isIncreasing: true, changeRate: 0.6 }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.components.errorTracking.status).toBe('error');
      expect(result.components.errorTracking.score).toBeLessThan(50);
    });

    it('should detect security vulnerabilities', async () => {
      setupMocks({
        auditReport: {
          summary: {
            overallScore: 65,
            vulnerabilities: {
              critical: 1,
              high: 3,
              medium: 5,
              low: 10
            }
          }
        },
        securityStats: { recentViolations: 15 }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.components.security.status).toBe('error');
      expect(result.components.security.message).toContain('critical security vulnerabilities');
    });

    it('should generate appropriate recommendations', async () => {
      setupMocks({
        webMetrics: { lcp: 3000, fid: 150, cls: 0.2 },
        errorAnalytics: { errorRate: 0.02 }
      });

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.recommendations).toContain('🌐 Optimize web platform performance and Core Web Vitals');
      expect(result.recommendations).toContain('🐛 Investigate and resolve error patterns and trends');
    });

    it('should handle component check failures gracefully', async () => {
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockRejectedValue(new Error('Check failed'));

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.components.monitoring.status).toBe('error');
      expect(result.components.monitoring.score).toBe(0);
      expect(result.components.monitoring.message).toBe('Monitoring readiness check failed');
    });
  });

  describe('createDeploymentReport', () => {
    const setupMocksForDeployment = () => {
      const mocks = {
        readinessCheck: {
          overall: 'ready' as const,
          score: 95,
          timestamp: Date.now(),
          components: {
            webPlatform: {
              status: 'healthy' as const,
              score: 100,
              message: 'Web platform is ready',
              lastCheck: Date.now()
            },
            monitoring: {
              status: 'healthy' as const,
              score: 95,
              message: 'Monitoring is operational',
              lastCheck: Date.now()
            },
            performance: {
              status: 'healthy' as const,
              score: 90,
              message: 'Performance is acceptable',
              lastCheck: Date.now()
            },
            errorTracking: {
              status: 'healthy' as const,
              score: 95,
              message: 'Error tracking is operational',
              lastCheck: Date.now()
            },
            security: {
              status: 'healthy' as const,
              score: 95,
              message: 'Security is strong',
              lastCheck: Date.now()
            }
          },
          recommendations: ['✅ All systems are healthy'],
          blockers: []
        },
        auditReport: { summary: { overallScore: 90 } },
        performanceReport: { metrics: {}, timestamp: Date.now() }
      };

      // Mock checkProductionReadiness
      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockResolvedValue(mocks.readinessCheck);

      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue(mocks.auditReport);
      (performanceMonitor.generateReport as jest.Mock).mockReturnValue(mocks.performanceReport);

      return mocks;
    };

    it('should create deployment report for development environment', async () => {
      setupMocksForDeployment();

      const report = await productionReadinessOrchestrator.createDeploymentReport('development');

      expect(report.deploymentId).toMatch(/^deploy_\d+_[a-z0-9]+$/);
      expect(report.environment).toBe('development');
      expect(report.deploymentApproved).toBe(true);
      expect(report.approvalReasons).toContain('All systems healthy');
      expect(report.securityAudit).toBeUndefined(); // Not run for development
      expect(report.performanceBaseline).toBeUndefined();
    });

    it('should run additional checks for production environment', async () => {
      setupMocksForDeployment();

      const report = await productionReadinessOrchestrator.createDeploymentReport('production');

      expect(report.environment).toBe('production');
      expect(securityAuditService.runSecurityAudit).toHaveBeenCalledWith('production');
      expect(performanceMonitor.generateReport).toHaveBeenCalled();
      expect(report.securityAudit).toBeDefined();
      expect(report.performanceBaseline).toBeDefined();
    });

    it('should include web compatibility for web platform in production', async () => {
      setupMocksForDeployment();
      (Platform as any).OS = 'web';
      mockWebOptimizationsInstance.initialized = true;

      const report = await productionReadinessOrchestrator.createDeploymentReport('production');

      expect(report.webCompatibility).toBeDefined();
      expect(report.webCompatibility).toHaveProperty('coreWebVitals');
      expect(report.webCompatibility).toHaveProperty('optimizationStatus', true);

      // Reset Platform.OS
      (Platform as any).OS = 'ios';
    });

    it('should reject deployment when not ready', async () => {
      const mocks = setupMocksForDeployment();
      mocks.readinessCheck.overall = 'not_ready';
      mocks.readinessCheck.score = 60;
      mocks.readinessCheck.blockers = [
        '❌ security: Critical vulnerabilities detected',
        '❌ performance: Startup time exceeds limits'
      ];

      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockResolvedValue(mocks.readinessCheck);

      const report = await productionReadinessOrchestrator.createDeploymentReport('production');

      expect(report.deploymentApproved).toBe(false);
      expect(report.approvalReasons).toContain('Overall status: not_ready');
      expect(report.approvalReasons).toContain('❌ security: Critical vulnerabilities detected');
    });

    it('should store deployment in history', async () => {
      setupMocksForDeployment();

      const report1 = await productionReadinessOrchestrator.createDeploymentReport('development');
      const report2 = await productionReadinessOrchestrator.createDeploymentReport('staging');

      const history = productionReadinessOrchestrator.getDeploymentHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toBe(report1);
      expect(history[1]).toBe(report2);
    });

    it('should limit deployment history to 20 entries', async () => {
      setupMocksForDeployment();

      // Create 25 deployment reports
      for (let i = 0; i < 25; i++) {
        await productionReadinessOrchestrator.createDeploymentReport('development');
      }

      const history = productionReadinessOrchestrator.getDeploymentHistory();

      expect(history).toHaveLength(20);
    });
  });

  describe('Auto Monitoring', () => {
    it('should start auto monitoring on initialization', async () => {
      await productionReadinessOrchestrator.initialize();

      expect((productionReadinessOrchestrator as any).autoCheckInterval).toBeDefined();
    });

    it('should run readiness checks every 5 minutes', async () => {
      const checkSpy = jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockResolvedValue({
          overall: 'ready',
          score: 95,
          timestamp: Date.now(),
          components: {} as any,
          recommendations: [],
          blockers: []
        });

      await productionReadinessOrchestrator.initialize();

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve(); // Allow async operations to complete

      expect(checkSpy).toHaveBeenCalled();

      // Fast-forward another 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();

      expect(checkSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle auto monitoring check failures', async () => {
      const error = new Error('Check failed');
      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockRejectedValue(error);

      await productionReadinessOrchestrator.initialize();

      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();

      expect(logger.error).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Auto monitoring check failed',
        error
      );
    });

    it('should stop auto monitoring', async () => {
      await productionReadinessOrchestrator.initialize();
      productionReadinessOrchestrator.stopAutoMonitoring();

      expect((productionReadinessOrchestrator as any).autoCheckInterval).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith('ProductionReadiness', 'Auto monitoring stopped');
    });

    it('should handle stopping when not running', () => {
      productionReadinessOrchestrator.stopAutoMonitoring();
      productionReadinessOrchestrator.stopAutoMonitoring(); // Call twice

      expect(logger.info).toHaveBeenCalledTimes(0); // Only logs when actually stopping
    });
  });

  describe('getLatestReadinessStatus', () => {
    it('should return undefined when no check has been performed', () => {
      const status = productionReadinessOrchestrator.getLatestReadinessStatus();

      expect(status).toBeUndefined();
    });

    it('should return latest readiness status after check', async () => {
      const mockStatus = {
        overall: 'ready' as const,
        score: 95,
        timestamp: Date.now(),
        components: {} as any,
        recommendations: [],
        blockers: []
      };

      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockImplementation(async () => {
          (productionReadinessOrchestrator as any).lastReadinessCheck = mockStatus;
          return mockStatus;
        });

      await productionReadinessOrchestrator.checkProductionReadiness();

      const status = productionReadinessOrchestrator.getLatestReadinessStatus();

      expect(status).toEqual(mockStatus);
    });
  });

  describe('getSystemStatusSummary', () => {
    it('should return unknown status when no check performed', () => {
      const summary = productionReadinessOrchestrator.getSystemStatusSummary();

      expect(summary.overall).toBe('unknown');
      expect(summary.components).toEqual({});
      expect(summary.lastCheck).toBe(0);
      expect(summary.uptime).toBe(0);
    });

    it('should return system status summary after check', async () => {
      const mockStatus = {
        overall: 'ready' as const,
        score: 95,
        timestamp: Date.now(),
        components: {
          webPlatform: {
            status: 'healthy' as const,
            score: 100,
            message: 'Ready',
            lastCheck: Date.now()
          },
          monitoring: {
            status: 'warning' as const,
            score: 75,
            message: 'Some issues',
            lastCheck: Date.now()
          },
          performance: {
            status: 'healthy' as const,
            score: 90,
            message: 'Good',
            lastCheck: Date.now()
          },
          errorTracking: {
            status: 'healthy' as const,
            score: 95,
            message: 'Good',
            lastCheck: Date.now()
          },
          security: {
            status: 'healthy' as const,
            score: 95,
            message: 'Good',
            lastCheck: Date.now()
          }
        },
        recommendations: [],
        blockers: []
      };

      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockImplementation(async () => {
          (productionReadinessOrchestrator as any).lastReadinessCheck = mockStatus;
          return mockStatus;
        });

      await productionReadinessOrchestrator.checkProductionReadiness();

      const summary = productionReadinessOrchestrator.getSystemStatusSummary();

      expect(summary.overall).toBe('ready');
      expect(summary.components).toEqual({
        webPlatform: 'healthy',
        monitoring: 'warning',
        performance: 'healthy',
        errorTracking: 'healthy',
        security: 'healthy'
      });
      expect(summary.lastCheck).toBe(mockStatus.timestamp);
    });

    it('should calculate uptime from first deployment', async () => {
      const now = Date.now();
      const firstDeploymentTime = now - 3600000; // 1 hour ago

      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Create a deployment to establish start time
      jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness')
        .mockResolvedValue({
          overall: 'ready',
          score: 95,
          timestamp: firstDeploymentTime,
          components: {} as any,
          recommendations: [],
          blockers: []
        });

      await productionReadinessOrchestrator.createDeploymentReport('development');

      const summary = productionReadinessOrchestrator.getSystemStatusSummary();

      expect(summary.uptime).toBeCloseTo(3600000, -3); // 1 hour in milliseconds
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await productionReadinessOrchestrator.initialize();

      productionReadinessOrchestrator.dispose();

      expect((productionReadinessOrchestrator as any).isInitialized).toBe(false);
      expect((productionReadinessOrchestrator as any).autoCheckInterval).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Production readiness orchestrator disposed'
      );
    });

    it('should be safe to call dispose multiple times', () => {
      productionReadinessOrchestrator.dispose();
      productionReadinessOrchestrator.dispose();

      expect((productionReadinessOrchestrator as any).isInitialized).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all components failing', async () => {
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockRejectedValue(new Error('Failed'));
      (performanceMonitor.getMetrics as jest.Mock).mockImplementation(() => {
        throw new Error('Failed');
      });
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockImplementation(() => {
        throw new Error('Failed');
      });
      (securityAuditService.runSecurityAudit as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result.overall).toBe('not_ready');
      expect(result.score).toBe(20); // Only web platform succeeds on non-web (100 score)
      Object.entries(result.components).forEach(([name, component]) => {
        if (name !== 'webPlatform') {
          expect(component.status).toBe('error');
          expect(component.score).toBe(0);
        }
      });
    });

    it('should handle missing metrics gracefully', async () => {
      (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({ status: 'healthy' });
      (monitoringAndAlerting.getAlertStatistics as jest.Mock).mockReturnValue({});
      (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({});
      (performanceMonitor.getBudgetStatus as jest.Mock).mockReturnValue([]);
      (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue({});
      (enhancedErrorAnalytics.getErrorPatterns as jest.Mock).mockReturnValue([]);
      (enhancedErrorAnalytics.getTrendAnalysis as jest.Mock).mockReturnValue({});
      (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue({
        summary: {
          vulnerabilities: {}
        }
      });
      (apiProtectionService.getSecurityStats as jest.Mock).mockReturnValue({});

      const result = await productionReadinessOrchestrator.checkProductionReadiness();

      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle environment parameter correctly', async () => {
      const spy = jest.spyOn(productionReadinessOrchestrator, 'checkProductionReadiness');

      await productionReadinessOrchestrator.checkProductionReadiness('staging');

      expect(logger.info).toHaveBeenCalledWith(
        'ProductionReadiness',
        'Starting production readiness check',
        { environment: 'staging' }
      );

      spy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should perform full initialization and readiness check flow', async () => {
      const setupFullMocks = () => {
        mockWebOptimizationsInstance.initialized = true;

        (monitoringAndAlerting.checkSystemHealth as jest.Mock).mockResolvedValue({
          status: 'healthy'
        });
        (monitoringAndAlerting.getAlertStatistics as jest.Mock).mockReturnValue({
          activeAlerts: 1,
          totalAlerts: 100,
          lastAlert: Date.now()
        });

        (performanceMonitor.getMetrics as jest.Mock).mockReturnValue({
          startupTime: 3500,
          memoryUsage: 150000000
        });
        (performanceMonitor.getBudgetStatus as jest.Mock).mockReturnValue([
          { name: 'startupTime', status: 'warning', current: 3500, budget: 3000 }
        ]);

        (enhancedErrorAnalytics.getErrorAnalytics as jest.Mock).mockReturnValue({
          errorRate: 0.015
        });
        (enhancedErrorAnalytics.getErrorPatterns as jest.Mock).mockReturnValue([
          { severity: 'medium', pattern: 'NetworkTimeout', count: 10 }
        ]);
        (enhancedErrorAnalytics.getTrendAnalysis as jest.Mock).mockReturnValue({
          isIncreasing: false,
          changeRate: 0.05
        });

        (securityAuditService.runSecurityAudit as jest.Mock).mockResolvedValue({
          summary: {
            overallScore: 80,
            vulnerabilities: {
              critical: 0,
              high: 0,
              medium: 2,
              low: 8
            }
          }
        });
        (apiProtectionService.getSecurityStats as jest.Mock).mockReturnValue({
          recentViolations: 5
        });
      };

      setupFullMocks();

      // Initialize
      await productionReadinessOrchestrator.initialize();

      // Perform readiness check
      const status = await productionReadinessOrchestrator.checkProductionReadiness('staging');

      // Create deployment report
      const report = await productionReadinessOrchestrator.createDeploymentReport('staging');

      // Verify complete flow
      expect((productionReadinessOrchestrator as any).isInitialized).toBe(true);
      expect(status.overall).toBe('warning');
      expect(report.deploymentApproved).toBe(true); // Warning still allows deployment
      expect(report.readinessCheck).toEqual(status);

      // Get summary
      const summary = productionReadinessOrchestrator.getSystemStatusSummary();
      expect(summary.overall).toBe('warning');

      // Cleanup
      productionReadinessOrchestrator.dispose();
      expect((productionReadinessOrchestrator as any).isInitialized).toBe(false);
    });
  });
});
