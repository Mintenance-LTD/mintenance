/**
 * Error Trend Analysis Module
 * Handles error trend analysis and metrics calculation
 */

import {
  ErrorPattern,
  ErrorOccurrence,
  ErrorTrend,
  ErrorCategory,
  ErrorSeverity
} from './ErrorTypes';

export class ErrorTrendAnalysis {
  /**
   * Generate error trends analysis
   */
  generateErrorTrends(
    recentOccurrences: ErrorOccurrence[],
    errorPatterns: Map<string, ErrorPattern>,
    period: ErrorTrend['period'] = '24h'
  ): ErrorTrend {
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
    recentOccurrences
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
          const pattern = Array.from(errorPatterns.values())
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
      recentOccurrences
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
        resolved: Array.from(errorPatterns.values())
          .filter(p => p.metrics.resolution === 'resolved').length
      }
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(pattern: ErrorPattern): 'increasing' | 'decreasing' | 'stable' {
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

  /**
   * Calculate impact score
   */
  calculateImpactScore(pattern: ErrorPattern): number {
    const severityWeight = {
      [ErrorSeverity.FATAL]: 40,
      [ErrorSeverity.ERROR]: 30,
      [ErrorSeverity.WARNING]: 15,
      [ErrorSeverity.INFO]: 5,
      [ErrorSeverity.DEBUG]: 1
    };

    const frequencyScore = Math.min(30, pattern.metrics.frequency * 2);
    const userImpactScore = Math.min(20, pattern.metrics.uniqueUsers.size * 2);
    const severityScore = severityWeight[pattern.severity] || 10;
    const recencyScore = this.getRecencyScore(pattern.metrics.lastSeen);

    return Math.round(frequencyScore + userImpactScore + severityScore + recencyScore);
  }

  /**
   * Get recency score
   */
  getRecencyScore(lastSeen: number): number {
    const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
    return Math.max(0, 10 - hoursSince);
  }

  /**
   * Private helper methods
   */
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
      case '1h': return 5 * 60 * 1000;
      case '6h': return 30 * 60 * 1000;
      case '24h': return 60 * 60 * 1000;
      case '7d': return 6 * 60 * 60 * 1000;
      case '30d': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}
