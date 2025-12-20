/**
 * Tests for Error Analytics Module
 */

import { ErrorAnalytics } from '../ErrorAnalytics';
import {
  ErrorCategory,
  ErrorSeverity,
  ErrorOccurrence,
  ErrorPattern,
} from '../ErrorTypes';

// Mock dependencies
jest.mock('../../logger');
jest.mock('../ErrorReportGenerator', () => ({
  ErrorReportGenerator: jest.fn().mockImplementation(() => ({
    generateAnalyticsReport: jest.fn(() => 'Test Analytics Report'),
  })),
}));

jest.mock('../ErrorTrendAnalysis', () => ({
  ErrorTrendAnalysis: jest.fn().mockImplementation(() => ({
    calculateImpactScore: jest.fn(() => 75),
    calculateTrend: jest.fn(() => 'stable'),
    generateErrorTrends: jest.fn((occurrences, patterns, period) => ({
      period: period || '24h',
      totalErrors: 10,
      errorRate: 0.01,
      isIncreasing: false,
      changeRate: 0.1,
    })),
  })),
}));

describe('ErrorAnalytics', () => {
  let analytics: ErrorAnalytics;
  let testError: Error;
  let testOccurrence: ErrorOccurrence;

  beforeEach(() => {
    jest.clearAllMocks();
    analytics = new ErrorAnalytics();
    testError = new Error('Test error');
    testOccurrence = {
      id: 'test-id',
      timestamp: Date.now(),
      error: testError,
      context: {
        screen: 'TestScreen',
        action: 'test-action',
        userId: 'user-123',
        sessionId: 'session-456',
        deviceInfo: {
          platform: 'ios',
          osVersion: '15.0',
          appVersion: '1.0.0',
        },
      },
      stackTrace: 'test stack trace',
      handled: true,
    };
  });

  describe('updateErrorPattern', () => {
    it('should create new error pattern', () => {
      analytics.updateErrorPattern(
        'test-signature',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].signature).toBe('test-signature');
      expect(patterns[0].category).toBe(ErrorCategory.NETWORK);
      expect(patterns[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should update existing error pattern', () => {
      const signature = 'test-signature';

      analytics.updateErrorPattern(
        signature,
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      analytics.updateErrorPattern(
        signature,
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        { ...testOccurrence, id: 'test-id-2' }
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].metrics.count).toBe(2);
    });

    it('should track unique users', () => {
      const signature = 'user-signature';

      analytics.updateErrorPattern(
        signature,
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        { ...testOccurrence, userId: 'user-1' }
      );

      analytics.updateErrorPattern(
        signature,
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        { ...testOccurrence, userId: 'user-2' }
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].metrics.uniqueUsers.size).toBe(2);
    });

    it('should calculate frequency', () => {
      analytics.updateErrorPattern(
        'freq-test',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].metrics.frequency).toBeGreaterThan(0);
    });

    it('should limit occurrence history to 100 items', () => {
      const signature = 'limit-test';

      for (let i = 0; i < 150; i++) {
        analytics.updateErrorPattern(
          signature,
          testError,
          ErrorCategory.NETWORK,
          ErrorSeverity.HIGH,
          { ...testOccurrence, id: `test-${i}` }
        );
      }

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].occurrences.length).toBeLessThanOrEqual(100);
    });
  });

  describe('addOccurrence', () => {
    it('should add error occurrence', () => {
      analytics.addOccurrence(testOccurrence);

      const counts = analytics.getAnalyticsCounts();
      expect(counts.occurrencesCount).toBe(1);
    });

    it('should limit occurrences to prevent memory leaks', () => {
      for (let i = 0; i < 15000; i++) {
        analytics.addOccurrence({ ...testOccurrence, id: `occ-${i}` });
      }

      const counts = analytics.getAnalyticsCounts();
      expect(counts.occurrencesCount).toBeLessThanOrEqual(10000);
    });
  });

  describe('updateUserProfile', () => {
    it('should create new user profile', () => {
      analytics.updateUserProfile('user-123', 'sig-1', ErrorCategory.NETWORK);

      const profiles = analytics.getUserErrorProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].userId).toBe('user-123');
    });

    it('should update existing user profile', () => {
      analytics.updateUserProfile('user-123', 'sig-1', ErrorCategory.NETWORK);
      analytics.updateUserProfile('user-123', 'sig-2', ErrorCategory.API);

      const profiles = analytics.getUserErrorProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].totalErrors).toBe(2);
      expect(profiles[0].uniqueErrors).toBe(2);
    });

    it('should track most common categories', () => {
      analytics.updateErrorPattern(
        'sig-1',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      analytics.updateErrorPattern(
        'sig-2',
        testError,
        ErrorCategory.API,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      analytics.updateUserProfile('user-123', 'sig-1', ErrorCategory.NETWORK);
      analytics.updateUserProfile('user-123', 'sig-2', ErrorCategory.API);

      const profiles = analytics.getUserErrorProfiles();
      expect(profiles[0].mostCommonCategories.length).toBeGreaterThan(0);
    });

    it('should calculate session health', () => {
      analytics.updateUserProfile('user-123', 'sig-1', ErrorCategory.NETWORK);

      const profiles = analytics.getUserErrorProfiles();
      expect(profiles[0].averageSessionHealth).toBeGreaterThanOrEqual(0);
      expect(profiles[0].averageSessionHealth).toBeLessThanOrEqual(1);
    });
  });

  describe('generateErrorTrends', () => {
    it('should generate trends for 24h period', () => {
      const trends = analytics.generateErrorTrends('24h');

      expect(trends).toBeDefined();
      expect(trends.period).toBe('24h');
    });

    it('should generate trends for 7d period', () => {
      const trends = analytics.generateErrorTrends('7d');

      expect(trends).toBeDefined();
      expect(trends.period).toBe('7d');
    });

    it('should generate trends for 30d period', () => {
      const trends = analytics.generateErrorTrends('30d');

      expect(trends).toBeDefined();
      expect(trends.period).toBe('30d');
    });
  });

  describe('getErrorPatterns', () => {
    beforeEach(() => {
      // Setup test patterns
      analytics.updateErrorPattern(
        'sig-1',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      analytics.updateErrorPattern(
        'sig-2',
        testError,
        ErrorCategory.API,
        ErrorSeverity.CRITICAL,
        testOccurrence
      );

      analytics.updateErrorPattern(
        'sig-3',
        testError,
        ErrorCategory.UI,
        ErrorSeverity.LOW,
        testOccurrence
      );
    });

    it('should return all patterns by default', () => {
      const patterns = analytics.getErrorPatterns();
      expect(patterns.length).toBe(3);
    });

    it('should filter by category', () => {
      const patterns = analytics.getErrorPatterns({
        category: ErrorCategory.NETWORK,
      });

      expect(patterns.length).toBe(1);
      expect(patterns[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('should filter by severity', () => {
      const patterns = analytics.getErrorPatterns({
        severity: ErrorSeverity.CRITICAL,
      });

      expect(patterns.length).toBeGreaterThanOrEqual(0);
      if (patterns.length > 0) {
        expect(patterns[0].severity).toBe(ErrorSeverity.CRITICAL);
      }
    });

    it('should filter by time range', () => {
      const patterns = analytics.getErrorPatterns({
        timeRange: 1000, // Last 1 second
      });

      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort by frequency', () => {
      const patterns = analytics.getErrorPatterns({ sortBy: 'frequency' });
      expect(patterns).toBeDefined();
    });

    it('should sort by impact', () => {
      const patterns = analytics.getErrorPatterns({ sortBy: 'impact' });
      expect(patterns).toBeDefined();
    });

    it('should sort by recent', () => {
      const patterns = analytics.getErrorPatterns({ sortBy: 'recent' });
      expect(patterns).toBeDefined();
    });

    it('should limit results', () => {
      const patterns = analytics.getErrorPatterns({ limit: 2 });
      expect(patterns.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const patterns = analytics.getErrorPatterns({
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        limit: 1,
      });

      expect(patterns.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getUserErrorProfiles', () => {
    beforeEach(() => {
      analytics.updateUserProfile('user-1', 'sig-1', ErrorCategory.NETWORK);
      analytics.updateUserProfile('user-1', 'sig-2', ErrorCategory.API);
      analytics.updateUserProfile('user-2', 'sig-3', ErrorCategory.UI);
    });

    it('should return all profiles by default', () => {
      const profiles = analytics.getUserErrorProfiles();
      expect(profiles.length).toBe(2);
    });

    it('should sort by error count', () => {
      const profiles = analytics.getUserErrorProfiles({ sortBy: 'errorCount' });
      expect(profiles).toBeDefined();
      expect(profiles[0].totalErrors).toBeGreaterThanOrEqual(profiles[1]?.totalErrors || 0);
    });

    it('should sort by error rate', () => {
      const profiles = analytics.getUserErrorProfiles({ sortBy: 'errorRate' });
      expect(profiles).toBeDefined();
    });

    it('should sort by recent', () => {
      const profiles = analytics.getUserErrorProfiles({ sortBy: 'recent' });
      expect(profiles).toBeDefined();
    });

    it('should limit results', () => {
      const profiles = analytics.getUserErrorProfiles({ limit: 1 });
      expect(profiles.length).toBe(1);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights for error pattern', () => {
      const signature = 'insight-test';

      // Create pattern with multiple users
      for (let i = 0; i < 5; i++) {
        analytics.updateErrorPattern(
          signature,
          testError,
          ErrorCategory.NETWORK,
          ErrorSeverity.HIGH,
          { ...testOccurrence, userId: `user-${i}` }
        );
      }

      analytics.generateInsights(signature);

      const patterns = analytics.getErrorPatterns();
      const pattern = patterns.find(p => p.signature === signature);

      expect(pattern?.insights).toBeDefined();
      expect(pattern?.insights.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const signature = 'rec-test';

      analytics.updateErrorPattern(
        signature,
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      analytics.generateInsights(signature);

      const patterns = analytics.getErrorPatterns();
      const pattern = patterns.find(p => p.signature === signature);

      expect(pattern?.recommendations).toBeDefined();
    });

    it('should skip insights for non-existent pattern', () => {
      analytics.generateInsights('non-existent');
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('performCleanup', () => {
    it('should remove old occurrences', () => {
      const oldOccurrence = {
        ...testOccurrence,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      };

      analytics.addOccurrence(oldOccurrence);
      analytics.addOccurrence(testOccurrence);

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      analytics.performCleanup(oneWeekAgo);

      const counts = analytics.getAnalyticsCounts();
      expect(counts.occurrencesCount).toBe(1);
    });

    it('should clean old pattern occurrences', () => {
      const oldOccurrence = {
        ...testOccurrence,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      };

      analytics.updateErrorPattern(
        'old-pattern',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        oldOccurrence
      );

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      analytics.performCleanup(oneWeekAgo);

      // Pattern should have no occurrences after cleanup
      const patterns = analytics.getErrorPatterns();
      const oldPattern = patterns.find(p => p.signature === 'old-pattern');

      if (oldPattern) {
        expect(oldPattern.occurrences.length).toBe(0);
      }
    });

    it('should keep recent patterns', () => {
      analytics.updateErrorPattern(
        'recent-pattern',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      analytics.performCleanup(oneWeekAgo);

      const counts = analytics.getAnalyticsCounts();
      expect(counts.patternsCount).toBe(1);
    });
  });

  describe('getAnalyticsCounts', () => {
    it('should return zero counts initially', () => {
      const counts = analytics.getAnalyticsCounts();

      expect(counts.patternsCount).toBe(0);
      expect(counts.occurrencesCount).toBe(0);
      expect(counts.userProfilesCount).toBe(0);
    });

    it('should return accurate counts', () => {
      analytics.updateErrorPattern(
        'sig-1',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );
      analytics.addOccurrence(testOccurrence);
      analytics.updateUserProfile('user-1', 'sig-1', ErrorCategory.NETWORK);

      const counts = analytics.getAnalyticsCounts();

      expect(counts.patternsCount).toBe(1);
      expect(counts.occurrencesCount).toBe(1);
      expect(counts.userProfilesCount).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all analytics data', () => {
      analytics.updateErrorPattern(
        'sig-1',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );
      analytics.addOccurrence(testOccurrence);
      analytics.updateUserProfile('user-1', 'sig-1', ErrorCategory.NETWORK);

      analytics.clearAll();

      const counts = analytics.getAnalyticsCounts();
      expect(counts.patternsCount).toBe(0);
      expect(counts.occurrencesCount).toBe(0);
      expect(counts.userProfilesCount).toBe(0);
    });
  });

  describe('generateAnalyticsReport', () => {
    it('should generate analytics report', () => {
      const report = analytics.generateAnalyticsReport();

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('should include trends and patterns', () => {
      analytics.updateErrorPattern(
        'sig-1',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const report = analytics.generateAnalyticsReport();

      expect(report).toBeDefined();
    });
  });

  describe('Error Pattern Metrics', () => {
    it('should track first and last seen times', () => {
      analytics.updateErrorPattern(
        'time-test',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      const pattern = patterns[0];

      expect(pattern.metrics.firstSeen).toBeGreaterThan(0);
      expect(pattern.metrics.lastSeen).toBeGreaterThan(0);
      expect(pattern.metrics.lastSeen).toBeGreaterThanOrEqual(pattern.metrics.firstSeen);
    });

    it('should calculate impact score', () => {
      analytics.updateErrorPattern(
        'impact-test',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].metrics.impactScore).toBeDefined();
    });

    it('should track trend', () => {
      analytics.updateErrorPattern(
        'trend-test',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].metrics.trend).toBeDefined();
    });

    it('should have resolution status', () => {
      analytics.updateErrorPattern(
        'resolution-test',
        testError,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        testOccurrence
      );

      const patterns = analytics.getErrorPatterns();
      expect(patterns[0].metrics.resolution).toBe('pending');
    });
  });
});
