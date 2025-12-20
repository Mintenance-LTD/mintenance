/**
 * Performance Benchmarking Suite
 * 
 * Benchmarks performance of learned features, Titans, and overall system
 * Measures latency, throughput, memory usage, and resource consumption
 */

import { logger } from '@mintenance/shared';
import { performance } from 'perf_hooks';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from './types';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  metrics: {
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    throughput: number; // Operations per second
    memoryUsageMB?: number;
    errorRate: number;
  };
  timestamp: Date;
}

export interface BenchmarkSuite {
  featureExtraction: {
    learned: BenchmarkResult;
    handcrafted: BenchmarkResult;
  };
  titansProcessing: {
    withTitans: BenchmarkResult;
    withoutTitans: BenchmarkResult;
  };
  endToEnd: {
    fullPipeline: BenchmarkResult;
  };
}

/**
 * Performance Benchmarking Suite
 */
export class PerformanceBenchmark {
  /**
   * Benchmark feature extraction (learned vs handcrafted)
   */
  static async benchmarkFeatureExtraction(
    extractLearned: (
      imageUrls: string[],
      context?: AssessmentContext,
      detections?: RoboflowDetection[],
      vision?: VisionAnalysisSummary | null
    ) => Promise<number[]>,
    extractHandcrafted: (
      imageUrls: string[],
      context?: AssessmentContext,
      detections?: RoboflowDetection[],
      vision?: VisionAnalysisSummary | null
    ) => Promise<number[]>,
    testData: {
      imageUrls: string[];
      context?: AssessmentContext;
      detections?: RoboflowDetection[];
      vision?: VisionAnalysisSummary | null;
    },
    iterations: number = 100
  ): Promise<{ learned: BenchmarkResult; handcrafted: BenchmarkResult }> {
    logger.info('Starting feature extraction benchmark', {
      service: 'PerformanceBenchmark',
      iterations,
    });

    const learned = await this.benchmarkOperation(
      'learned-feature-extraction',
      async () => {
        return await extractLearned(
          testData.imageUrls,
          testData.context,
          testData.detections,
          testData.vision
        );
      },
      iterations
    );

    const handcrafted = await this.benchmarkOperation(
      'handcrafted-feature-extraction',
      async () => {
        return await extractHandcrafted(
          testData.imageUrls,
          testData.context,
          testData.detections,
          testData.vision
        );
      },
      iterations
    );

    return { learned, handcrafted };
  }

  /**
   * Benchmark Titans processing
   */
  static async benchmarkTitans(
    processWithTitans: (input: number[]) => Promise<number[]>,
    processWithoutTitans: (input: number[]) => Promise<number[]>,
    testInput: number[],
    iterations: number = 100
  ): Promise<{ withTitans: BenchmarkResult; withoutTitans: BenchmarkResult }> {
    logger.info('Starting Titans benchmark', {
      service: 'PerformanceBenchmark',
      iterations,
    });

    const withTitans = await this.benchmarkOperation(
      'titans-processing',
      async () => {
        return await processWithTitans(testInput);
      },
      iterations
    );

    const withoutTitans = await this.benchmarkOperation(
      'no-titans-processing',
      async () => {
        return await processWithoutTitans(testInput);
      },
      iterations
    );

    return { withTitans, withoutTitans };
  }

  /**
   * Benchmark end-to-end assessment pipeline
   */
  static async benchmarkEndToEnd(
    assessDamage: (
      imageUrls: string[],
      context?: AssessmentContext
    ) => Promise<any>,
    testData: {
      imageUrls: string[];
      context?: AssessmentContext;
    },
    iterations: number = 10 // Fewer iterations for E2E (slower)
  ): Promise<BenchmarkResult> {
    logger.info('Starting end-to-end benchmark', {
      service: 'PerformanceBenchmark',
      iterations,
    });

    return await this.benchmarkOperation(
      'end-to-end-assessment',
      async () => {
        return await assessDamage(testData.imageUrls, testData.context);
      },
      iterations
    );
  }

  /**
   * Benchmark a single operation
   */
  private static async benchmarkOperation(
    name: string,
    operation: () => Promise<any>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    let errors = 0;
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      try {
        await operation();
        const latency = performance.now() - opStart;
        latencies.push(latency);
      } catch (error) {
        errors++;
        logger.warn('Benchmark operation failed', {
          service: 'PerformanceBenchmark',
          name,
          iteration: i,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalTime = endTime - startTime;

    // Calculate statistics
    latencies.sort((a, b) => a - b);

    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);
    const min = latencies[0] || 0;
    const max = latencies[latencies.length - 1] || 0;
    const throughput = (iterations / totalTime) * 1000; // ops/sec
    const errorRate = errors / iterations;

    return {
      name,
      iterations,
      metrics: {
        averageLatencyMs: averageLatency,
        p50LatencyMs: p50,
        p95LatencyMs: p95,
        p99LatencyMs: p99,
        minLatencyMs: min,
        maxLatencyMs: max,
        throughput,
        memoryUsageMB: endMemory - startMemory,
        errorRate,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Calculate percentile
   */
  private static percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * Compare benchmark results
   */
  static compareResults(
    baseline: BenchmarkResult,
    improved: BenchmarkResult
  ): {
    latencyImprovement: number; // Percentage
    throughputImprovement: number; // Percentage
    memoryChange: number; // MB difference
    errorRateChange: number; // Absolute difference
  } {
    return {
      latencyImprovement: 
        ((baseline.metrics.averageLatencyMs - improved.metrics.averageLatencyMs) /
         baseline.metrics.averageLatencyMs) * 100,
      throughputImprovement:
        ((improved.metrics.throughput - baseline.metrics.throughput) /
         baseline.metrics.throughput) * 100,
      memoryChange:
        (improved.metrics.memoryUsageMB || 0) - (baseline.metrics.memoryUsageMB || 0),
      errorRateChange:
        improved.metrics.errorRate - baseline.metrics.errorRate,
    };
  }

  /**
   * Generate benchmark report
   */
  static generateReport(
    suite: BenchmarkSuite
  ): string {
    const report: string[] = [];

    report.push('# Performance Benchmark Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);

    // Feature extraction comparison
    report.push('## Feature Extraction');
    const feComparison = this.compareResults(
      suite.featureExtraction.handcrafted,
      suite.featureExtraction.learned
    );
    report.push(`- Learned: ${suite.featureExtraction.learned.metrics.averageLatencyMs.toFixed(2)}ms avg`);
    report.push(`- Handcrafted: ${suite.featureExtraction.handcrafted.metrics.averageLatencyMs.toFixed(2)}ms avg`);
    report.push(`- Latency Change: ${feComparison.latencyImprovement.toFixed(2)}%`);
    report.push(`- Throughput Change: ${feComparison.throughputImprovement.toFixed(2)}%`);
    report.push('');

    // Titans comparison
    report.push('## Titans Processing');
    const titansComparison = this.compareResults(
      suite.titansProcessing.withoutTitans,
      suite.titansProcessing.withTitans
    );
    report.push(`- With Titans: ${suite.titansProcessing.withTitans.metrics.averageLatencyMs.toFixed(2)}ms avg`);
    report.push(`- Without Titans: ${suite.titansProcessing.withoutTitans.metrics.averageLatencyMs.toFixed(2)}ms avg`);
    report.push(`- Latency Change: ${titansComparison.latencyImprovement.toFixed(2)}%`);
    report.push(`- Memory Change: ${titansComparison.memoryChange.toFixed(2)}MB`);
    report.push('');

    // End-to-end
    report.push('## End-to-End Pipeline');
    report.push(`- Average Latency: ${suite.endToEnd.fullPipeline.metrics.averageLatencyMs.toFixed(2)}ms`);
    report.push(`- P95 Latency: ${suite.endToEnd.fullPipeline.metrics.p95LatencyMs.toFixed(2)}ms`);
    report.push(`- Throughput: ${suite.endToEnd.fullPipeline.metrics.throughput.toFixed(2)} ops/sec`);
    report.push(`- Error Rate: ${(suite.endToEnd.fullPipeline.metrics.errorRate * 100).toFixed(2)}%`);

    return report.join('\n');
  }

  /**
   * Run full benchmark suite
   */
  static async runFullSuite(
    testData: {
      imageUrls: string[];
      context?: AssessmentContext;
      detections?: RoboflowDetection[];
      vision?: VisionAnalysisSummary | null;
    },
    operations: {
      extractLearned: (
        imageUrls: string[],
        context?: AssessmentContext,
        detections?: RoboflowDetection[],
        vision?: VisionAnalysisSummary | null
      ) => Promise<number[]>;
      extractHandcrafted: (
        imageUrls: string[],
        context?: AssessmentContext,
        detections?: RoboflowDetection[],
        vision?: VisionAnalysisSummary | null
      ) => Promise<number[]>;
      processWithTitans: (input: number[]) => Promise<number[]>;
      processWithoutTitans: (input: number[]) => Promise<number[]>;
      assessDamage: (
        imageUrls: string[],
        context?: AssessmentContext
      ) => Promise<any>;
    }
  ): Promise<BenchmarkSuite> {
    logger.info('Running full benchmark suite', {
      service: 'PerformanceBenchmark',
    });

    const [featureExtraction, titansProcessing, endToEnd] = await Promise.all([
      this.benchmarkFeatureExtraction(
        operations.extractLearned,
        operations.extractHandcrafted,
        testData,
        100
      ),
      this.benchmarkTitans(
        operations.processWithTitans,
        operations.processWithoutTitans,
        new Array(40).fill(0.5), // Sample feature vector
        100
      ),
      this.benchmarkEndToEnd(
        operations.assessDamage,
        testData,
        10
      ),
    ]);

    return {
      featureExtraction,
      titansProcessing,
      endToEnd: {
        fullPipeline: endToEnd,
      },
    };
  }
}

