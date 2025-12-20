/**
 * Error Analytics Module
 * Handles error analytics, aggregation, insights, and trend analysis
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import {
  ErrorPattern,
  ErrorOccurrence,
  ErrorMetrics,
  ErrorInsight,
  ErrorRecommendation,
  ErrorTrend,
  UserErrorProfile,
  ErrorCategory,
  ErrorSeverity
} from './ErrorTypes';
import { ErrorReportGenerator } from './ErrorReportGenerator';
import { ErrorTrendAnalysis } from './ErrorTrendAnalysis';

export class ErrorAnalytics {
  private errorPatterns = new Map<string, ErrorPattern>();
  private recentOccurrences: ErrorOccurrence[] = [];
  private userProfiles = new Map<string, UserErrorProfile>();
  private maxOccurrences = 10000; // Prevent memory leaks
  private reportGenerator = new ErrorReportGenerator();
  private trendAnalysis = new ErrorTrendAnalysis();

  /**
   * Update or create error pattern
   */
  updateErrorPattern(
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
    pattern.metrics.impactScore = this.trendAnalysis.calculateImpactScore(pattern);

    // Update trend
    pattern.metrics.trend = this.trendAnalysis.calculateTrend(pattern);

    // Limit occurrences to prevent memory leaks
    if (pattern.occurrences.length > 100) {
      pattern.occurrences = pattern.occurrences.slice(-50);
    }
  }

  /**
   * Add error occurrence
   */
  addOccurrence(occurrence: ErrorOccurrence): void {
    this.recentOccurrences.push(occurrence);
    if (this.recentOccurrences.length > this.maxOccurrences) {
      this.recentOccurrences = this.recentOccurrences.slice(-this.maxOccurrences / 2);
    }
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, signature: string, category: ErrorCategory): void {
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

  /**
   * Generate error trends analysis
   */
  generateErrorTrends(period: ErrorTrend['period'] = '24h'): ErrorTrend {
    return this.trendAnalysis.generateErrorTrends(
      this.recentOccurrences,
      this.errorPatterns,
      period
    );
  }

  /**
   * Get error patterns with insights
   */
  getErrorPatterns(options: {
    limit?: number;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    timeRange?: number;
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
   * Generate insights for a pattern
   */
  generateInsights(signature: string): void {
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

  /**
   * Clean old data
   */
  performCleanup(oneWeekAgo: number): void {
    // Clean old occurrences
    this.recentOccurrences = this.recentOccurrences.filter(
      occurrence => occurrence.timestamp > oneWeekAgo
    );

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
  }

  /**
   * Get analytics counts
   */
  getAnalyticsCounts(): {
    patternsCount: number;
    occurrencesCount: number;
    userProfilesCount: number;
  } {
    return {
      patternsCount: this.errorPatterns.size,
      occurrencesCount: this.recentOccurrences.length,
      userProfilesCount: this.userProfiles.size
    };
  }

  /**
   * Clear all analytics data
   */
  clearAll(): void {
    this.errorPatterns.clear();
    this.recentOccurrences = [];
    this.userProfiles.clear();
  }

  /**
   * Private helper methods
   */

  private analyzeErrorContext(pattern: ErrorPattern): ErrorInsight | null {
    const screens = pattern.occurrences.map(o => o.context.screen).filter(Boolean);

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

    return recommendations.slice(0, 3);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport(): string {
    const trends = this.generateErrorTrends('24h');
    const topPatterns = this.getErrorPatterns({ limit: 10, sortBy: 'impact' });
    const criticalPatterns = this.getErrorPatterns({
      severity: ErrorSeverity.FATAL,
      timeRange: 24 * 60 * 60 * 1000
    });

    return this.reportGenerator.generateAnalyticsReport(trends, topPatterns, criticalPatterns);
  }
}
