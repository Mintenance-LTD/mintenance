import { Platform } from 'react-native';
import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { WebOptimizationsManager } from '../webOptimizations/';
import { securityAuditService } from '../security';
import {
  checkWebPlatformReadiness, checkMonitoringReadiness, checkPerformanceReadiness,
  checkErrorTrackingReadiness, checkSecurityReadiness, generateRecommendations, generateBlockers,
} from './StatusChecker';
import { monitoringAndAlerting } from '../monitoringAndAlerting';
import type { ProductionReadinessStatus, DeploymentReport } from './types';

export class ProductionReadinessOrchestrator {
  private isInitialized = false;
  private lastReadinessCheck?: ProductionReadinessStatus;
  private deploymentHistory: DeploymentReport[] = [];
  private autoCheckInterval?: NodeJS.Timeout;

  async initialize(): Promise<void> {
    if (this.isInitialized) { logger.warn('ProductionReadiness', 'Already initialized'); return; }
    logger.info('ProductionReadiness', 'Initializing production readiness orchestrator');
    try {
      if (Platform.OS === 'web') {
        await WebOptimizationsManager.getInstance().initialize({
          pwa: { appName: 'Mintenance', shortName: 'Mintenance', appDescription: 'Contractor Discovery Marketplace',
            themeColor: '#007AFF', backgroundColor: '#FFFFFF', display: 'standalone', orientation: 'portrait',
            scope: '/', startUrl: '/', icons: [], iconSizes: [192, 512] },
          image: { enableWebP: true, enableLazyLoading: true, enableProgressiveJPEG: true, compressionQuality: 85, enableCriticalResourceHints: true },
          seo: { siteName: 'Mintenance', defaultTitle: 'Mintenance - Contractor Discovery',
            defaultDescription: 'Connect with trusted contractors for your home improvement projects',
            defaultKeywords: ['contractors', 'home improvement', 'marketplace'], enableStructuredData: true },
          analytics: { googleAnalyticsId: 'G-XXXXXXXXXX', enableUserTiming: true, enableScrollDepthTracking: true,
            enableCustomEvents: true, enableConversionTracking: true },
        });
      }
      await monitoringAndAlerting.initialize();
      this.startAutoMonitoring();
      this.isInitialized = true;
      logger.info('ProductionReadiness', 'Production readiness orchestrator initialized successfully');
    } catch (error) {
      logger.error('ProductionReadiness', 'Failed to initialize orchestrator', { error } as Record<string, unknown>);
      throw error;
    }
  }

  async checkProductionReadiness(environment: 'development' | 'staging' | 'production' = 'development'): Promise<ProductionReadinessStatus> {
    logger.info('ProductionReadiness', 'Starting production readiness check', { environment });
    const timestamp = Date.now();
    const components: ProductionReadinessStatus['components'] = {
      webPlatform: await checkWebPlatformReadiness(),
      monitoring: await checkMonitoringReadiness(),
      performance: await checkPerformanceReadiness(),
      errorTracking: await checkErrorTrackingReadiness(),
      security: await checkSecurityReadiness(),
    };

    const scores = Object.values(components).map((c) => c.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    let overall: 'ready' | 'warning' | 'not_ready';
    if (averageScore >= 90) overall = 'ready';
    else if (averageScore >= 70) overall = 'warning';
    else overall = 'not_ready';

    const recommendations = generateRecommendations(components);
    const blockers = generateBlockers(components);
    const status: ProductionReadinessStatus = { overall, score: Math.round(averageScore), timestamp, components, recommendations, blockers };
    this.lastReadinessCheck = status;
    logger.info('ProductionReadiness', 'Production readiness check completed', { overall: status.overall, score: status.score, blockerCount: blockers.length });
    return status;
  }

  async createDeploymentReport(environment: 'development' | 'staging' | 'production'): Promise<DeploymentReport> {
    logger.info('ProductionReadiness', 'Creating deployment report', { environment });
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const readinessCheck = await this.checkProductionReadiness(environment);
    this.lastReadinessCheck = readinessCheck;

    let securityAudit, performanceBaseline, webCompatibility;
    if (environment === 'production') {
      securityAudit = await securityAuditService.runSecurityAudit(environment);
      performanceBaseline = performanceMonitor.generateReport();
      if (Platform.OS === 'web') {
        const webOptimizations = WebOptimizationsManager.getInstance();
        webCompatibility = { coreWebVitals: webOptimizations.getWebVitals(), optimizationStatus: webOptimizations.initialized };
      }
    }

    const deploymentApproved = readinessCheck.overall !== 'not_ready' && readinessCheck.blockers.length === 0;
    const approvalReasons = deploymentApproved
      ? (readinessCheck.overall === 'ready'
        ? ['All systems healthy', 'No critical blockers', 'Production readiness criteria met']
        : ['Overall status: warning', 'No critical blockers', 'Proceed with caution'])
      : [`Overall status: ${readinessCheck.overall}`, ...readinessCheck.blockers];

    const report: DeploymentReport = {
      deploymentId, environment, timestamp: readinessCheck.timestamp, readinessCheck,
      securityAudit, performanceBaseline, webCompatibility, deploymentApproved, approvalReasons,
    };

    this.deploymentHistory.push(report);
    if (this.deploymentHistory.length > 20) this.deploymentHistory = this.deploymentHistory.slice(-20);
    logger.info('ProductionReadiness', 'Deployment report created', { deploymentId, approved: deploymentApproved, score: readinessCheck.score });
    return report;
  }

  private startAutoMonitoring(): void {
    if (this.autoCheckInterval) clearInterval(this.autoCheckInterval);
    this.autoCheckInterval = setInterval(async () => {
      try { await this.checkProductionReadiness(); } catch (error) { logger.error('ProductionReadiness', 'Auto monitoring check failed', error as unknown as Record<string, unknown>); }
    }, 5 * 60 * 1000);
    logger.info('ProductionReadiness', 'Auto monitoring started (5-minute intervals)');
  }

  stopAutoMonitoring(): void {
    if (this.autoCheckInterval) { clearInterval(this.autoCheckInterval); this.autoCheckInterval = undefined; logger.info('ProductionReadiness', 'Auto monitoring stopped'); }
  }

  getLatestReadinessStatus(): ProductionReadinessStatus | undefined { return this.lastReadinessCheck; }
  getDeploymentHistory(): DeploymentReport[] { return [...this.deploymentHistory]; }

  getSystemStatusSummary(): { overall: string; components: Record<string, string>; lastCheck: number; uptime: number } {
    const status = this.lastReadinessCheck;
    if (!status) return { overall: 'unknown', components: {}, lastCheck: 0, uptime: 0 };
    const componentStatus = Object.entries(status.components).reduce((acc, [name, component]) => { acc[name] = component.status; return acc; }, {} as Record<string, string>);
    const firstDeploymentTimestamp = this.deploymentHistory[0]?.readinessCheck?.timestamp ?? this.deploymentHistory[0]?.timestamp ?? this.lastReadinessCheck?.timestamp;
    return { overall: status.overall, components: componentStatus, lastCheck: status.timestamp, uptime: Date.now() - (firstDeploymentTimestamp || Date.now()) };
  }

  dispose(): void {
    this.stopAutoMonitoring();
    this.isInitialized = false;
    logger.info('ProductionReadiness', 'Production readiness orchestrator disposed');
  }
}
