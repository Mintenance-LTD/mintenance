/**
 * Metrics Collector Module
 *
 * Handles collection and storage of system metrics.
 * Provides historical data analysis and business metrics integration.
 */

import { performanceMonitor } from '../../utils/performanceMonitor';
import { logger } from '../../utils/logger';
import { ScalingMetrics } from './ScalingPolicies';

export interface HistoricalMetric {
  timestamp: number;
  metrics: ScalingMetrics;
  events: string[];
  weatherData?: WeatherData;
  businessMetrics?: BusinessMetrics;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  conditions: string;
}

export interface BusinessMetrics {
  activeUsers: number;
  jobPostings: number;
  bidSubmissions: number;
  messagesSent: number;
  paymentsProcessed: number;
  seasonalFactor: number;
}

export interface PredictiveScalingModel {
  id: string;
  algorithm: 'linear_regression' | 'arima' | 'neural_network' | 'ensemble';
  features: string[];
  trainingData: HistoricalMetric[];
  accuracy: number;
  lastTrained: number;
  predictions: ScalingPrediction[];
}

export interface ScalingPrediction {
  timestamp: number;
  predictedLoad: number;
  confidence: number;
  recommendedCapacity: number;
  reasoning: string[];
}

export class MetricsCollector {
  private metricsHistory: HistoricalMetric[] = [];
  private readonly maxHistorySize = 2880; // 24 hours at 30-second intervals

  async collectMetrics(): Promise<ScalingMetrics> {
    const startTime = performance.now();

    try {
      // Collect real-time metrics from various sources
      const metrics: ScalingMetrics = {
        cpuUtilization: await this.getCpuUtilization(),
        memoryUtilization: await this.getMemoryUtilization(),
        networkThroughput: await this.getNetworkThroughput(),
        requestsPerSecond: await this.getRequestsPerSecond(),
        responseTime: await this.getAverageResponseTime(),
        errorRate: await this.getErrorRate(),
        activeConnections: await this.getActiveConnections(),
        queueLength: await this.getQueueLength(),
        timestamp: Date.now()
      };

      // Store historical data
      this.metricsHistory.push({
        timestamp: metrics.timestamp,
        metrics,
        events: [],
        businessMetrics: await this.getBusinessMetrics()
      });

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > twentyFourHoursAgo);

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('infrastructure_metrics_collection', duration);

      return metrics;
    } catch (error) {
      logger.error('Error collecting infrastructure metrics:', error);
      throw error;
    }
  }

  private async getCpuUtilization(): Promise<number> {
    // In a real implementation, this would collect from system monitoring tools
    return Math.random() * 100; // Mock data
  }

  private async getMemoryUtilization(): Promise<number> {
    return Math.random() * 100; // Mock data
  }

  private async getNetworkThroughput(): Promise<number> {
    return Math.random() * 1000; // MB/s
  }

  private async getRequestsPerSecond(): Promise<number> {
    return Math.random() * 500; // requests/sec
  }

  private async getAverageResponseTime(): Promise<number> {
    return Math.random() * 3000; // milliseconds
  }

  private async getErrorRate(): Promise<number> {
    return Math.random() * 5; // percentage
  }

  private async getActiveConnections(): Promise<number> {
    return Math.floor(Math.random() * 10000);
  }

  private async getQueueLength(): Promise<number> {
    return Math.floor(Math.random() * 100);
  }

  private async getBusinessMetrics(): Promise<BusinessMetrics> {
    return {
      activeUsers: Math.floor(Math.random() * 1000),
      jobPostings: Math.floor(Math.random() * 50),
      bidSubmissions: Math.floor(Math.random() * 200),
      messagesSent: Math.floor(Math.random() * 500),
      paymentsProcessed: Math.floor(Math.random() * 100),
      seasonalFactor: 1.0 + (Math.random() - 0.5) * 0.4
    };
  }

  getMetricsHistory(): HistoricalMetric[] {
    return [...this.metricsHistory];
  }

  getRecentMetrics(count: number): HistoricalMetric[] {
    return this.metricsHistory.slice(-count);
  }

  getMetricsInRange(startTime: number, endTime: number): HistoricalMetric[] {
    return this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  clearHistory(): void {
    this.metricsHistory = [];
    logger.info('Metrics history cleared');
  }

  getAverageMetrics(duration: number): ScalingMetrics | null {
    const now = Date.now();
    const recentMetrics = this.metricsHistory.filter(
      m => m.timestamp > now - duration
    );

    if (recentMetrics.length === 0) return null;

    const avg: ScalingMetrics = {
      cpuUtilization: 0,
      memoryUtilization: 0,
      networkThroughput: 0,
      requestsPerSecond: 0,
      responseTime: 0,
      errorRate: 0,
      activeConnections: 0,
      queueLength: 0,
      timestamp: now
    };

    recentMetrics.forEach(m => {
      avg.cpuUtilization += m.metrics.cpuUtilization;
      avg.memoryUtilization += m.metrics.memoryUtilization;
      avg.networkThroughput += m.metrics.networkThroughput;
      avg.requestsPerSecond += m.metrics.requestsPerSecond;
      avg.responseTime += m.metrics.responseTime;
      avg.errorRate += m.metrics.errorRate;
      avg.activeConnections += m.metrics.activeConnections;
      avg.queueLength += m.metrics.queueLength;
    });

    const count = recentMetrics.length;
    avg.cpuUtilization /= count;
    avg.memoryUtilization /= count;
    avg.networkThroughput /= count;
    avg.requestsPerSecond /= count;
    avg.responseTime /= count;
    avg.errorRate /= count;
    avg.activeConnections /= count;
    avg.queueLength /= count;

    return avg;
  }

  async generatePredictions(model: PredictiveScalingModel, data: HistoricalMetric[]): Promise<ScalingPrediction[]> {
    // Simplified prediction algorithm
    const predictions: ScalingPrediction[] = [];
    const now = Date.now();

    for (let i = 1; i <= 24; i++) { // Predict next 24 hours
      const futureTime = now + (i * 60 * 60 * 1000); // Each hour

      // Simple moving average for demonstration
      const recentMetrics = data.slice(-12); // Last 12 data points
      const avgLoad = recentMetrics.reduce((sum, m) => sum + m.metrics.cpuUtilization, 0) / recentMetrics.length;

      // Add some seasonality and trend
      const hourOfDay = new Date(futureTime).getHours();
      const seasonalFactor = 1 + 0.3 * Math.sin((hourOfDay / 24) * 2 * Math.PI);
      const predictedLoad = avgLoad * seasonalFactor;

      predictions.push({
        timestamp: futureTime,
        predictedLoad,
        confidence: Math.max(0.6, 1 - (i / 24) * 0.4), // Decreasing confidence over time
        recommendedCapacity: this.calculateRecommendedCapacity(predictedLoad),
        reasoning: [`Based on ${recentMetrics.length} recent data points`, `Seasonal factor: ${seasonalFactor.toFixed(2)}`]
      });
    }

    return predictions;
  }

  private calculateRecommendedCapacity(predictedLoad: number): number {
    // Calculate optimal capacity based on predicted load
    const targetUtilization = 70; // Target 70% utilization
    const bufferFactor = 1.2; // 20% buffer

    return Math.ceil((predictedLoad / targetUtilization) * 100 * bufferFactor);
  }

  async getCacheHitRatio(): Promise<number> {
    return Math.random() * 0.3 + 0.5; // Mock: 50-80%
  }

  async getCompressionRatio(): Promise<number> {
    return Math.random() * 0.4 + 0.4; // Mock: 40-80%
  }
}
