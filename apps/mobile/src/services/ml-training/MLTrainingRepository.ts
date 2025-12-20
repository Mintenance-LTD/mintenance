/**
 * ML Training Repository
 * Handles storage and retrieval of training data, models, and metrics
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '../../utils/logger';
import {
  TrainingData,
  ModelPerformance,
  BiasMetrics,
  ValidationResults,
  TrainingJob,
  ModelMetrics,
  TrainingReport,
  ModelInfo,
  ABTestResults,
  ModelType,
  DataQualityMetrics,
} from './types';

export class MLTrainingRepository {
  private trainingQueue = new Map<string, TrainingData[]>();
  private models = new Map<string, tf.LayersModel>();
  private modelVersions = new Map<string, Map<string, tf.LayersModel>>();
  private performanceHistory = new Map<string, ModelPerformance[]>();
  private biasHistory = new Map<string, BiasMetrics[]>();
  private validationHistory = new Map<string, ValidationResults[]>();
  private trainingJobs = new Map<string, TrainingJob>();
  private abTestResults = new Map<string, ABTestResults>();

  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize storage systems
   */
  private initializeStorage(): void {
    // Initialize storage for different model types
    const modelTypes: ModelType[] = ['pricing', 'matching', 'recommendation', 'sentiment', 'fraud_detection'];

    modelTypes.forEach(type => {
      this.trainingQueue.set(type, []);
      this.performanceHistory.set(type, []);
      this.biasHistory.set(type, []);
      this.validationHistory.set(type, []);
      this.modelVersions.set(type, new Map());
    });

    logger.info('MLTrainingRepository', 'Storage initialized for model types', {
      modelTypes,
    });
  }

  /**
   * Add training data to queue
   */
  addTrainingData(modelType: string, data: TrainingData): void {
    if (!this.trainingQueue.has(modelType)) {
      this.trainingQueue.set(modelType, []);
    }

    const queue = this.trainingQueue.get(modelType)!;
    queue.push(data);

    // Limit queue size to prevent memory issues
    if (queue.length > 10000) {
      queue.shift(); // Remove oldest data
    }

    logger.debug('MLTrainingRepository', 'Training data added', {
      modelType,
      queueSize: queue.length,
      dataSize: data.features.length,
    });
  }

  /**
   * Get training data for a model type
   */
  getTrainingData(modelType: string, limit?: number): TrainingData[] {
    const queue = this.trainingQueue.get(modelType) || [];
    return limit ? queue.slice(-limit) : queue;
  }

  /**
   * Get training queue size
   */
  getTrainingQueueSize(modelType: string): number {
    return this.trainingQueue.get(modelType)?.length || 0;
  }

  /**
   * Clear training queue
   */
  clearTrainingQueue(modelType: string): void {
    this.trainingQueue.set(modelType, []);
    logger.info('MLTrainingRepository', 'Training queue cleared', { modelType });
  }

  /**
   * Store trained model
   */
  async storeModel(modelType: string, model: tf.LayersModel, version: string): Promise<void> {
    try {
      // Store current model
      this.models.set(modelType, model);

      // Store versioned model
      if (!this.modelVersions.has(modelType)) {
        this.modelVersions.set(modelType, new Map());
      }
      this.modelVersions.get(modelType)!.set(version, model);

      // Save model to file system (in a real implementation)
      // await model.save(`file://./models/${modelType}_${version}`);

      logger.info('MLTrainingRepository', 'Model stored', {
        modelType,
        version,
        parameters: model.countParams(),
      });
    } catch (error) {
      logger.error('MLTrainingRepository', 'Failed to store model', error);
      throw error;
    }
  }

  /**
   * Get current model
   */
  getModel(modelType: string): tf.LayersModel | undefined {
    return this.models.get(modelType);
  }

  /**
   * Get specific model version
   */
  getModelVersion(modelType: string, version: string): tf.LayersModel | undefined {
    return this.modelVersions.get(modelType)?.get(version);
  }

  /**
   * Get all versions for a model type
   */
  getModelVersions(modelType: string): string[] {
    return Array.from(this.modelVersions.get(modelType)?.keys() || []);
  }

  /**
   * Store performance metrics
   */
  storePerformanceMetrics(modelType: string, performance: ModelPerformance): void {
    if (!this.performanceHistory.has(modelType)) {
      this.performanceHistory.set(modelType, []);
    }

    const history = this.performanceHistory.get(modelType)!;
    history.push(performance);

    // Keep only last 100 records
    if (history.length > 100) {
      history.shift();
    }

    logger.debug('MLTrainingRepository', 'Performance metrics stored', {
      modelType,
      accuracy: performance.accuracy,
      timestamp: performance.timestamp,
    });
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(modelType: string, limit?: number): ModelPerformance[] {
    const history = this.performanceHistory.get(modelType) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get latest performance metrics
   */
  getLatestPerformance(modelType: string): ModelPerformance | undefined {
    const history = this.performanceHistory.get(modelType) || [];
    return history[history.length - 1];
  }

  /**
   * Store bias metrics
   */
  storeBiasMetrics(modelType: string, bias: BiasMetrics): void {
    if (!this.biasHistory.has(modelType)) {
      this.biasHistory.set(modelType, []);
    }

    const history = this.biasHistory.get(modelType)!;
    history.push(bias);

    // Keep only last 50 records
    if (history.length > 50) {
      history.shift();
    }

    logger.debug('MLTrainingRepository', 'Bias metrics stored', {
      modelType,
      fairnessScore: bias.fairnessScore,
      biasDetected: bias.biasDetected,
    });
  }

  /**
   * Get bias history
   */
  getBiasHistory(modelType: string, limit?: number): BiasMetrics[] {
    const history = this.biasHistory.get(modelType) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get latest bias metrics
   */
  getLatestBias(modelType: string): BiasMetrics | undefined {
    const history = this.biasHistory.get(modelType) || [];
    return history[history.length - 1];
  }

  /**
   * Store validation results
   */
  storeValidationResults(modelType: string, validation: ValidationResults): void {
    if (!this.validationHistory.has(modelType)) {
      this.validationHistory.set(modelType, []);
    }

    const history = this.validationHistory.get(modelType)!;
    history.push(validation);

    // Keep only last 50 records
    if (history.length > 50) {
      history.shift();
    }

    logger.debug('MLTrainingRepository', 'Validation results stored', {
      modelType,
      passed: validation.passedValidation,
      issues: validation.issues.length,
    });
  }

  /**
   * Get validation history
   */
  getValidationHistory(modelType: string, limit?: number): ValidationResults[] {
    const history = this.validationHistory.get(modelType) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Store training job
   */
  storeTrainingJob(job: TrainingJob): void {
    this.trainingJobs.set(job.id, job);
    logger.info('MLTrainingRepository', 'Training job stored', {
      jobId: job.id,
      modelType: job.modelType,
      status: job.status,
    });
  }

  /**
   * Update training job
   */
  updateTrainingJob(jobId: string, updates: Partial<TrainingJob>): void {
    const job = this.trainingJobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      logger.debug('MLTrainingRepository', 'Training job updated', {
        jobId,
        status: job.status,
        progress: job.progress,
      });
    }
  }

  /**
   * Get training job
   */
  getTrainingJob(jobId: string): TrainingJob | undefined {
    return this.trainingJobs.get(jobId);
  }

  /**
   * Get all training jobs
   */
  getAllTrainingJobs(): TrainingJob[] {
    return Array.from(this.trainingJobs.values());
  }

  /**
   * Get training jobs by status
   */
  getTrainingJobsByStatus(status: TrainingJob['status']): TrainingJob[] {
    return Array.from(this.trainingJobs.values()).filter(job => job.status === status);
  }

  /**
   * Store A/B test results
   */
  storeABTestResults(testName: string, results: ABTestResults): void {
    this.abTestResults.set(testName, results);
    logger.info('MLTrainingRepository', 'A/B test results stored', {
      testName,
      winner: results.winner,
      confidence: results.confidence,
    });
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testName: string): ABTestResults | undefined {
    return this.abTestResults.get(testName);
  }

  /**
   * Get all A/B test results
   */
  getAllABTestResults(): ABTestResults[] {
    return Array.from(this.abTestResults.values());
  }

  /**
   * Generate comprehensive model metrics
   */
  getModelMetrics(modelType: string): ModelMetrics | undefined {
    const performance = this.getLatestPerformance(modelType);
    const bias = this.getLatestBias(modelType);
    const validation = this.getValidationHistory(modelType, 1)[0];

    if (!performance || !bias) {
      return undefined;
    }

    return {
      modelType,
      version: '1.0.0', // Would be dynamic in real implementation
      performance,
      bias,
      validation: validation || {
        performance,
        biasMetrics: bias,
        passedValidation: false,
        issues: ['No validation data available'],
        improvements: [],
        validationTimestamp: Date.now(),
        modelVersion: '1.0.0',
      },
    };
  }

  /**
   * Generate training report
   */
  generateTrainingReport(modelType: string): TrainingReport | undefined {
    const metrics = this.getModelMetrics(modelType);
    if (!metrics) return undefined;

    const modelInfo: ModelInfo = {
      version: metrics.version,
      architecture: 'Deep Neural Network',
      parameters: 50000, // Would be actual from model
      trainingTime: 120,
      dataSize: this.getTrainingQueueSize(modelType),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      modelInfo,
      performance: metrics.performance,
      biasAnalysis: metrics.bias,
      recommendations: this.generateRecommendations(metrics),
      nextSteps: this.generateNextSteps(metrics),
      timestamp: Date.now(),
      trainingHistory: [], // Would include actual training history
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(metrics: ModelMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.performance.accuracy < 0.8) {
      recommendations.push('Consider increasing training data size or adjusting model architecture');
    }

    if (metrics.bias.biasDetected) {
      recommendations.push('Address detected bias using fairness-aware training techniques');
    }

    if (metrics.performance.latency > 100) {
      recommendations.push('Optimize model for better inference latency');
    }

    return recommendations;
  }

  /**
   * Generate next steps based on metrics
   */
  private generateNextSteps(metrics: ModelMetrics): string[] {
    const nextSteps: string[] = [];

    if (!metrics.validation.passedValidation) {
      nextSteps.push('Run comprehensive validation tests');
    }

    if (metrics.performance.accuracy > 0.9 && !metrics.bias.biasDetected) {
      nextSteps.push('Deploy to staging environment for further testing');
    }

    nextSteps.push('Continue monitoring performance and bias metrics');

    return nextSteps;
  }

  /**
   * Clean up old data
   */
  cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): void { // 7 days
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    // Clean performance history
    for (const [modelType, history] of this.performanceHistory.entries()) {
      const filteredHistory = history.filter(p => p.timestamp > cutoffTime);
      this.performanceHistory.set(modelType, filteredHistory);
      cleanedCount += history.length - filteredHistory.length;
    }

    // Clean bias history
    for (const [modelType, history] of this.biasHistory.entries()) {
      const filteredHistory = history.filter(b => b.timestamp > cutoffTime);
      this.biasHistory.set(modelType, filteredHistory);
      cleanedCount += history.length - filteredHistory.length;
    }

    if (cleanedCount > 0) {
      logger.info('MLTrainingRepository', 'Cleaned old data', {
        cleanedCount,
        cutoffTime: new Date(cutoffTime).toISOString(),
      });
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    modelTypes: number;
    totalTrainingData: number;
    totalModels: number;
    totalPerformanceRecords: number;
    totalBiasRecords: number;
    activeJobs: number;
  } {
    const totalTrainingData = Array.from(this.trainingQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);

    const totalModels = Array.from(this.modelVersions.values())
      .reduce((sum, versions) => sum + versions.size, 0);

    const totalPerformanceRecords = Array.from(this.performanceHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const totalBiasRecords = Array.from(this.biasHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const activeJobs = this.getTrainingJobsByStatus('running').length;

    return {
      modelTypes: this.trainingQueue.size,
      totalTrainingData,
      totalModels,
      totalPerformanceRecords,
      totalBiasRecords,
      activeJobs,
    };
  }
}