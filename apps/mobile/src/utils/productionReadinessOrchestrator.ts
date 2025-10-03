/**
 * Production Readiness Orchestrator
 *
 * Central orchestrator service that coordinates all production readiness features:
 * - Web platform adaptations
 * - Monitoring and alerting
 * - Performance budgets enforcement
 * - Enhanced error tracking and analytics
 * - Security audit and penetration testing
 *
 * This service provides a unified interface for production deployment verification
 * and continuous monitoring of application health, performance, and security.
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';
import { WebOptimizations } from './webOptimizations/';
import { monitoringAndAlerting } from './monitoringAndAlerting';
import { enhancedErrorAnalytics } from './errorTracking';
import { securityAuditService } from './securityAuditAndPenetrationTesting';
import { apiProtectionService } from './ApiProtection';
import { Platform } from 'react-native';

export interface ProductionReadinessStatus {
  overall: 'ready' | 'warning' | 'not_ready';
  score: number; // 0-100
  timestamp: number;
  components: {
    webPlatform: ComponentStatus;
    monitoring: ComponentStatus;
    performance: ComponentStatus;
    errorTracking: ComponentStatus;
    security: ComponentStatus;
  };
  recommendations: string[];
  blockers: string[];
}

export interface ComponentStatus {
  status: 'healthy' | 'warning' | 'error';
  score: number;
  message: string;
  lastCheck: number;
  metrics?: Record<string, any>;
}

export interface DeploymentReport {
  deploymentId: string;
  environment: 'development' | 'staging' | 'production';
  timestamp: number;
  readinessCheck: ProductionReadinessStatus;
  securityAudit?: any;
  performanceBaseline?: any;
  webCompatibility?: any;
  deploymentApproved: boolean;
  approvalReasons: string[];
  blockers?: string[];
}

export class ProductionReadinessOrchestrator {
  private isInitialized = false;
  private lastReadinessCheck?: ProductionReadinessStatus;
  private deploymentHistory: DeploymentReport[] = [];
  private autoCheckInterval?: NodeJS.Timeout;

  /**
   * Initialize the production readiness orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('ProductionReadiness', 'Already initialized');
      return;
    }

    logger.info('ProductionReadiness', 'Initializing production readiness orchestrator');

    try {
      // Initialize web platform optimizations if on web
      if (Platform.OS === 'web') {
        await WebOptimizations.getInstance().initializeEnhanced(
          {
            appName: 'Mintenance',
            shortName: 'Mintenance',
            appDescription: 'Contractor Discovery Marketplace',
            themeColor: '#007AFF',
            backgroundColor: '#FFFFFF',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            startUrl: '/',
            icons: [],
            iconSizes: [192, 512],
          },
          {
            enableWebP: true,
            enableLazyLoading: true,
            enableProgressiveJPEG: true,
            compressionQuality: 85,
            enableCriticalResourceHints: true,
          },
          {
            siteName: 'Mintenance',
            defaultTitle: 'Mintenance - Contractor Discovery',
            defaultDescription: 'Connect with trusted contractors for your home improvement projects',
            defaultKeywords: ['contractors', 'home improvement', 'marketplace'],
            enableStructuredData: true,
          },
          {
            googleAnalyticsId: 'G-XXXXXXXXXX',
            enableUserTiming: true,
            enableScrollDepthTracking: true,
            enableCustomEvents: true,
            enableConversionTracking: true,
          }
        );
      }

      // Initialize monitoring and alerting
      await monitoringAndAlerting.initialize();

      // Start auto-monitoring
      this.startAutoMonitoring();

      this.isInitialized = true;
      logger.info('ProductionReadiness', 'Production readiness orchestrator initialized successfully');
    } catch (error) {
      logger.error('ProductionReadiness', 'Failed to initialize orchestrator', { error: error as Error });
      throw error;
    }
  }

  /**
   * Perform comprehensive production readiness check
   */
  async checkProductionReadiness(environment: 'development' | 'staging' | 'production' = 'development'): Promise<ProductionReadinessStatus> {
    logger.info('ProductionReadiness', 'Starting production readiness check', { environment });

    const timestamp = Date.now();
    const components: ProductionReadinessStatus['components'] = {
      webPlatform: await this.checkWebPlatformReadiness(),
      monitoring: await this.checkMonitoringReadiness(),
      performance: await this.checkPerformanceReadiness(),
      errorTracking: await this.checkErrorTrackingReadiness(),
      security: await this.checkSecurityReadiness(),
    };

    // Calculate overall score and status
    const scores = Object.values(components).map(c => c.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Determine overall status
    let overall: 'ready' | 'warning' | 'not_ready';
    if (averageScore >= 90) overall = 'ready';
    else if (averageScore >= 70) overall = 'warning';
    else overall = 'not_ready';

    // Generate recommendations and blockers
    const recommendations = this.generateRecommendations(components);
    const blockers = this.generateBlockers(components);

    const status: ProductionReadinessStatus = {
      overall,
      score: Math.round(averageScore),
      timestamp,
      components,
      recommendations,
      blockers,
    };

    this.lastReadinessCheck = status;

    logger.info('ProductionReadiness', 'Production readiness check completed', {
      overall: status.overall,
      score: status.score,
      blockerCount: blockers.length,
      recommendationCount: recommendations.length,
    });

    return status;
  }

  /**
   * Check web platform readiness
   */
  private async checkWebPlatformReadiness(): Promise<ComponentStatus> {
    try {
      if (Platform.OS !== 'web') {
        return {
          status: 'healthy',
          score: 100,
          message: 'Web platform checks skipped (not running on web)',
          lastCheck: Date.now(),
        };
      }

      // Check web optimizations
      const webOptimizations = WebOptimizations.getInstance();
      const isOptimized = webOptimizations.initialized;
      const webMetrics = webOptimizations.getCoreWebVitals();

      let score = 100;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Web platform is fully optimized and ready';

      if (!isOptimized) {
        score -= 30;
        status = 'warning';
        message = 'Web optimizations not fully initialized';
      }

      // Check Core Web Vitals
      if (webMetrics.lcp && webMetrics.lcp > 2500) {
        score -= 20;
        status = 'warning';
        message = 'Largest Contentful Paint (LCP) needs improvement';
      }

      if (webMetrics.fid && webMetrics.fid > 100) {
        score -= 15;
        status = 'warning';
        message = 'First Input Delay (FID) needs improvement';
      }

      if (webMetrics.cls && webMetrics.cls > 0.1) {
        score -= 15;
        status = 'warning';
        message = 'Cumulative Layout Shift (CLS) needs improvement';
      }

      return {
        status,
        score: Math.max(0, score),
        message,
        lastCheck: Date.now(),
        metrics: {
          isOptimized,
          webMetrics,
        },
      };
    } catch (error) {
      logger.error('ProductionReadiness', 'Web platform readiness check failed', { error: error as Error });
      return {
        status: 'error',
        score: 0,
        message: 'Web platform readiness check failed',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Check monitoring readiness
   */
  private async checkMonitoringReadiness(): Promise<ComponentStatus> {
    try {
      const healthStatus = await monitoringAndAlerting.checkSystemHealth();
      const alertStats = monitoringAndAlerting.getAlertStatistics();

      let score = 100;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Monitoring system is healthy and operational';

      // Check overall health
      if (healthStatus.status !== 'healthy') {
        score -= 40;
        status = 'error';
        message = `Monitoring system health: ${healthStatus.status}`;
      }

      // Check for recent alerts
      if (alertStats.activeAlerts > 0) {
        score -= 20;
        status = 'warning';
        message = `${alertStats.activeAlerts} active alerts in monitoring system`;
      }

      // Check alert system functionality
      if (alertStats.totalAlerts === 0 && alertStats.lastAlert === 0) {
        score -= 10;
        status = 'warning';
        message = 'Alert system may not be functioning (no recent alerts)';
      }

      return {
        status,
        score: Math.max(0, score),
        message,
        lastCheck: Date.now(),
        metrics: {
          healthStatus,
          alertStats,
        },
      };
    } catch (error) {
      logger.error('ProductionReadiness', 'Monitoring readiness check failed', error as Error);
      return {
        status: 'error',
        score: 0,
        message: 'Monitoring readiness check failed',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Check performance readiness
   */
  private async checkPerformanceReadiness(): Promise<ComponentStatus> {
    try {
      const metrics = performanceMonitor.getMetrics();
      const budgetStatus = performanceMonitor.getBudgetStatus();

      let score = 100;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Performance metrics are within acceptable ranges';

      // Check budget violations
      const errors = budgetStatus.filter(b => b.status === 'error');
      const warnings = budgetStatus.filter(b => b.status === 'warning');

      if (errors.length > 0) {
        score -= 30;
        status = 'error';
        message = `${errors.length} performance budget violations (errors)`;
      } else if (warnings.length > 0) {
        score -= 15;
        status = 'warning';
        message = `${warnings.length} performance budget warnings`;
      }

      // Check specific metrics
      if (metrics.startupTime && metrics.startupTime > 5000) {
        score -= 20;
        status = 'error';
        message = 'App startup time exceeds acceptable limits';
      }

      if (metrics.memoryUsage && metrics.memoryUsage > 300000000) {
        score -= 15;
        status = 'warning';
        message = 'Memory usage is high';
      }

      return {
        status,
        score: Math.max(0, score),
        message,
        lastCheck: Date.now(),
        metrics: {
          performanceMetrics: metrics,
          budgetStatus,
        },
      };
    } catch (error) {
      logger.error('ProductionReadiness', 'Performance readiness check failed', error as Error);
      return {
        status: 'error',
        score: 0,
        message: 'Performance readiness check failed',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Check error tracking readiness
   */
  private async checkErrorTrackingReadiness(): Promise<ComponentStatus> {
    try {
      const analytics = enhancedErrorAnalytics.getErrorAnalytics();
      const patterns = enhancedErrorAnalytics.getErrorPatterns();
      const trends = enhancedErrorAnalytics.getTrendAnalysis();

      let score = 100;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Error tracking is operational with healthy metrics';

      // Check error rates
      if (analytics.errorRate > 0.05) { // 5% error rate
        score -= 30;
        status = 'error';
        message = `High error rate detected: ${(analytics.errorRate * 100).toFixed(2)}%`;
      } else if (analytics.errorRate > 0.01) { // 1% error rate
        score -= 15;
        status = 'warning';
        message = `Elevated error rate: ${(analytics.errorRate * 100).toFixed(2)}%`;
      }

      // Check for critical error patterns
      const criticalPatterns = patterns.filter((p: any) => p.severity === 'critical');
      if (criticalPatterns.length > 0) {
        score -= 25;
        status = 'error';
        message = `${criticalPatterns.length} critical error patterns detected`;
      }

      // Check error trends
      if (trends.isIncreasing && trends.changeRate > 0.5) {
        score -= 20;
        status = 'warning';
        message = 'Error rates are trending upward';
      }

      return {
        status,
        score: Math.max(0, score),
        message,
        lastCheck: Date.now(),
        metrics: {
          errorAnalytics: analytics,
          errorPatterns: patterns.length,
          trendAnalysis: trends,
        },
      };
    } catch (error) {
      logger.error('ProductionReadiness', 'Error tracking readiness check failed', error as Error);
      return {
        status: 'error',
        score: 0,
        message: 'Error tracking readiness check failed',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Check security readiness
   */
  private async checkSecurityReadiness(): Promise<ComponentStatus> {
    try {
      // Run quick security audit
      const auditReport = await securityAuditService.runSecurityAudit();
      const securityStats = apiProtectionService.getSecurityStats();

      let score = 100;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Security systems are operational and secure';

      // Check vulnerability counts
      const vulns = auditReport.summary.vulnerabilities;
      if (vulns.critical > 0) {
        score -= 50;
        status = 'error';
        message = `${vulns.critical} critical security vulnerabilities found`;
      } else if (vulns.high > 0) {
        score -= 30;
        status = 'error';
        message = `${vulns.high} high severity security vulnerabilities found`;
      } else if (vulns.medium > 0) {
        score -= 15;
        status = 'warning';
        message = `${vulns.medium} medium severity security vulnerabilities found`;
      }

      // Check security violations
      if (securityStats.recentViolations > 10) {
        score -= 20;
        status = 'warning';
        message = `High number of recent security violations: ${securityStats.recentViolations}`;
      }

      // Check overall audit score
      if (auditReport.summary.overallScore < 70) {
        score = Math.min(score, auditReport.summary.overallScore);
        status = 'error';
        message = `Security audit score below threshold: ${auditReport.summary.overallScore}/100`;
      }

      return {
        status,
        score: Math.max(0, score),
        message,
        lastCheck: Date.now(),
        metrics: {
          auditSummary: auditReport.summary,
          securityStats,
        },
      };
    } catch (error) {
      logger.error('ProductionReadiness', 'Security readiness check failed', error as Error);
      return {
        status: 'error',
        score: 0,
        message: 'Security readiness check failed',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Generate recommendations based on component status
   */
  private generateRecommendations(components: ProductionReadinessStatus['components']): string[] {
    const recommendations: string[] = [];

    // Web platform recommendations
    if (components.webPlatform.score < 90) {
      recommendations.push('🌐 Optimize web platform performance and Core Web Vitals');
    }

    // Monitoring recommendations
    if (components.monitoring.score < 90) {
      recommendations.push('📊 Review and address monitoring system issues');
    }

    // Performance recommendations
    if (components.performance.score < 90) {
      recommendations.push('⚡ Optimize application performance and address budget violations');
    }

    // Error tracking recommendations
    if (components.errorTracking.score < 90) {
      recommendations.push('🐛 Investigate and resolve error patterns and trends');
    }

    // Security recommendations
    if (components.security.score < 90) {
      recommendations.push('🔒 Address security vulnerabilities and strengthen protection');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ All systems are healthy. Continue monitoring and maintaining quality standards.');
    } else {
      recommendations.push('📈 Implement continuous monitoring for production environment');
      recommendations.push('🔄 Set up automated alerts for critical issues');
    }

    return recommendations;
  }

  /**
   * Generate deployment blockers
   */
  private generateBlockers(components: ProductionReadinessStatus['components']): string[] {
    const blockers: string[] = [];

    // Critical blockers that prevent deployment
    Object.entries(components).forEach(([name, component]) => {
      if (component.status === 'error' && component.score < 50) {
        blockers.push(`❌ ${name}: ${component.message}`);
      }
    });

    return blockers;
  }

  /**
   * Create deployment report
   */
  async createDeploymentReport(environment: 'development' | 'staging' | 'production'): Promise<DeploymentReport> {
    logger.info('ProductionReadiness', 'Creating deployment report', { environment });

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const readinessCheck = await this.checkProductionReadiness(environment);

    // Run additional checks for production deployment
    let securityAudit, performanceBaseline, webCompatibility;

    if (environment === 'production') {
      securityAudit = await securityAuditService.runSecurityAudit(environment);
      performanceBaseline = performanceMonitor.generateReport();

      if (Platform.OS === 'web') {
        const webOptimizations = WebOptimizations.getInstance();
        webCompatibility = {
          coreWebVitals: webOptimizations.getCoreWebVitals(),
          optimizationStatus: webOptimizations.initialized,
        };
      }
    }

    // Determine deployment approval
    const deploymentApproved = readinessCheck.overall === 'ready' && readinessCheck.blockers.length === 0;
    const approvalReasons = deploymentApproved
      ? ['All systems healthy', 'No critical blockers', 'Production readiness criteria met']
      : [`Overall status: ${readinessCheck.overall}`, ...readinessCheck.blockers];

    const report: DeploymentReport = {
      deploymentId,
      environment,
      timestamp: Date.now(),
      readinessCheck,
      securityAudit,
      performanceBaseline,
      webCompatibility,
      deploymentApproved,
      approvalReasons,
    };

    // Store in deployment history
    this.deploymentHistory.push(report);

    // Keep only last 20 deployments
    if (this.deploymentHistory.length > 20) {
      this.deploymentHistory = this.deploymentHistory.slice(-20);
    }

    logger.info('ProductionReadiness', 'Deployment report created', {
      deploymentId,
      approved: deploymentApproved,
      score: readinessCheck.score,
    });

    return report;
  }

  /**
   * Start automatic monitoring
   */
  private startAutoMonitoring(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
    }

    // Run readiness check every 5 minutes
    this.autoCheckInterval = setInterval(async () => {
      try {
        await this.checkProductionReadiness();
      } catch (error) {
        logger.error('ProductionReadiness', 'Auto monitoring check failed', error as Error);
      }
    }, 5 * 60 * 1000);

    logger.info('ProductionReadiness', 'Auto monitoring started (5-minute intervals)');
  }

  /**
   * Stop automatic monitoring
   */
  stopAutoMonitoring(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
      this.autoCheckInterval = undefined;
      logger.info('ProductionReadiness', 'Auto monitoring stopped');
    }
  }

  /**
   * Get latest readiness status
   */
  getLatestReadinessStatus(): ProductionReadinessStatus | undefined {
    return this.lastReadinessCheck;
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(): DeploymentReport[] {
    return [...this.deploymentHistory];
  }

  /**
   * Get system status summary
   */
  getSystemStatusSummary(): {
    overall: string;
    components: Record<string, string>;
    lastCheck: number;
    uptime: number;
  } {
    const status = this.lastReadinessCheck;
    if (!status) {
      return {
        overall: 'unknown',
        components: {},
        lastCheck: 0,
        uptime: 0,
      };
    }

    const componentStatus = Object.entries(status.components).reduce((acc, [name, component]) => {
      acc[name] = component.status;
      return acc;
    }, {} as Record<string, string>);

    return {
      overall: status.overall,
      components: componentStatus,
      lastCheck: status.timestamp,
      uptime: Date.now() - (this.deploymentHistory[0]?.timestamp || Date.now()),
    };
  }

  /**
   * Dispose of the orchestrator
   */
  dispose(): void {
    this.stopAutoMonitoring();
    this.isInitialized = false;
    logger.info('ProductionReadiness', 'Production readiness orchestrator disposed');
  }
}

// Export singleton instance
export const productionReadinessOrchestrator = new ProductionReadinessOrchestrator();

export default productionReadinessOrchestrator;