/**
 * Production Setup Guide
 *
 * Integration examples and setup instructions for the production-ready monitoring,
 * performance, security, and web platform systems.
 */

import { productionReadinessOrchestrator } from './productionReadinessOrchestrator';
import { securityAuditService } from './security';
import { performanceMonitor } from './performanceMonitor';
import { enhancedErrorAnalytics } from './errorTracking';
import { monitoringAndAlerting } from './monitoringAndAlerting';
import { WebOptimizations } from './webOptimizations/';
import { logger } from './logger';

/**
 * Complete production system initialization
 * Call this in your App.tsx or main application entry point
 */
export async function initializeProductionSystems(): Promise<void> {
  logger.info('ProductionSetup', 'Initializing all production systems...');

  try {
    // 1. Initialize the main orchestrator (this handles web platform setup)
    await productionReadinessOrchestrator.initialize();

    // 2. Record app startup time
    performanceMonitor.recordStartupTime();

    // 3. Start memory monitoring
    performanceMonitor.recordMemoryUsage();

    logger.info('ProductionSetup', 'All production systems initialized successfully');
  } catch (error) {
    logger.error('ProductionSetup', 'Failed to initialize production systems', error as Error);
    throw error;
  }
}

/**
 * Pre-deployment validation
 * Run this before any production deployment
 */
export async function validateDeploymentReadiness(environment: 'staging' | 'production'): Promise<{
  approved: boolean;
  report: any;
  blockers: string[];
}> {
  logger.info('ProductionSetup', `Validating deployment readiness for ${environment}`);

  try {
    // 1. Generate comprehensive deployment report
    const deploymentReport = await productionReadinessOrchestrator.createDeploymentReport(environment);

    // 2. Check for critical blockers
    const hasBlockers = (deploymentReport.blockers?.length ?? 0) > 0;
    const isApproved = deploymentReport.deploymentApproved && !hasBlockers;

    // 3. Log results
    if (isApproved) {
      logger.info('ProductionSetup', `✅ Deployment APPROVED for ${environment}`, {
        score: deploymentReport.readinessCheck.score,
        deploymentId: deploymentReport.deploymentId,
      });
    } else {
      logger.warn('ProductionSetup', `❌ Deployment BLOCKED for ${environment}`, {
        blockers: deploymentReport.blockers,
        score: deploymentReport.readinessCheck.score,
      });
    }

    return {
      approved: isApproved,
      report: deploymentReport,
      blockers: deploymentReport.blockers || [],
    };
  } catch (error) {
    logger.error('ProductionSetup', 'Deployment validation failed', error as Error);
    return {
      approved: false,
      report: null,
      blockers: ['Deployment validation system failure'],
    };
  }
}

/**
 * Daily security audit
 * Schedule this to run daily in production
 */
export async function runDailySecurityAudit(): Promise<void> {
  logger.info('ProductionSetup', 'Starting daily security audit');

  try {
    const auditReport = await securityAuditService.runSecurityAudit('production');

    // Check for critical issues
    const criticalVulns = auditReport.vulnerabilities.filter((v: any) => v.severity === 'critical');
    const highVulns = auditReport.vulnerabilities.filter((v: any) => v.severity === 'high');

    if (criticalVulns.length > 0) {
      logger.error('ProductionSetup', `🚨 CRITICAL: ${criticalVulns.length} critical vulnerabilities found!`, {
        vulnerabilities: criticalVulns.map(v => v.title),
      });

      // In production, this should trigger immediate alerts
      // await sendCriticalSecurityAlert(criticalVulns);
    }

    if (highVulns.length > 0) {
      logger.warn('ProductionSetup', `⚠️ HIGH: ${highVulns.length} high severity vulnerabilities found`, {
        vulnerabilities: highVulns.map(v => v.title),
      });
    }

    logger.info('ProductionSetup', 'Daily security audit completed', {
      overallScore: auditReport.summary.overallScore,
      riskLevel: auditReport.summary.riskLevel,
      totalVulnerabilities: auditReport.vulnerabilities.length,
    });
  } catch (error) {
    logger.error('ProductionSetup', 'Daily security audit failed', error as Error);
  }
}

/**
 * Performance monitoring setup
 * Call these methods at appropriate points in your application
 */
export const performanceTracking = {
  // Call when navigating between screens
  trackNavigation: (screenName: string) => {
    performanceMonitor.startNavigationTimer();
    // Call performanceMonitor.recordNavigationTime(screenName) when navigation completes
  },

  // Call when making API requests
  trackApiCall: (requestId: string, endpoint: string) => {
    performanceMonitor.startApiTimer(requestId);
    // Call performanceMonitor.recordApiResponseTime(requestId, endpoint) when response received
  },

  // Call periodically to track memory usage
  trackMemory: () => {
    performanceMonitor.recordMemoryUsage();
  },

  // Call to track custom metrics
  trackCustomMetric: (name: string, value: number) => {
    performanceMonitor.recordMetric(name, value);
  },

  // Generate performance report
  generateReport: () => {
    return performanceMonitor.generateReport();
  },
};

/**
 * Error tracking integration
 * Use these methods throughout your application for error handling
 */
export const errorTracking = {
  // Track application errors
  trackError: (error: Error, context?: any) => {
    enhancedErrorAnalytics.recordError({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context,
      severity: 'error',
      fingerprint: error.message + (error.stack || ''),
    });
  },

  // Track user actions for error context
  trackUserAction: (action: string, data?: any) => {
    enhancedErrorAnalytics.recordUserAction({
      type: action,
      timestamp: Date.now(),
      data,
    });
  },

  // Get error analytics
  getErrorAnalytics: () => {
    return enhancedErrorAnalytics.getErrorAnalytics();
  },

  // Get error patterns
  getErrorPatterns: () => {
    return enhancedErrorAnalytics.getErrorPatterns();
  },
};

/**
 * Monitoring and health checks
 * Use these for ongoing system monitoring
 */
export const systemMonitoring = {
  // Check overall system health
  checkHealth: async () => {
    return await monitoringAndAlerting.checkSystemHealth();
  },

  // Get current readiness status
  getReadinessStatus: () => {
    return productionReadinessOrchestrator.getLatestReadinessStatus();
  },

  // Get system status summary
  getStatusSummary: () => {
    return productionReadinessOrchestrator.getSystemStatusSummary();
  },

  // Manual readiness check
  checkReadiness: async (environment: 'development' | 'staging' | 'production') => {
    return await productionReadinessOrchestrator.checkProductionReadiness(environment);
  },
};

/**
 * Web platform utilities
 * Use these for web-specific functionality
 */
export const webPlatform = {
  // Check if running on web
  isWeb: () => {
    return require('react-native').Platform.OS === 'web';
  },

  // Get Core Web Vitals (web only)
  getCoreWebVitals: () => {
    if (webPlatform.isWeb()) {
      return WebOptimizations.getInstance().getCoreWebVitals();
    }
    return null;
  },

  // Check web optimization status
  isOptimized: () => {
    if (webPlatform.isWeb()) {
      return WebOptimizations.getInstance().initialized;
    }
    return true; // Not applicable on mobile
  },
};

/**
 * Development utilities
 * Use these during development and testing
 */
export const developmentUtils = {
  // Run quick security test
  runQuickSecurityTest: async () => {
    return await securityAuditService.runTestSuite('authentication');
  },

  // Get performance budget status
  getPerformanceBudgets: () => {
    return performanceMonitor.getBudgetStatus();
  },

  // Get deployment history
  getDeploymentHistory: () => {
    return productionReadinessOrchestrator.getDeploymentHistory();
  },

  // Reset performance metrics
  resetPerformanceMetrics: () => {
    performanceMonitor.reset();
  },
};

/**
 * Production monitoring dashboard data
 * Use this to create monitoring dashboards
 */
export const dashboardData = {
  async getCompleteStatus() {
    const readinessStatus = productionReadinessOrchestrator.getLatestReadinessStatus();
    const performanceMetrics = performanceMonitor.getMetrics();
    const errorAnalytics = enhancedErrorAnalytics.getErrorAnalytics();
    const systemHealth = await monitoringAndAlerting.checkSystemHealth();

    return {
      overall: {
        status: readinessStatus?.overall || 'unknown',
        score: readinessStatus?.score || 0,
        lastCheck: readinessStatus?.timestamp || 0,
      },
      performance: {
        startupTime: performanceMetrics.startupTime,
        memoryUsage: performanceMetrics.memoryUsage,
        navigationTime: performanceMetrics.navigationTime,
        apiResponseTime: performanceMetrics.apiResponseTime,
        fps: performanceMetrics.fps,
      },
      errors: {
        errorRate: errorAnalytics.errorRate,
        totalErrors: errorAnalytics.totalErrors,
        uniqueErrors: errorAnalytics.uniqueErrors,
        criticalErrors: errorAnalytics.criticalErrors,
      },
      security: {
        lastAudit: securityAuditService.getLatestAuditReport()?.timestamp || 0,
        vulnerabilities: securityAuditService.getLatestAuditReport()?.summary.vulnerabilities || {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
      },
      health: {
        status: systemHealth.status,
        uptime: systemHealth.uptime,
        lastCheck: systemHealth.timestamp,
      },
    };
  },
};
