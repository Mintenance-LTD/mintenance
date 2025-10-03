/**
 * ML Evaluation Service
 *
 * Handles model evaluation, metrics calculation, and A/B testing analysis
 */

import { logger } from '../../../utils/logger';
import { ABTestConfig, ABTestVariant, ABTestResult } from './types';

export class MLEvaluationService {
  private abTests: Map<string, ABTestConfig> = new Map();
  private abTestResults: ABTestResult[] = [];

  /**
   * Create and configure A/B test
   */
  createABTest(config: ABTestConfig): string {
    // Validate A/B test configuration
    this.validateABTestConfig(config);

    // Store A/B test
    this.abTests.set(config.id, config);

    logger.info('MLEvaluationService', 'A/B test created', {
      testId: config.id,
      variantCount: config.variants.length,
      successMetrics: config.successMetrics
    });

    return config.id;
  }

  /**
   * Get A/B test variant for user
   */
  getABTestVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if test is within date range
    const now = Date.now();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return null;
    }

    // Deterministic assignment based on user ID
    const hash = this.hashString(userId + testId);
    const bucket = hash % 100;

    let cumulativeAllocation = 0;
    for (const variant of test.variants) {
      cumulativeAllocation += variant.allocation;
      if (bucket < cumulativeAllocation) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0] || null;
  }

  /**
   * Record A/B test result
   */
  recordABTestResult(testId: string, variant: string, metric: string, value: number): void {
    const result: ABTestResult = {
      testId,
      variant,
      metric,
      value,
      sampleSize: 1,
      timestamp: Date.now()
    };

    this.abTestResults.push(result);

    // Limit result history
    if (this.abTestResults.length > 50000) {
      this.abTestResults = this.abTestResults.slice(-25000);
    }
  }

  /**
   * Analyze A/B test results
   */
  analyzeABTest(testId: string): {
    results: Record<string, Record<string, any>>;
    significance: Record<string, boolean>;
    recommendations: string[];
  } {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    const testResults = this.abTestResults.filter(r => r.testId === testId);
    const results: Record<string, Record<string, any>> = {};
    const significance: Record<string, boolean> = {};
    const recommendations: string[] = [];

    // Analyze each metric
    for (const metric of test.successMetrics) {
      const metricResults = testResults.filter(r => r.metric === metric);
      const variantStats: Record<string, any> = {};

      // Calculate statistics for each variant
      for (const variant of test.variants) {
        const variantData = metricResults.filter(r => r.variant === variant.id);
        const values = variantData.map(r => r.value);

        if (values.length > 0) {
          variantStats[variant.id] = {
            sampleSize: values.length,
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            std: this.calculateStandardDeviation(values),
            confidence95: this.calculateConfidenceInterval(values, 0.95)
          };
        }
      }

      results[metric] = variantStats;

      // Check statistical significance
      const variantKeys = Object.keys(variantStats);
      if (variantKeys.length >= 2) {
        const controlVariant = variantStats[variantKeys[0]];
        const testVariant = variantStats[variantKeys[1]];

        if (controlVariant.sampleSize >= test.minSampleSize &&
            testVariant.sampleSize >= test.minSampleSize) {

          const pValue = this.calculateTTest(
            controlVariant.mean, controlVariant.std, controlVariant.sampleSize,
            testVariant.mean, testVariant.std, testVariant.sampleSize
          );

          significance[metric] = pValue < (1 - test.significance);

          if (significance[metric]) {
            const improvement = ((testVariant.mean - controlVariant.mean) / controlVariant.mean) * 100;
            recommendations.push(
              `${metric}: ${improvement > 0 ? 'Positive' : 'Negative'} impact of ${Math.abs(improvement).toFixed(2)}% detected`
            );
          }
        }
      }
    }

    // Generate overall recommendations
    const significantMetrics = Object.entries(significance).filter(([_, sig]) => sig).length;
    if (significantMetrics > 0) {
      recommendations.push(`${significantMetrics} metrics show statistically significant differences`);
    } else {
      recommendations.push('No statistically significant differences detected yet');
    }

    return { results, significance, recommendations };
  }

  /**
   * Get A/B test by ID
   */
  getABTest(testId: string): ABTestConfig | undefined {
    return this.abTests.get(testId);
  }

  /**
   * List all A/B tests
   */
  listABTests(filter?: { status?: ABTestConfig['status'] }): ABTestConfig[] {
    const allTests = Array.from(this.abTests.values());

    if (!filter) {
      return allTests;
    }

    return allTests.filter(test => {
      if (filter.status && test.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Update A/B test status
   */
  updateABTestStatus(testId: string, status: ABTestConfig['status']): void {
    const test = this.abTests.get(testId);
    if (test) {
      test.status = status;
      logger.info('MLEvaluationService', 'A/B test status updated', { testId, status });
    }
  }

  /**
   * Validate A/B test configuration
   */
  private validateABTestConfig(config: ABTestConfig): void {
    const totalAllocation = config.variants.reduce((sum, v) => sum + v.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Variant allocations must sum to 100%');
    }

    if (config.minSampleSize < 1) {
      throw new Error('Minimum sample size must be at least 1');
    }
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(values: number[], confidence: number): { lower: number; upper: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = this.calculateStandardDeviation(values);
    const n = values.length;

    // Use t-distribution approximation
    const tValue = confidence === 0.95 ? 1.96 : 2.58;
    const margin = tValue * (std / Math.sqrt(n));

    return {
      lower: mean - margin,
      upper: mean + margin
    };
  }

  /**
   * Calculate t-test
   */
  private calculateTTest(
    mean1: number, std1: number, n1: number,
    mean2: number, std2: number, n2: number
  ): number {
    const pooledStd = Math.sqrt(((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2));
    const standardError = pooledStd * Math.sqrt(1/n1 + 1/n2);
    const tStatistic = Math.abs(mean1 - mean2) / standardError;

    // Simplified p-value approximation
    return Math.max(0.001, Math.min(0.999, 1 - (tStatistic / 10)));
  }

  /**
   * Get A/B test statistics
   */
  getStatistics(): {
    totalTests: number;
    activeTests: number;
    totalResults: number;
  } {
    const activeCount = Array.from(this.abTests.values()).filter(t => t.status === 'running').length;

    return {
      totalTests: this.abTests.size,
      activeTests: activeCount,
      totalResults: this.abTestResults.length
    };
  }

  /**
   * Clear test results
   */
  clearTestResults(testId?: string): void {
    if (testId) {
      this.abTestResults = this.abTestResults.filter(r => r.testId !== testId);
    } else {
      this.abTestResults = [];
    }
  }
}
