/**
 * Enhanced Error Tracking and Analytics System
 * Advanced error analytics, categorization, trend analysis, and actionable insights
 */

import { Platform } from 'react-native';
import { logger } from './logger';
import { ErrorTracker, ErrorCategory, ErrorSeverity } from './errorTracking';

export interface ErrorMetrics {
  count: number;
  uniqueUsers: Set<string>;
  firstSeen: number;
  lastSeen: number;
  frequency: number; // errors per hour
  trend: 'increasing' | 'decreasing' | 'stable';
  impactScore: number; // 0-100
  resolution: 'pending' | 'investigating' | 'resolved' | 'wont_fix';
}

export interface ErrorPattern {
  id: string;
  signature: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  occurrences: ErrorOccurrence[];
  metrics: ErrorMetrics;
  insights: ErrorInsight[];
  recommendations: ErrorRecommendation[];
  tags: string[];
}

export interface ErrorOccurrence {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  context: ErrorContext;
  stackTrace: string;
  environment: {
    platform: string;
    version: string;
    device?: string;
    network?: string;
  };
  userAgent?: string;
  breadcrumbs: Breadcrumb[];
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  feature?: string;
  userJourney?: string;
  jobId?: string;
  contractorId?: string;
  experimentVariant?: string;
  customData?: Record<string, any>;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorInsight {
  type: 'correlation' | 'pattern' | 'trend' | 'impact';
  title: string;
  description: string;
  confidence: number; // 0-1
  data: Record<string, any>;
}

export interface ErrorRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'fix' | 'monitor' | 'investigate';
  title: string;
  description: string;
  actions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: 'low' | 'medium' | 'high';
}

export interface ErrorTrend {
  period: '1h' | '6h' | '24h' | '7d' | '30d';
  data: Array<{
    timestamp: number;
    count: number;
    uniqueUsers: number;
    severity: Record<ErrorSeverity, number>;
    category: Record<ErrorCategory, number>;
  }>;
  summary: {
    totalErrors: number;
    uniqueUsers: number;
    errorRate: number; // errors per user session
    criticalErrors: number;
    newErrors: number; // first-time errors
    resolved: number;
  };
}

export interface UserErrorProfile {
  userId: string;
  totalErrors: number;
  uniqueErrors: number;
  errorPatterns: string[];
  mostCommonCategories: ErrorCategory[];
  averageSessionHealth: number; // 0-1, 1 being no errors
  lastErrorDate: number;
  errorFrequency: number; // errors per session
}

/**
 * Enhanced Error Analytics Engine
 */
export class EnhancedErrorAnalytics {
  private static instance: EnhancedErrorAnalytics;
  private errorPatterns = new Map<string, ErrorPattern>();
  private recentOccurrences: ErrorOccurrence[] = [];
  private userProfiles = new Map<string, UserErrorProfile>();
  private sessionBreadcrumbs = new Map<string, Breadcrumb[]>();
  private currentSessionId: string = this.generateSessionId();
  private analyticsEnabled = true;
  private maxOccurrences = 10000; // Prevent memory leaks
  private cleanupInterval?: NodeJS.Timeout;

  static getInstance(): EnhancedErrorAnalytics {
    if (!this.instance) {
      this.instance = new EnhancedErrorAnalytics();
      this.instance.initialize();
    }
    return this.instance;
  }

  /**
   * Initialize the analytics system
   */
  private initialize(): void {
    logger.info('EnhancedErrorAnalytics', 'Initializing advanced error analytics');

    // Start cleanup routine
    this.startCleanupRoutine();

    // Initialize session tracking
    this.initializeSession();

    // Set up global error interception
    this.setupGlobalErrorInterception();

    logger.info('EnhancedErrorAnalytics', 'Advanced error analytics initialized');
  }

  /**
   * Track an error with comprehensive analytics
   */
  trackError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    userId?: string
  ): string {
    if (!this.analyticsEnabled) return '';

    try {
      // Generate error signature for pattern recognition
      const signature = this.generateErrorSignature(error, context);

      // Create error occurrence
      const occurrence: ErrorOccurrence = {
        id: this.generateId(),
        timestamp: Date.now(),
        userId,
        sessionId: this.currentSessionId,
        context,
        stackTrace: error.stack || '',
        environment: this.getEnvironmentInfo(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        breadcrumbs: this.getSessionBreadcrumbs()
      };

      // Update or create error pattern
      this.updateErrorPattern(signature, error, category, severity, occurrence);

      // Update user profile
      if (userId) {
        this.updateUserProfile(userId, signature, category);
      }

      // Add to recent occurrences
      this.recentOccurrences.push(occurrence);
      if (this.recentOccurrences.length > this.maxOccurrences) {
        this.recentOccurrences = this.recentOccurrences.slice(-this.maxOccurrences / 2);
      }

      // Delegate to original error tracker
      const eventId = ErrorTracker.captureError(error, category, severity, {
        userId,
        feature: context.feature,
        userJourney: context.userJourney,
        jobId: context.jobId,
        contractorId: context.contractorId,
        experimentVariant: context.experimentVariant
      }, context.customData);

      // Generate insights and recommendations
      this.generateInsights(signature);

      logger.debug('EnhancedErrorAnalytics', 'Error tracked with analytics', {
        signature,
        category,
        severity,
        eventId
      });

      return eventId;
    } catch (trackingError) {
      logger.error('EnhancedErrorAnalytics', 'Failed to track error analytics', trackingError as Error);
      return '';
    }
  }

  /**
   * Add breadcrumb for user journey tracking
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data
    };

    // Add to session breadcrumbs
    const sessionBreadcrumbs = this.sessionBreadcrumbs.get(this.currentSessionId) || [];
    sessionBreadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs per session
    if (sessionBreadcrumbs.length > 50) {
      sessionBreadcrumbs.shift();
    }

    this.sessionBreadcrumbs.set(this.currentSessionId, sessionBreadcrumbs);

    // Also add to original error tracker
    ErrorTracker.addBreadcrumb(message, category, level, data);
  }

  /**
   * Generate error trends analysis
   */
  generateErrorTrends(period: ErrorTrend['period'] = '24h'): ErrorTrend {
    const now = Date.now();
    const periodMs = this.getPeriodInMs(period);
    const bucketSize = this.getBucketSize(period);
    const buckets = Math.ceil(periodMs / bucketSize);

    const trendData: ErrorTrend['data'] = [];
    const uniqueUsersSet = new Set<string>();
    let totalErrors = 0;
    let criticalErrors = 0;
    let newErrorsSet = new Set<string>();

    // Initialize buckets
    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - periodMs + (i * bucketSize);
      trendData.push({
        timestamp: bucketStart,
        count: 0,
        uniqueUsers: 0,
        severity: {
          [ErrorSeverity.FATAL]: 0,
          [ErrorSeverity.ERROR]: 0,
          [ErrorSeverity.WARNING]: 0,
          [ErrorSeverity.INFO]: 0,
          [ErrorSeverity.DEBUG]: 0
        },
        category: Object.values(ErrorCategory).reduce((acc, cat) => {
          acc[cat] = 0;
          return acc;
        }, {} as Record<ErrorCategory, number>)
      });
    }

    // Aggregate error data
    this.recentOccurrences
      .filter(occurrence => occurrence.timestamp > now - periodMs)
      .forEach(occurrence => {
        const bucketIndex = Math.floor((occurrence.timestamp - (now - periodMs)) / bucketSize);
        if (bucketIndex >= 0 && bucketIndex < buckets) {
          const bucket = trendData[bucketIndex];
          bucket.count++;

          if (occurrence.userId) {
            uniqueUsersSet.add(occurrence.userId);
          }

          totalErrors++;

          // Find the pattern for this occurrence
          const pattern = Array.from(this.errorPatterns.values())
            .find(p => p.occurrences.some(o => o.id === occurrence.id));

          if (pattern) {
            bucket.severity[pattern.severity]++;
            bucket.category[pattern.category]++;

            if (pattern.severity === ErrorSeverity.FATAL || pattern.severity === ErrorSeverity.ERROR) {
              criticalErrors++;
            }

            // Check if this is a new error pattern
            if (pattern.metrics.firstSeen > now - periodMs) {
              newErrorsSet.add(pattern.signature);
            }
          }
        }
      });

    // Calculate unique users per bucket
    trendData.forEach(bucket => {
      const bucketUsers = new Set<string>();
      this.recentOccurrences
        .filter(o =>
          o.timestamp >= bucket.timestamp &&
          o.timestamp < bucket.timestamp + bucketSize &&
          o.userId
        )
        .forEach(o => bucketUsers.add(o.userId!));
      bucket.uniqueUsers = bucketUsers.size;
    });

    return {
      period,
      data: trendData,
      summary: {
        totalErrors,
        uniqueUsers: uniqueUsersSet.size,
        errorRate: uniqueUsersSet.size > 0 ? totalErrors / uniqueUsersSet.size : 0,
        criticalErrors,
        newErrors: newErrorsSet.size,
        resolved: Array.from(this.errorPatterns.values())
          .filter(p => p.metrics.resolution === 'resolved').length
      }
    };
  }

  /**
   * Get error patterns with insights
   */
  getErrorPatterns(options: {
    limit?: number;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    timeRange?: number; // milliseconds
    sortBy?: 'frequency' | 'impact' | 'recent';
  } = {}): ErrorPattern[] {
    let patterns = Array.from(this.errorPatterns.values());

    // Apply filters
    if (options.category) {
      patterns = patterns.filter(p => p.category === options.category);
    }

    if (options.severity) {
      patterns = patterns.filter(p => p.severity === options.severity);
    }

    if (options.timeRange) {
      const cutoff = Date.now() - options.timeRange;
      patterns = patterns.filter(p => p.metrics.lastSeen > cutoff);
    }

    // Sort patterns
    switch (options.sortBy) {
      case 'frequency':
        patterns.sort((a, b) => b.metrics.frequency - a.metrics.frequency);
        break;
      case 'impact':
        patterns.sort((a, b) => b.metrics.impactScore - a.metrics.impactScore);
        break;
      case 'recent':
        patterns.sort((a, b) => b.metrics.lastSeen - a.metrics.lastSeen);
        break;
      default:
        patterns.sort((a, b) => b.metrics.count - a.metrics.count);
    }

    // Apply limit
    if (options.limit) {
      patterns = patterns.slice(0, options.limit);
    }

    return patterns;
  }

  /**
   * Get user error profiles
   */
  getUserErrorProfiles(options: {
    limit?: number;
    sortBy?: 'errorCount' | 'errorRate' | 'recent';
  } = {}): UserErrorProfile[] {
    let profiles = Array.from(this.userProfiles.values());

    // Sort profiles
    switch (options.sortBy) {
      case 'errorCount':
        profiles.sort((a, b) => b.totalErrors - a.totalErrors);
        break;
      case 'errorRate':
        profiles.sort((a, b) => b.errorFrequency - a.errorFrequency);
        break;
      case 'recent':
        profiles.sort((a, b) => b.lastErrorDate - a.lastErrorDate);
        break;
      default:
        profiles.sort((a, b) => b.totalErrors - a.totalErrors);
    }

    // Apply limit
    if (options.limit) {
      profiles = profiles.slice(0, options.limit);
    }

    return profiles;
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport(): string {
    const trends = this.generateErrorTrends('24h');
    const topPatterns = this.getErrorPatterns({ limit: 10, sortBy: 'impact' });
    const criticalPatterns = this.getErrorPatterns({
      severity: ErrorSeverity.FATAL,
      timeRange: 24 * 60 * 60 * 1000 // 24 hours
    });

    let report = `# 📊 Error Analytics Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    report += `**Platform:** ${Platform.OS}\n`;
    report += `**Analysis Period:** Last 24 hours\n\n`;

    // Executive Summary
    report += `## 📈 Executive Summary\n\n`;
    report += `- **Total Errors:** ${trends.summary.totalErrors}\n`;
    report += `- **Affected Users:** ${trends.summary.uniqueUsers}\n`;
    report += `- **Error Rate:** ${trends.summary.errorRate.toFixed(2)} errors/user\n`;
    report += `- **Critical Errors:** ${trends.summary.criticalErrors}\n`;
    report += `- **New Error Types:** ${trends.summary.newErrors}\n`;
    report += `- **Resolved Issues:** ${trends.summary.resolved}\n\n`;

    // Critical Issues
    if (criticalPatterns.length > 0) {
      report += `## 🚨 Critical Issues Requiring Immediate Attention\n\n`;
      criticalPatterns.slice(0, 5).forEach((pattern, index) => {
        report += `### ${index + 1}. ${pattern.signature}\n`;
        report += `- **Occurrences:** ${pattern.metrics.count}\n`;
        report += `- **Users Affected:** ${pattern.metrics.uniqueUsers.size}\n`;
        report += `- **Impact Score:** ${pattern.metrics.impactScore}/100\n`;
        report += `- **Trend:** ${pattern.metrics.trend}\n`;
        if (pattern.recommendations.length > 0) {
          report += `- **Top Recommendation:** ${pattern.recommendations[0].title}\n`;
        }
        report += '\n';
      });
    }

    // Top Error Patterns
    report += `## 🔍 Top Error Patterns by Impact\n\n`;
    topPatterns.slice(0, 10).forEach((pattern, index) => {
      const emoji = this.getSeverityEmoji(pattern.severity);
      report += `${index + 1}. ${emoji} **${pattern.signature}**\n`;
      report += `   - Count: ${pattern.metrics.count} | Users: ${pattern.metrics.uniqueUsers.size} | Impact: ${pattern.metrics.impactScore}/100\n`;
      report += `   - Category: ${pattern.category} | Status: ${pattern.metrics.resolution}\n`;
    });
    report += '\n';

    // Insights
    const allInsights = topPatterns.flatMap(p => p.insights).slice(0, 5);
    if (allInsights.length > 0) {
      report += `## 💡 Key Insights\n\n`;
      allInsights.forEach((insight, index) => {
        report += `${index + 1}. **${insight.title}** (${Math.round(insight.confidence * 100)}% confidence)\n`;
        report += `   ${insight.description}\n\n`;
      });
    }

    // Recommendations
    const allRecommendations = topPatterns
      .flatMap(p => p.recommendations)
      .filter(r => r.priority === 'critical' || r.priority === 'high')
      .slice(0, 5);

    if (allRecommendations.length > 0) {
      report += `## 🎯 Priority Recommendations\n\n`;
      allRecommendations.forEach((rec, index) => {
        const priorityEmoji = rec.priority === 'critical' ? '🚨' : '⚠️';
        report += `${index + 1}. ${priorityEmoji} **${rec.title}** (${rec.priority})\n`;
        report += `   ${rec.description}\n`;
        report += `   - Effort: ${rec.estimatedEffort} | Impact: ${rec.potentialImpact}\n\n`;
      });
    }

    report += `---\n*Generated by Mintenance Enhanced Error Analytics*\n`;

    return report;
  }

  /**
   * Private helper methods
   */
  private generateErrorSignature(error: Error, context: ErrorContext): string {
    // Create a unique signature for error pattern recognition
    const errorType = error.name || 'Error';
    const errorMessage = this.normalizeErrorMessage(error.message);
    const location = context.screen || context.feature || 'unknown';
    const action = context.action || 'unknown';

    return `${errorType}:${errorMessage}:${location}:${action}`;
  }

  private normalizeErrorMessage(message: string): string {
    // Normalize error messages for better pattern matching
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase()
      .slice(0, 100); // Limit length
  }

  private updateErrorPattern(
    signature: string,
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    occurrence: ErrorOccurrence
  ): void {
    let pattern = this.errorPatterns.get(signature);

    if (!pattern) {
      pattern = {
        id: this.generateId(),
        signature,
        category,
        severity,
        occurrences: [],
        metrics: {
          count: 0,
          uniqueUsers: new Set(),
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          frequency: 0,
          trend: 'stable',
          impactScore: 0,
          resolution: 'pending'
        },
        insights: [],
        recommendations: [],
        tags: []
      };
      this.errorPatterns.set(signature, pattern);
    }

    // Update metrics
    pattern.occurrences.push(occurrence);
    pattern.metrics.count++;
    pattern.metrics.lastSeen = Date.now();

    if (occurrence.userId) {
      pattern.metrics.uniqueUsers.add(occurrence.userId);
    }

    // Calculate frequency (errors per hour)
    const hoursSinceFirst = Math.max(1, (Date.now() - pattern.metrics.firstSeen) / (1000 * 60 * 60));
    pattern.metrics.frequency = pattern.metrics.count / hoursSinceFirst;

    // Calculate impact score
    pattern.metrics.impactScore = this.calculateImpactScore(pattern);

    // Update trend
    pattern.metrics.trend = this.calculateTrend(pattern);

    // Limit occurrences to prevent memory leaks
    if (pattern.occurrences.length > 100) {
      pattern.occurrences = pattern.occurrences.slice(-50);
    }
  }

  private calculateImpactScore(pattern: ErrorPattern): number {
    // Calculate impact score based on multiple factors
    const severityWeight = {
      [ErrorSeverity.FATAL]: 40,
      [ErrorSeverity.ERROR]: 30,
      [ErrorSeverity.WARNING]: 15,
      [ErrorSeverity.INFO]: 5,
      [ErrorSeverity.DEBUG]: 1
    };

    const frequencyScore = Math.min(30, pattern.metrics.frequency * 2); // Max 30 points
    const userImpactScore = Math.min(20, pattern.metrics.uniqueUsers.size * 2); // Max 20 points
    const severityScore = severityWeight[pattern.severity] || 10;
    const recencyScore = this.getRecencyScore(pattern.metrics.lastSeen); // Max 10 points

    return Math.round(frequencyScore + userImpactScore + severityScore + recencyScore);
  }

  private calculateTrend(pattern: ErrorPattern): 'increasing' | 'decreasing' | 'stable' {
    if (pattern.occurrences.length < 5) return 'stable';

    const recent = pattern.occurrences.slice(-5);
    const older = pattern.occurrences.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentRate = recent.length / 5;
    const olderRate = older.length / 5;

    if (recentRate > olderRate * 1.2) return 'increasing';
    if (recentRate < olderRate * 0.8) return 'decreasing';
    return 'stable';
  }

  private getRecencyScore(lastSeen: number): number {
    const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
    return Math.max(0, 10 - hoursSince); // 10 points for recent errors, decreasing over time
  }

  private generateInsights(signature: string): void {
    const pattern = this.errorPatterns.get(signature);
    if (!pattern) return;

    const insights: ErrorInsight[] = [];

    // User correlation insight
    if (pattern.metrics.uniqueUsers.size > 1) {
      insights.push({
        type: 'correlation',
        title: 'Multiple Users Affected',
        description: `This error affects ${pattern.metrics.uniqueUsers.size} users, suggesting a systemic issue rather than user-specific problem.`,
        confidence: 0.8,
        data: { userCount: pattern.metrics.uniqueUsers.size }
      });
    }

    // Frequency insight
    if (pattern.metrics.frequency > 5) {
      insights.push({
        type: 'trend',
        title: 'High Frequency Error',
        description: `This error occurs ${pattern.metrics.frequency.toFixed(1)} times per hour, indicating a critical issue.`,
        confidence: 0.9,
        data: { frequency: pattern.metrics.frequency }
      });
    }

    // Pattern analysis
    const contextAnalysis = this.analyzeErrorContext(pattern);
    if (contextAnalysis) {
      insights.push(contextAnalysis);
    }

    pattern.insights = insights;

    // Generate recommendations based on insights
    pattern.recommendations = this.generateRecommendations(pattern, insights);
  }

  private analyzeErrorContext(pattern: ErrorPattern): ErrorInsight | null {
    const screens = pattern.occurrences.map(o => o.context.screen).filter(Boolean);
    const features = pattern.occurrences.map(o => o.context.feature).filter(Boolean);

    // Check for screen concentration
    if (screens.length > 0) {
      const screenCounts = screens.reduce((acc, screen) => {
        acc[screen!] = (acc[screen!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxScreen = Object.keys(screenCounts).reduce((a, b) =>
        screenCounts[a] > screenCounts[b] ? a : b
      );

      if (screenCounts[maxScreen] / screens.length > 0.7) {
        return {
          type: 'pattern',
          title: 'Screen-Specific Error',
          description: `${Math.round(screenCounts[maxScreen] / screens.length * 100)}% of errors occur on ${maxScreen} screen.`,
          confidence: 0.85,
          data: { screen: maxScreen, concentration: screenCounts[maxScreen] / screens.length }
        };
      }
    }

    return null;
  }

  private generateRecommendations(pattern: ErrorPattern, insights: ErrorInsight[]): ErrorRecommendation[] {
    const recommendations: ErrorRecommendation[] = [];

    // High frequency recommendations
    if (pattern.metrics.frequency > 10) {
      recommendations.push({
        priority: 'critical',
        category: 'fix',
        title: 'Implement Circuit Breaker',
        description: 'High error frequency detected. Implement circuit breaker pattern to prevent cascade failures.',
        actions: [
          'Add error rate monitoring',
          'Implement fallback mechanisms',
          'Add automatic service degradation'
        ],
        estimatedEffort: 'medium',
        potentialImpact: 'high'
      });
    }

    // Multiple users affected
    if (pattern.metrics.uniqueUsers.size > 5) {
      recommendations.push({
        priority: 'high',
        category: 'fix',
        title: 'Priority Bug Fix',
        description: 'Multiple users affected. This should be prioritized for immediate fix.',
        actions: [
          'Assign to senior developer',
          'Add comprehensive logging',
          'Create reproduction test case'
        ],
        estimatedEffort: 'high',
        potentialImpact: 'high'
      });
    }

    // Screen-specific recommendations
    const screenInsight = insights.find(i => i.type === 'pattern' && i.data.screen);
    if (screenInsight) {
      recommendations.push({
        priority: 'medium',
        category: 'investigate',
        title: 'Screen-Specific Investigation',
        description: `Focus investigation on ${screenInsight.data.screen} screen implementation.`,
        actions: [
          'Review screen component code',
          'Check for memory leaks',
          'Validate user interactions'
        ],
        estimatedEffort: 'medium',
        potentialImpact: 'medium'
      });
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
  }

  private updateUserProfile(userId: string, signature: string, category: ErrorCategory): void {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        totalErrors: 0,
        uniqueErrors: 0,
        errorPatterns: [],
        mostCommonCategories: [],
        averageSessionHealth: 1,
        lastErrorDate: Date.now(),
        errorFrequency: 0
      };
      this.userProfiles.set(userId, profile);
    }

    profile.totalErrors++;
    profile.lastErrorDate = Date.now();

    if (!profile.errorPatterns.includes(signature)) {
      profile.errorPatterns.push(signature);
      profile.uniqueErrors++;
    }

    // Update category frequency
    const categoryCount = profile.errorPatterns
      .map(sig => this.errorPatterns.get(sig)?.category)
      .filter(Boolean)
      .reduce((acc, cat) => {
        acc[cat!] = (acc[cat!] || 0) + 1;
        return acc;
      }, {} as Record<ErrorCategory, number>);

    profile.mostCommonCategories = Object.keys(categoryCount)
      .sort((a, b) => categoryCount[b as ErrorCategory] - categoryCount[a as ErrorCategory])
      .slice(0, 3) as ErrorCategory[];

    // Calculate session health (simplified)
    profile.averageSessionHealth = Math.max(0, 1 - (profile.errorFrequency / 10));
  }

  private getEnvironmentInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      device: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      network: typeof navigator !== 'undefined' && 'connection' in navigator
        ? (navigator as any).connection?.effectiveType
        : 'unknown'
    };
  }

  private getSessionBreadcrumbs(): Breadcrumb[] {
    return this.sessionBreadcrumbs.get(this.currentSessionId) || [];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodInMs(period: ErrorTrend['period']): number {
    switch (period) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private getBucketSize(period: ErrorTrend['period']): number {
    switch (period) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '6h': return 30 * 60 * 1000; // 30 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 6 * 60 * 60 * 1000; // 6 hours
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 60 * 1000;
    }
  }

  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.FATAL: return '🚨';
      case ErrorSeverity.ERROR: return '🔴';
      case ErrorSeverity.WARNING: return '🟡';
      case ErrorSeverity.INFO: return '🔵';
      case ErrorSeverity.DEBUG: return '⚪';
      default: return '❓';
    }
  }

  private initializeSession(): void {
    this.currentSessionId = this.generateSessionId();
    this.sessionBreadcrumbs.set(this.currentSessionId, []);

    // Track session start
    this.addBreadcrumb(
      'Session started',
      'session',
      'info',
      {
        sessionId: this.currentSessionId,
        platform: Platform.OS,
        timestamp: Date.now()
      }
    );
  }

  private setupGlobalErrorInterception(): void {
    // Intercept console errors for additional tracking
    if (typeof console !== 'undefined') {
      const originalError = console.error;
      console.error = (...args) => {
        this.addBreadcrumb(
          `Console error: ${args[0]}`,
          'console',
          'error',
          { args: args.slice(1) }
        );
        originalError.apply(console, args);
      };
    }
  }

  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  private performCleanup(): void {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Clean old occurrences
    this.recentOccurrences = this.recentOccurrences.filter(
      occurrence => occurrence.timestamp > oneWeekAgo
    );

    // Clean old breadcrumbs
    for (const [sessionId, breadcrumbs] of this.sessionBreadcrumbs.entries()) {
      if (breadcrumbs.length === 0 || breadcrumbs[breadcrumbs.length - 1].timestamp < oneWeekAgo) {
        this.sessionBreadcrumbs.delete(sessionId);
      }
    }

    // Clean old pattern occurrences
    for (const pattern of this.errorPatterns.values()) {
      pattern.occurrences = pattern.occurrences.filter(
        occurrence => occurrence.timestamp > oneWeekAgo
      );

      // Remove patterns with no recent occurrences
      if (pattern.occurrences.length === 0 && pattern.metrics.lastSeen < oneWeekAgo) {
        this.errorPatterns.delete(pattern.signature);
      }
    }

    logger.debug('EnhancedErrorAnalytics', 'Cleanup completed', {
      patternsCount: this.errorPatterns.size,
      occurrencesCount: this.recentOccurrences.length,
      sessionsCount: this.sessionBreadcrumbs.size
    });
  }

  /**
   * Get analytics status and statistics
   */
  getAnalyticsStatus(): {
    enabled: boolean;
    patternsTracked: number;
    recentOccurrences: number;
    sessionsTracked: number;
    userProfiles: number;
    memoryUsage: string;
  } {
    const estimatedMemory =
      (this.errorPatterns.size * 1000) + // Rough estimate per pattern
      (this.recentOccurrences.length * 500) + // Rough estimate per occurrence
      (this.userProfiles.size * 200); // Rough estimate per profile

    return {
      enabled: this.analyticsEnabled,
      patternsTracked: this.errorPatterns.size,
      recentOccurrences: this.recentOccurrences.length,
      sessionsTracked: this.sessionBreadcrumbs.size,
      userProfiles: this.userProfiles.size,
      memoryUsage: `~${Math.round(estimatedMemory / 1024)}KB`
    };
  }

  /**
   * Enable or disable analytics
   */
  setAnalyticsEnabled(enabled: boolean): void {
    this.analyticsEnabled = enabled;
    logger.info('EnhancedErrorAnalytics', `Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all analytics data
   */
  clearAnalyticsData(): void {
    this.errorPatterns.clear();
    this.recentOccurrences = [];
    this.userProfiles.clear();
    this.sessionBreadcrumbs.clear();
    this.initializeSession();

    logger.info('EnhancedErrorAnalytics', 'All analytics data cleared');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.clearAnalyticsData();
    this.analyticsEnabled = false;

    logger.info('EnhancedErrorAnalytics', 'Enhanced error analytics disposed');
  }
}

// Export singleton instance
export const enhancedErrorAnalytics = EnhancedErrorAnalytics.getInstance();

// Convenience functions
export const trackEnhancedError = (
  error: Error,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context: ErrorContext = {},
  userId?: string
): string => {
  return enhancedErrorAnalytics.trackError(error, category, severity, context, userId);
};

export const addErrorBreadcrumb = (
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void => {
  enhancedErrorAnalytics.addBreadcrumb(message, category, level, data);
};

export const getErrorTrends = (period: ErrorTrend['period'] = '24h'): ErrorTrend => {
  return enhancedErrorAnalytics.generateErrorTrends(period);
};

export const getTopErrorPatterns = (limit: number = 10): ErrorPattern[] => {
  return enhancedErrorAnalytics.getErrorPatterns({ limit, sortBy: 'impact' });
};

export const generateErrorReport = (): string => {
  return enhancedErrorAnalytics.generateAnalyticsReport();
};

// Auto-initialize analytics in production
if (!__DEV__) {
  logger.info('EnhancedErrorAnalytics', 'Auto-initializing enhanced error analytics');
}