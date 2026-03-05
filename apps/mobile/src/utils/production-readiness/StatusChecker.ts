import { Platform } from 'react-native';
import { logger } from '../logger';
import { performanceMonitor } from '../performanceMonitor';
import { WebOptimizationsManager } from '../webOptimizations/';
import { monitoringAndAlerting } from '../monitoringAndAlerting';
import { enhancedErrorAnalytics } from '../errorTracking/';
import { securityAuditService } from '../security';
import { apiProtectionService } from '../ApiProtection';
import type { ComponentStatus, ProductionReadinessStatus } from './types';

export async function checkWebPlatformReadiness(): Promise<ComponentStatus> {
  try {
    if (Platform.OS !== 'web') {
      let webMetrics: ReturnType<typeof WebOptimizationsManager.prototype.getWebVitals> | undefined;
      try { webMetrics = WebOptimizationsManager.getInstance().getWebVitals(); } catch { webMetrics = undefined; }
      return {
        status: 'healthy', score: 100,
        message: 'Web platform checks skipped (not running on web)',
        lastCheck: Date.now(), metrics: webMetrics ? { webMetrics } : undefined,
      };
    }

    const webOptimizations = WebOptimizationsManager.getInstance();
    const isOptimized = webOptimizations.initialized;
    const webMetrics = webOptimizations.getWebVitals();

    let score = 100;
    let status: ComponentStatus['status'] = 'healthy';
    let message = 'Web platform is fully optimized and ready';

    if (!isOptimized) { score -= 30; status = 'warning'; message = 'Web optimizations not fully initialized'; }
    if (webMetrics.lcp && webMetrics.lcp > 2500) { score -= 20; status = 'warning'; message = 'Largest Contentful Paint (LCP) needs improvement'; }
    if (webMetrics.fid && webMetrics.fid > 100) { score -= 15; status = 'warning'; message = 'First Input Delay (FID) needs improvement'; }
    if (webMetrics.cls && webMetrics.cls > 0.1) { score -= 15; status = 'warning'; message = 'Cumulative Layout Shift (CLS) needs improvement'; }

    return { status, score: Math.max(0, score), message, lastCheck: Date.now(), metrics: { isOptimized, webMetrics } };
  } catch (error) {
    logger.error('ProductionReadiness', 'Web platform readiness check failed', error as unknown as Record<string, unknown>);
    return { status: 'error', score: 0, message: 'Web platform readiness check failed', lastCheck: Date.now() };
  }
}

export async function checkMonitoringReadiness(): Promise<ComponentStatus> {
  try {
    const healthStatus = await monitoringAndAlerting.checkSystemHealth();
    const alertStats = monitoringAndAlerting.getAlertStatistics() as Record<string, number>;

    let score = 100;
    let status: ComponentStatus['status'] = 'healthy';
    let message = 'Monitoring system is healthy and operational';

    if (healthStatus.status !== 'healthy') { score -= 60; status = 'error'; message = `Monitoring system health: ${healthStatus.status}`; }
    if (alertStats.activeAlerts > 0) {
      const alertPenalty = Math.min(60, alertStats.activeAlerts * 12);
      score -= alertPenalty;
      if (status !== 'error') { status = 'warning'; message = `${alertStats.activeAlerts} active alerts in monitoring system`; }
    }
    if (alertStats.totalAlerts === 0 && alertStats.lastAlert === 0) {
      score -= 10;
      if (status !== 'error') { status = 'warning'; message = 'Alert system may not be functioning (no recent alerts)'; }
    }

    return { status, score: Math.max(0, score), message, lastCheck: Date.now(), metrics: { healthStatus, alertStats } };
  } catch (error) {
    logger.error('ProductionReadiness', 'Monitoring readiness check failed', error as unknown as Record<string, unknown>);
    return { status: 'error', score: 0, message: 'Monitoring readiness check failed', lastCheck: Date.now() };
  }
}

export async function checkPerformanceReadiness(): Promise<ComponentStatus> {
  try {
    const metrics = performanceMonitor.getMetrics();
    const budgetStatus = performanceMonitor.getBudgetStatus();

    let score = 100;
    let status: ComponentStatus['status'] = 'healthy';
    let message = 'Performance metrics are within acceptable ranges';

    const errors = budgetStatus.filter((b: Record<string, unknown>) => b.status === 'error');
    const warnings = budgetStatus.filter((b: Record<string, unknown>) => b.status === 'warning');

    if (errors.length > 0) { score -= 30; status = 'error'; message = `${errors.length} performance budget violations (errors)`; }
    else if (warnings.length > 0) { score -= 15; status = 'warning'; message = `${warnings.length} performance budget warnings`; }
    if (metrics.startupTime && metrics.startupTime > 5000) {
      score -= 20; status = 'error';
      if (errors.length === 0 && warnings.length === 0) { message = 'App startup time exceeds acceptable limits'; }
    }
    if (metrics.memoryUsage && metrics.memoryUsage > 300000000) {
      score -= 15;
      if (status !== 'error') { status = 'warning'; message = 'Memory usage is high'; }
    }

    return { status, score: Math.max(0, score), message, lastCheck: Date.now(), metrics: { performanceMetrics: metrics, budgetStatus } };
  } catch (error) {
    logger.error('ProductionReadiness', 'Performance readiness check failed', error as unknown as Record<string, unknown>);
    return { status: 'error', score: 0, message: 'Performance readiness check failed', lastCheck: Date.now() };
  }
}

export async function checkErrorTrackingReadiness(): Promise<ComponentStatus> {
  try {
    const analytics = enhancedErrorAnalytics.getErrorAnalytics() as { errorRate?: number };
    const patterns = enhancedErrorAnalytics.getErrorPatterns();
    const trends = enhancedErrorAnalytics.getTrendAnalysis() as { isIncreasing?: boolean; changeRate?: number };

    let score = 100;
    let status: ComponentStatus['status'] = 'healthy';
    let message = 'Error tracking is operational with healthy metrics';

    const errorRate = analytics.errorRate ?? 0;
    if (errorRate > 0.05) { score -= 40; status = 'error'; message = `High error rate detected: ${(errorRate * 100).toFixed(2)}%`; }
    else if (errorRate > 0.01) { score -= 15; status = 'warning'; message = `Elevated error rate: ${(errorRate * 100).toFixed(2)}%`; }

    const criticalPatterns = patterns.filter((p) => (p.severity as string) === 'critical');
    if (criticalPatterns.length > 0) { score -= 25; status = 'error'; message = `${criticalPatterns.length} critical error patterns detected`; }
    if (status !== 'error' && trends.isIncreasing && (trends.changeRate ?? 0) > 0.5) { score -= 20; status = 'warning'; message = 'Error rates are trending upward'; }

    return { status, score: Math.max(0, score), message, lastCheck: Date.now(), metrics: { errorAnalytics: analytics, errorPatterns: patterns.length, trendAnalysis: trends } };
  } catch (error) {
    logger.error('ProductionReadiness', 'Error tracking readiness check failed', error as unknown as Record<string, unknown>);
    return { status: 'error', score: 0, message: 'Error tracking readiness check failed', lastCheck: Date.now() };
  }
}

export async function checkSecurityReadiness(): Promise<ComponentStatus> {
  try {
    const auditReport = await securityAuditService.runSecurityAudit();
    const securityStats = apiProtectionService.getSecurityStats();

    let score = 100;
    let status: ComponentStatus['status'] = 'healthy';
    let message = 'Security systems are operational and secure';

    const vulns = auditReport.summary.vulnerabilities;
    if (vulns.critical > 0) { score -= 60; status = 'error'; message = `${vulns.critical} critical security vulnerabilities found`; }
    else if (vulns.high > 0) { score -= 40; status = 'error'; message = `${vulns.high} high severity security vulnerabilities found`; }
    else if (vulns.medium > 0) { score -= 20; status = 'warning'; message = `${vulns.medium} medium severity security vulnerabilities found`; }

    if (securityStats.recentViolations > 10) {
      score -= 20;
      if (status !== 'error') { status = 'warning'; message = `High number of recent security violations: ${securityStats.recentViolations}`; }
    }
    if (auditReport.summary.overallScore < 70) {
      score = Math.min(score, auditReport.summary.overallScore);
      if (status !== 'error') { status = 'error'; message = `Security audit score below threshold: ${auditReport.summary.overallScore}/100`; }
    }

    return { status, score: Math.max(0, score), message, lastCheck: Date.now(), metrics: { auditSummary: auditReport.summary, securityStats } };
  } catch (error) {
    logger.error('ProductionReadiness', 'Security readiness check failed', error as unknown as Record<string, unknown>);
    return { status: 'error', score: 0, message: 'Security readiness check failed', lastCheck: Date.now() };
  }
}

export function generateRecommendations(components: ProductionReadinessStatus['components']): string[] {
  const recommendations: string[] = [];
  const webMetrics = components.webPlatform.metrics?.webMetrics as { lcp?: number; fid?: number; cls?: number } | undefined;
  const hasPoorWebVitals = (webMetrics?.lcp && webMetrics.lcp > 2500) || (webMetrics?.fid && webMetrics.fid > 100) || (webMetrics?.cls && webMetrics.cls > 0.1);

  if (components.webPlatform.score < 90 || hasPoorWebVitals) recommendations.push('🌐 Optimize web platform performance and Core Web Vitals');
  if (components.monitoring.score < 90) recommendations.push('📊 Review and address monitoring system issues');
  if (components.performance.score < 90) recommendations.push('⚡ Optimize application performance and address budget violations');
  if (components.errorTracking.score < 90) recommendations.push('🐛 Investigate and resolve error patterns and trends');
  if (components.security.score < 90) recommendations.push('🔒 Address security vulnerabilities and strengthen protection');

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems are healthy. Continue monitoring and maintaining quality standards.');
  } else {
    recommendations.push('📈 Implement continuous monitoring for production environment');
    recommendations.push('🔄 Set up automated alerts for critical issues');
  }
  return recommendations;
}

export function generateBlockers(components: ProductionReadinessStatus['components']): string[] {
  const blockers: string[] = [];
  Object.entries(components).forEach(([name, component]) => {
    if (component.status === 'error' && component.score < 50) blockers.push(`❌ ${name}: ${component.message}`);
  });
  return blockers;
}
