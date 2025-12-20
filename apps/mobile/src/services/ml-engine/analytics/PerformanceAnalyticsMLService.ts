/**
 * Performance Analytics ML Service
 *
 * Handles ML model performance monitoring, metrics tracking, and optimization insights.
 * Part of the domain-separated ML engine architecture.
 *
 * @filesize Target: <500 lines
 * @compliance Architecture principles - Domain separation, single responsibility
 */

import { mlCoreService } from '../core/MLCoreService';
import { circuitBreakerManager } from '../../../utils/circuitBreaker';

export interface ModelPerformanceMetrics {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latency: number; // milliseconds
  throughput: number; // predictions per second
  errorRate: number;
  confidenceDistribution: {
    high: number; // percentage of high-confidence predictions
    medium: number;
    low: number;
  };
  lastUpdated: string;
}

export interface PredictionAnalytics {
  predictionId: string;
  modelName: string;
  inputFeatures: number[];
  prediction: number | number[];
  confidence: number;
  processingTime: number;
  timestamp: string;
  feedback?: {
    actualOutcome: number | number[];
    userRating: number; // 1-5 scale
    notes: string;
  };
}

export interface ModelDriftAnalysis {
  modelName: string;
  driftScore: number; // 0-1, higher indicates more drift
  driftType: 'concept' | 'data' | 'prediction' | 'none';
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  detectionDate: string;
  affectedFeatures: string[];
}

export interface PerformanceInsights {
  overallHealthScore: number; // 0-1 scale
  trends: {
    accuracy: 'improving' | 'stable' | 'declining';
    latency: 'improving' | 'stable' | 'declining';
    usage: 'increasing' | 'stable' | 'decreasing';
  };
  topPerformingModels: string[];
  bottleneckModels: string[];
  optimizationOpportunities: Array<{
    type: 'latency' | 'accuracy' | 'resource_usage';
    description: string;
    potentialImpact: 'low' | 'medium' | 'high';
  }>;
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    modelName?: string;
    timestamp: string;
  }>;
}

/**
 * Performance Analytics ML Service
 *
 * Provides comprehensive monitoring and analytics for ML model performance,
 * including drift detection, optimization insights, and real-time metrics.
 */
export class PerformanceAnalyticsMLService {
  private static instance: PerformanceAnalyticsMLService;
  private predictionHistory: Map<string, PredictionAnalytics[]> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private alerts: Array<PerformanceInsights['alerts'][0]> = [];

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceAnalyticsMLService {
    if (!PerformanceAnalyticsMLService.instance) {
      PerformanceAnalyticsMLService.instance = new PerformanceAnalyticsMLService();
    }
    return PerformanceAnalyticsMLService.instance;
  }

  /**
   * Track a prediction for performance analysis
   */
  public async trackPrediction(
    modelName: string,
    inputFeatures: number[],
    prediction: number | number[],
    confidence: number,
    processingTime: number
  ): Promise<string> {
    const predictionId = this._generatePredictionId();

    const analytics: PredictionAnalytics = {
      predictionId,
      modelName,
      inputFeatures,
      prediction,
      confidence,
      processingTime,
      timestamp: new Date().toISOString(),
    };

    // Store prediction analytics
    if (!this.predictionHistory.has(modelName)) {
      this.predictionHistory.set(modelName, []);
    }

    const history = this.predictionHistory.get(modelName)!;
    history.push(analytics);

    // Keep only recent predictions (last 1000)
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Update real-time metrics
    await this._updateModelMetrics(modelName);

    return predictionId;
  }

  /**
   * Add feedback for a prediction
   */
  public async addPredictionFeedback(
    predictionId: string,
    actualOutcome: number | number[],
    userRating: number,
    notes: string = ''
  ): Promise<void> {
    // Find the prediction across all models
    for (const [modelName, history] of this.predictionHistory.entries()) {
      const prediction = history.find(p => p.predictionId === predictionId);
      if (prediction) {
        prediction.feedback = {
          actualOutcome,
          userRating,
          notes,
        };

        // Update model metrics with new feedback
        await this._updateModelMetrics(modelName);
        break;
      }
    }
  }

  /**
   * Get current performance metrics for a model
   */
  public async getModelPerformance(modelName: string): Promise<ModelPerformanceMetrics | null> {
    return this.performanceMetrics.get(modelName) || null;
  }

  /**
   * Get performance metrics for all models
   */
  public async getAllModelPerformance(): Promise<ModelPerformanceMetrics[]> {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Analyze model drift
   */
  public async analyzeModelDrift(modelName: string): Promise<ModelDriftAnalysis> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('drift_analysis');

    return circuitBreaker.execute(async () => {
      const history = this.predictionHistory.get(modelName) || [];

      if (history.length < 100) {
        return {
          modelName,
          driftScore: 0,
          driftType: 'none',
          recommendations: ['Insufficient data for drift analysis'],
          riskLevel: 'low',
          detectionDate: new Date().toISOString(),
          affectedFeatures: [],
        };
      }

      // Analyze recent vs historical performance
      const recentPredictions = history.slice(-100);
      const historicalPredictions = history.slice(0, Math.min(history.length - 100, 500));

      const driftAnalysis = this._calculateDriftScore(recentPredictions, historicalPredictions);

      return {
        modelName,
        driftScore: driftAnalysis.score,
        driftType: driftAnalysis.type,
        recommendations: this._generateDriftRecommendations(driftAnalysis),
        riskLevel: this._assessDriftRisk(driftAnalysis.score),
        detectionDate: new Date().toISOString(),
        affectedFeatures: driftAnalysis.affectedFeatures,
      };
    });
  }

  /**
   * Get comprehensive performance insights
   */
  public async getPerformanceInsights(): Promise<PerformanceInsights> {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker('performance_insights');

    return circuitBreaker.execute(async () => {
      const allMetrics = await this.getAllModelPerformance();

      const overallHealthScore = this._calculateOverallHealth(allMetrics);
      const trends = this._analyzeTrends(allMetrics);
      const topPerformingModels = this._identifyTopPerformers(allMetrics);
      const bottleneckModels = this._identifyBottlenecks(allMetrics);
      const optimizationOpportunities = this._identifyOptimizations(allMetrics);

      return {
        overallHealthScore,
        trends,
        topPerformingModels,
        bottleneckModels,
        optimizationOpportunities,
        alerts: this.alerts.slice(-10), // Recent alerts
      };
    });
  }

  /**
   * Get model usage statistics
   */
  public async getModelUsageStats(
    modelName: string,
    timeRangeHours: number = 24
  ): Promise<{
    totalPredictions: number;
    averageLatency: number;
    errorCount: number;
    confidenceDistribution: { high: number; medium: number; low: number };
    hourlyUsage: Array<{ hour: string; count: number }>;
  }> {
    const history = this.predictionHistory.get(modelName) || [];
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const recentPredictions = history.filter(p =>
      new Date(p.timestamp) >= cutoffTime
    );

    const totalPredictions = recentPredictions.length;
    const averageLatency = totalPredictions > 0
      ? recentPredictions.reduce((sum, p) => sum + p.processingTime, 0) / totalPredictions
      : 0;

    const errorCount = recentPredictions.filter(p =>
      p.feedback && p.feedback.userRating < 3
    ).length;

    const confidenceDistribution = this._calculateConfidenceDistribution(recentPredictions);
    const hourlyUsage = this._calculateHourlyUsage(recentPredictions, timeRangeHours);

    return {
      totalPredictions,
      averageLatency,
      errorCount,
      confidenceDistribution,
      hourlyUsage,
    };
  }

  /**
   * Generate performance report
   */
  public async generatePerformanceReport(
    timeRangeHours: number = 24
  ): Promise<{
    summary: {
      totalPredictions: number;
      averageAccuracy: number;
      averageLatency: number;
      modelCount: number;
    };
    modelDetails: Array<{
      modelName: string;
      predictions: number;
      accuracy: number;
      latency: number;
      status: 'healthy' | 'warning' | 'critical';
    }>;
    recommendations: string[];
  }> {
    const modelNames = Array.from(this.predictionHistory.keys());
    const modelDetails = [];
    let totalPredictions = 0;
    let totalAccuracy = 0;
    let totalLatency = 0;

    for (const modelName of modelNames) {
      const stats = await this.getModelUsageStats(modelName, timeRangeHours);
      const metrics = await this.getModelPerformance(modelName);

      const accuracy = metrics?.accuracy || 0;
      const latency = stats.averageLatency;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (accuracy < 0.7 || latency > 1000) status = 'warning';
      if (accuracy < 0.5 || latency > 2000) status = 'critical';

      modelDetails.push({
        modelName,
        predictions: stats.totalPredictions,
        accuracy,
        latency,
        status,
      });

      totalPredictions += stats.totalPredictions;
      totalAccuracy += accuracy;
      totalLatency += latency;
    }

    const averageAccuracy = modelNames.length > 0 ? totalAccuracy / modelNames.length : 0;
    const averageLatency = modelNames.length > 0 ? totalLatency / modelNames.length : 0;

    const recommendations = this._generatePerformanceRecommendations(modelDetails);

    return {
      summary: {
        totalPredictions,
        averageAccuracy,
        averageLatency,
        modelCount: modelNames.length,
      },
      modelDetails,
      recommendations,
    };
  }

  /**
   * Update model metrics
   */
  private async _updateModelMetrics(modelName: string): Promise<void> {
    const history = this.predictionHistory.get(modelName) || [];

    if (history.length === 0) return;

    const recentPredictions = history.slice(-100); // Last 100 predictions
    const predictionsWithFeedback = recentPredictions.filter(p => p.feedback);

    // Calculate accuracy from feedback
    let accuracy = 0;
    if (predictionsWithFeedback.length > 0) {
      const correctPredictions = predictionsWithFeedback.filter(p =>
        p.feedback!.userRating >= 4
      ).length;
      accuracy = correctPredictions / predictionsWithFeedback.length;
    }

    // Calculate other metrics
    const averageLatency = recentPredictions.reduce((sum, p) => sum + p.processingTime, 0) / recentPredictions.length;
    const confidenceDistribution = this._calculateConfidenceDistribution(recentPredictions);

    const errorRate = predictionsWithFeedback.length > 0
      ? predictionsWithFeedback.filter(p => p.feedback!.userRating < 3).length / predictionsWithFeedback.length
      : 0;

    const metrics: ModelPerformanceMetrics = {
      modelName,
      accuracy,
      precision: accuracy * 0.9, // Mock precision
      recall: accuracy * 0.95, // Mock recall
      f1Score: accuracy * 0.92, // Mock F1 score
      latency: averageLatency,
      throughput: averageLatency > 0 ? 1000 / averageLatency : 0,
      errorRate,
      confidenceDistribution,
      lastUpdated: new Date().toISOString(),
    };

    this.performanceMetrics.set(modelName, metrics);

    // Check for alerts
    this._checkForAlerts(modelName, metrics);
  }

  /**
   * Generate prediction ID
   */
  private _generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate confidence distribution
   */
  private _calculateConfidenceDistribution(predictions: PredictionAnalytics[]): {
    high: number;
    medium: number;
    low: number;
  } {
    if (predictions.length === 0) {
      return { high: 0, medium: 0, low: 0 };
    }

    const highCount = predictions.filter(p => p.confidence >= 0.8).length;
    const mediumCount = predictions.filter(p => p.confidence >= 0.5 && p.confidence < 0.8).length;
    const lowCount = predictions.filter(p => p.confidence < 0.5).length;

    const total = predictions.length;

    return {
      high: (highCount / total) * 100,
      medium: (mediumCount / total) * 100,
      low: (lowCount / total) * 100,
    };
  }

  /**
   * Calculate hourly usage
   */
  private _calculateHourlyUsage(
    predictions: PredictionAnalytics[],
    timeRangeHours: number
  ): Array<{ hour: string; count: number }> {
    const hourlyData: { [key: string]: number } = {};

    // Initialize all hours in range
    for (let i = 0; i < timeRangeHours; i++) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().substr(0, 13); // YYYY-MM-DDTHH
      hourlyData[hourKey] = 0;
    }

    // Count predictions per hour
    predictions.forEach(p => {
      const hourKey = p.timestamp.substr(0, 13);
      if (hourlyData.hasOwnProperty(hourKey)) {
        hourlyData[hourKey]++;
      }
    });

    return Object.entries(hourlyData)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Calculate drift score
   */
  private _calculateDriftScore(
    recentPredictions: PredictionAnalytics[],
    historicalPredictions: PredictionAnalytics[]
  ): {
    score: number;
    type: 'concept' | 'data' | 'prediction' | 'none';
    affectedFeatures: string[];
  } {
    // Simple drift calculation based on confidence distributions
    const recentConfidence = this._calculateConfidenceDistribution(recentPredictions);
    const historicalConfidence = this._calculateConfidenceDistribution(historicalPredictions);

    const confidenceDrift = Math.abs(recentConfidence.high - historicalConfidence.high) / 100;

    let driftType: 'concept' | 'data' | 'prediction' | 'none' = 'none';
    if (confidenceDrift > 0.2) driftType = 'prediction';
    if (confidenceDrift > 0.3) driftType = 'concept';

    return {
      score: confidenceDrift,
      type: driftType,
      affectedFeatures: [], // Would analyze feature-level drift in real implementation
    };
  }

  /**
   * Generate drift recommendations
   */
  private _generateDriftRecommendations(driftAnalysis: any): string[] {
    const recommendations: string[] = [];

    if (driftAnalysis.score > 0.3) {
      recommendations.push('Consider retraining the model with recent data');
      recommendations.push('Review input data quality and preprocessing pipeline');
    } else if (driftAnalysis.score > 0.2) {
      recommendations.push('Monitor model performance closely');
      recommendations.push('Consider gradual model updates');
    } else {
      recommendations.push('Model performance appears stable');
    }

    return recommendations;
  }

  /**
   * Assess drift risk level
   */
  private _assessDriftRisk(driftScore: number): 'low' | 'medium' | 'high' {
    if (driftScore > 0.3) return 'high';
    if (driftScore > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Calculate overall health score
   */
  private _calculateOverallHealth(metrics: ModelPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;

    const averageAccuracy = metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length;
    const averageErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;

    return Math.max(0, Math.min(1, averageAccuracy - averageErrorRate));
  }

  /**
   * Analyze performance trends
   */
  private _analyzeTrends(metrics: ModelPerformanceMetrics[]): PerformanceInsights['trends'] {
    // Mock trend analysis - would use historical data in real implementation
    return {
      accuracy: 'stable',
      latency: 'improving',
      usage: 'increasing',
    };
  }

  /**
   * Identify top performing models
   */
  private _identifyTopPerformers(metrics: ModelPerformanceMetrics[]): string[] {
    return metrics
      .filter(m => m.accuracy > 0.8 && m.errorRate < 0.1)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3)
      .map(m => m.modelName);
  }

  /**
   * Identify bottleneck models
   */
  private _identifyBottlenecks(metrics: ModelPerformanceMetrics[]): string[] {
    return metrics
      .filter(m => m.latency > 1000 || m.errorRate > 0.2)
      .sort((a, b) => b.latency - a.latency)
      .slice(0, 3)
      .map(m => m.modelName);
  }

  /**
   * Identify optimization opportunities
   */
  private _identifyOptimizations(metrics: ModelPerformanceMetrics[]): PerformanceInsights['optimizationOpportunities'] {
    const opportunities: PerformanceInsights['optimizationOpportunities'] = [];

    const highLatencyModels = metrics.filter(m => m.latency > 1000);
    if (highLatencyModels.length > 0) {
      opportunities.push({
        type: 'latency',
        description: `${highLatencyModels.length} models have high latency (>1000ms)`,
        potentialImpact: 'high',
      });
    }

    const lowAccuracyModels = metrics.filter(m => m.accuracy < 0.7);
    if (lowAccuracyModels.length > 0) {
      opportunities.push({
        type: 'accuracy',
        description: `${lowAccuracyModels.length} models have low accuracy (<70%)`,
        potentialImpact: 'medium',
      });
    }

    return opportunities;
  }

  /**
   * Check for performance alerts
   */
  private _checkForAlerts(modelName: string, metrics: ModelPerformanceMetrics): void {
    const alerts: Array<PerformanceInsights['alerts'][0]> = [];

    if (metrics.accuracy < 0.5) {
      alerts.push({
        severity: 'critical',
        message: `Model ${modelName} accuracy critically low (${(metrics.accuracy * 100).toFixed(1)}%)`,
        modelName,
        timestamp: new Date().toISOString(),
      });
    } else if (metrics.accuracy < 0.7) {
      alerts.push({
        severity: 'warning',
        message: `Model ${modelName} accuracy below threshold (${(metrics.accuracy * 100).toFixed(1)}%)`,
        modelName,
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.latency > 2000) {
      alerts.push({
        severity: 'critical',
        message: `Model ${modelName} latency critically high (${metrics.latency.toFixed(0)}ms)`,
        modelName,
        timestamp: new Date().toISOString(),
      });
    }

    // Add new alerts
    this.alerts.push(...alerts);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Generate performance recommendations
   */
  private _generatePerformanceRecommendations(modelDetails: any[]): string[] {
    const recommendations: string[] = [];

    const criticalModels = modelDetails.filter(m => m.status === 'critical');
    if (criticalModels.length > 0) {
      recommendations.push(`${criticalModels.length} models need immediate attention`);
    }

    const highLatencyModels = modelDetails.filter(m => m.latency > 1000);
    if (highLatencyModels.length > 0) {
      recommendations.push('Optimize model inference for better latency');
    }

    const lowAccuracyModels = modelDetails.filter(m => m.accuracy < 0.7);
    if (lowAccuracyModels.length > 0) {
      recommendations.push('Consider retraining models with low accuracy');
    }

    if (recommendations.length === 0) {
      recommendations.push('All models performing within acceptable ranges');
    }

    return recommendations;
  }
}

// Export singleton instance
export const performanceAnalyticsMLService = PerformanceAnalyticsMLService.getInstance();