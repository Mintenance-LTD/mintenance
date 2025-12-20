/**
 * ML Training Pipeline Service
 * Main orchestrator for the complete machine learning training system
 */

import { logger } from '../../utils/logger';
import { OnlineLearningService } from './OnlineLearningService';
import {
  TrainingData,
  TrainingConfiguration,
  ModelConfiguration,
  TrainingJob,
  ModelPerformance,
  BiasMetrics,
  ValidationResults,
  ModelMetrics,
  TrainingReport,
  ABTestConfig,
  ABTestResults,
  ModelType,
  TrainingEvent,
  TrainingEventType,
  FairnessCriteria,
} from './types';
import { MLTrainingRepository } from './MLTrainingRepository';
import { ModelTrainingEngine } from './ModelTrainingEngine';
import { BiasDetectionService } from './BiasDetectionService';
import { ModelValidationService } from './ModelValidationService';

export class MLTrainingPipelineService {
  private repository: MLTrainingRepository;
  private trainingEngine: ModelTrainingEngine;
  private biasDetectionService: BiasDetectionService;
  private validationService: ModelValidationService;
  private onlineLearningServices: Map<string, OnlineLearningService> = new Map();
  private eventListeners = new Map<TrainingEventType, ((event: TrainingEvent) => void)[]>();
  private activeJobs = new Map<string, Promise<TrainingJob>>();

  constructor() {
    this.repository = new MLTrainingRepository();
    this.trainingEngine = new ModelTrainingEngine();
    this.biasDetectionService = new BiasDetectionService();
    this.validationService = new ModelValidationService();

    this.initializeEventSystem();
  }

  /**
   * Initialize event system for training pipeline
   */
  private initializeEventSystem(): void {
    const eventTypes: TrainingEventType[] = [
      'training_started',
      'training_completed',
      'training_failed',
      'bias_detected',
      'performance_degraded',
      'model_deployed',
      'ab_test_started',
      'ab_test_completed',
    ];

    eventTypes.forEach(eventType => {
      this.eventListeners.set(eventType, []);
    });

    logger.info('MLTrainingPipelineService', 'Event system initialized');
  }

  /**
   * Add training data to the pipeline
   */
  async addTrainingData(modelType: ModelType, data: TrainingData): Promise<void> {
    try {
      this.repository.addTrainingData(modelType, data);

      // Check if we have enough data to trigger training
      const queueSize = this.repository.getTrainingQueueSize(modelType);
      const config = this.getDefaultTrainingConfiguration(modelType);

      if (queueSize >= config.retrainingThreshold) {
        logger.info('MLTrainingPipelineService', 'Training threshold reached, triggering automatic training', {
          modelType,
          queueSize,
          threshold: config.retrainingThreshold,
        });

        // Trigger automatic training (non-blocking)
        this.triggerAutomaticTraining(modelType).catch(error =>
          logger.error('MLTrainingPipelineService', 'Automatic training failed', error)
        );
      }
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Failed to add training data', error);
      throw error;
    }
  }

  /**
   * Start training job for specific model type
   * Enhanced to support both batch and online learning modes
   */
  async startTraining(
    modelType: ModelType,
    trainingConfig?: TrainingConfiguration,
    modelConfig?: ModelConfiguration,
    fairnessCriteria?: FairnessCriteria
  ): Promise<string> {
    const jobId = this.generateJobId(modelType);

    try {
      // Check if online learning is enabled
      const enableOnlineLearning = trainingConfig?.enableOnlineLearning ?? false;

      // Get training data
      const trainingData = this.repository.getTrainingData(modelType);
      if (trainingData.length === 0 && !enableOnlineLearning) {
        throw new Error(`No training data available for model type: ${modelType}`);
      }

      // Use provided configs or defaults
      const finalTrainingConfig = trainingConfig || this.getDefaultTrainingConfiguration(modelType);
      const finalModelConfig = modelConfig || this.trainingEngine.getDefaultModelConfiguration(
        modelType,
        trainingData[0]?.features[0]?.length || 10
      );

      // Initialize online learning service if enabled
      if (enableOnlineLearning) {
        const onlineService = new OnlineLearningService({
          agentName: modelType,
          batchSize: finalTrainingConfig.batchSize,
          enableIncremental: true,
        });
        this.onlineLearningServices.set(modelType, onlineService);
      }

      // Create training job
      const job: TrainingJob = {
        id: jobId,
        modelType,
        status: 'queued',
        config: finalTrainingConfig,
        dataSize: trainingData.length,
        progress: 0,
      };

      this.repository.storeTrainingJob(job);
      this.emitEvent('training_started', modelType, { 
        jobId, 
        dataSize: trainingData.length,
        onlineLearning: enableOnlineLearning,
      });

      // Start training asynchronously
      const trainingPromise = this.executeTraining(
        jobId,
        modelType,
        trainingData,
        finalTrainingConfig,
        finalModelConfig,
        fairnessCriteria,
        enableOnlineLearning
      );

      this.activeJobs.set(jobId, trainingPromise);

      logger.info('MLTrainingPipelineService', 'Training job started', {
        jobId,
        modelType,
        dataSize: trainingData.length,
        onlineLearning: enableOnlineLearning,
      });

      return jobId;
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Failed to start training', { jobId, error });
      this.emitEvent('training_failed', modelType, { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Add data point for online learning
   */
  async addOnlineDataPoint(
    modelType: ModelType,
    keys: number[],
    values: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const onlineService = this.onlineLearningServices.get(modelType);
    if (!onlineService) {
      logger.warn('MLTrainingPipelineService', 'Online learning not enabled for model type', {
        modelType,
      });
      return;
    }

    await onlineService.addDataPoint(keys, values, metadata);
  }

  /**
   * Flush online learning queue for a model type
   */
  async flushOnlineLearning(modelType: ModelType): Promise<void> {
    const onlineService = this.onlineLearningServices.get(modelType);
    if (onlineService) {
      await onlineService.flushQueue();
    }
  }

  /**
   * Execute training process
   * Enhanced to support online learning mode
   */
  private async executeTraining(
    jobId: string,
    modelType: ModelType,
    trainingData: TrainingData[],
    trainingConfig: TrainingConfiguration,
    modelConfig: ModelConfiguration,
    fairnessCriteria?: FairnessCriteria,
    enableOnlineLearning?: boolean
  ): Promise<TrainingJob> {
    try {
      // Update job status
      this.repository.updateTrainingJob(jobId, {
        status: 'running',
        startTime: Date.now(),
        progress: 0,
      });

      // Combine all training data
      const combinedData = this.combineTrainingData(trainingData);

      // Split data for training and validation
      const { trainData, validationData } = this.splitTrainingData(combinedData, trainingConfig.validationSplit);

      // Create model
      const model = this.trainingEngine.createModel(modelConfig);

      // Train model with progress tracking
      const { model: trainedModel, history } = await this.trainingEngine.trainModel(
        jobId,
        model,
        trainData,
        trainingConfig,
        (epoch, logs) => {
          const progress = ((epoch + 1) / trainingConfig.epochs) * 100;
          this.repository.updateTrainingJob(jobId, {
            progress,
            currentEpoch: epoch,
            currentLoss: logs.loss as number,
          });
        }
      );

      // Store trained model
      const modelVersion = this.generateModelVersion(modelType);
      await this.repository.storeModel(modelType, trainedModel, modelVersion);

      // Evaluate performance
      const performance = await this.trainingEngine.evaluateModel(trainedModel, validationData);
      this.repository.storePerformanceMetrics(modelType, performance);

      // Check for bias
      const biasMetrics = await this.biasDetectionService.detectBias(
        validationData,
        trainedModel,
        fairnessCriteria
      );
      this.repository.storeBiasMetrics(modelType, biasMetrics);

      // Comprehensive validation
      const validationResults = await this.validationService.validateModel(
        trainedModel,
        validationData,
        modelType,
        modelVersion,
        fairnessCriteria
      );
      this.repository.storeValidationResults(modelType, validationResults);

      // Update job completion
      const completedJob: TrainingJob = {
        id: jobId,
        modelType,
        status: 'completed',
        config: trainingConfig,
        dataSize: trainingData.length,
        startTime: this.repository.getTrainingJob(jobId)?.startTime,
        endTime: Date.now(),
        progress: 100,
      };

      this.repository.updateTrainingJob(jobId, completedJob);

      // Emit events
      this.emitEvent('training_completed', modelType, {
        jobId,
        performance: performance.accuracy,
        biasDetected: biasMetrics.biasDetected,
      });

      if (biasMetrics.biasDetected) {
        this.emitEvent('bias_detected', modelType, {
          jobId,
          fairnessScore: biasMetrics.fairnessScore,
          affectedGroups: biasMetrics.affectedGroups,
        });
      }

      // Clear training data queue
      this.repository.clearTrainingQueue(modelType);

      logger.info('MLTrainingPipelineService', 'Training completed successfully', {
        jobId,
        modelType,
        accuracy: performance.accuracy,
        biasDetected: biasMetrics.biasDetected,
      });

      return completedJob;
    } catch (error) {
      // Update job with error
      this.repository.updateTrainingJob(jobId, {
        status: 'failed',
        endTime: Date.now(),
        error: error.message,
      });

      this.emitEvent('training_failed', modelType, { jobId, error: error.message });
      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Trigger automatic training when threshold is reached
   */
  private async triggerAutomaticTraining(modelType: ModelType): Promise<void> {
    try {
      await this.startTraining(modelType);
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Automatic training failed', {
        modelType,
        error,
      });
    }
  }

  /**
   * Start A/B test between two models
   */
  async startABTest(config: ABTestConfig): Promise<void> {
    try {
      this.emitEvent('ab_test_started', 'pricing', { // Default to pricing for event type
        testName: config.name,
        modelA: config.modelA,
        modelB: config.modelB,
        trafficSplit: config.trafficSplit,
      });

      logger.info('MLTrainingPipelineService', 'A/B test started', {
        testName: config.name,
        modelA: config.modelA,
        modelB: config.modelB,
      });

      // In a real implementation, this would integrate with the deployment system
      // For now, we'll simulate the test completion after a delay
      setTimeout(() => {
        this.completeABTest(config);
      }, config.duration * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Failed to start A/B test', error);
      throw error;
    }
  }

  /**
   * Complete A/B test and determine winner
   */
  private async completeABTest(config: ABTestConfig): Promise<void> {
    try {
      // Simulate A/B test results
      const results: ABTestResults = {
        testName: config.name,
        modelA: {
          performance: {
            accuracy: 0.85 + Math.random() * 0.1,
            precision: 0.8 + Math.random() * 0.15,
            recall: 0.8 + Math.random() * 0.15,
            f1Score: 0.8 + Math.random() * 0.15,
            mse: Math.random() * 0.1,
            mae: Math.random() * 0.1,
            latency: 50 + Math.random() * 50,
            throughput: 100 + Math.random() * 100,
            timestamp: Date.now(),
            validationSize: 1000,
          },
          sampleSize: 5000 + Math.floor(Math.random() * 5000),
        },
        modelB: {
          performance: {
            accuracy: 0.85 + Math.random() * 0.1,
            precision: 0.8 + Math.random() * 0.15,
            recall: 0.8 + Math.random() * 0.15,
            f1Score: 0.8 + Math.random() * 0.15,
            mse: Math.random() * 0.1,
            mae: Math.random() * 0.1,
            latency: 50 + Math.random() * 50,
            throughput: 100 + Math.random() * 100,
            timestamp: Date.now(),
            validationSize: 1000,
          },
          sampleSize: 5000 + Math.floor(Math.random() * 5000),
        },
        statisticalSignificance: true,
        winner: Math.random() > 0.5 ? 'A' : 'B',
        confidence: 0.95 + Math.random() * 0.04,
        recommendation: 'Deploy winning model to production',
      };

      this.repository.storeABTestResults(config.name, results);
      this.emitEvent('ab_test_completed', 'pricing', {
        testName: config.name,
        winner: results.winner,
        confidence: results.confidence,
      });

      logger.info('MLTrainingPipelineService', 'A/B test completed', {
        testName: config.name,
        winner: results.winner,
        confidence: results.confidence,
      });
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Failed to complete A/B test', error);
    }
  }

  /**
   * Get comprehensive model metrics
   */
  getModelMetrics(modelType: ModelType): ModelMetrics | undefined {
    return this.repository.getModelMetrics(modelType);
  }

  /**
   * Generate training report
   */
  generateTrainingReport(modelType: ModelType): TrainingReport | undefined {
    return this.repository.generateTrainingReport(modelType);
  }

  /**
   * Get training job status
   */
  getTrainingJobStatus(jobId: string): TrainingJob | undefined {
    return this.repository.getTrainingJob(jobId);
  }

  /**
   * Get all active training jobs
   */
  getActiveTrainingJobs(): TrainingJob[] {
    return this.repository.getTrainingJobsByStatus('running');
  }

  /**
   * Stop training job
   */
  async stopTraining(jobId: string): Promise<void> {
    try {
      this.trainingEngine.stopTraining(jobId);
      this.repository.updateTrainingJob(jobId, {
        status: 'failed',
        endTime: Date.now(),
        error: 'Training stopped by user',
      });

      this.activeJobs.delete(jobId);

      logger.info('MLTrainingPipelineService', 'Training job stopped', { jobId });
    } catch (error) {
      logger.error('MLTrainingPipelineService', 'Failed to stop training', { jobId, error });
      throw error;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: TrainingEventType, listener: (event: TrainingEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: TrainingEventType, listener: (event: TrainingEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit training event
   */
  private emitEvent(type: TrainingEventType, modelType: ModelType, data: Record<string, any>): void {
    const event: TrainingEvent = {
      type,
      modelType,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('MLTrainingPipelineService', 'Event listener error', { type, error });
      }
    });
  }

  /**
   * Utility methods
   */
  private generateJobId(modelType: ModelType): string {
    return `${modelType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateModelVersion(modelType: ModelType): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${modelType}_v${timestamp}`;
  }

  private combineTrainingData(dataArray: TrainingData[]): TrainingData {
    const allFeatures: number[][] = [];
    const allLabels: number[][] = [];
    const allMetadata: any[] = [];

    dataArray.forEach(data => {
      allFeatures.push(...data.features);
      allLabels.push(...data.labels);
      allMetadata.push(...data.metadata);
    });

    return {
      features: allFeatures,
      labels: allLabels,
      metadata: allMetadata,
    };
  }

  private splitTrainingData(
    data: TrainingData,
    validationSplit: number
  ): { trainData: TrainingData; validationData: TrainingData } {
    const totalSamples = data.features.length;
    const validationSize = Math.floor(totalSamples * validationSplit);
    const trainSize = totalSamples - validationSize;

    return {
      trainData: {
        features: data.features.slice(0, trainSize),
        labels: data.labels.slice(0, trainSize),
        metadata: data.metadata.slice(0, trainSize),
      },
      validationData: {
        features: data.features.slice(trainSize),
        labels: data.labels.slice(trainSize),
        metadata: data.metadata.slice(trainSize),
      },
    };
  }

  private getDefaultTrainingConfiguration(modelType: ModelType): TrainingConfiguration {
    const configs: Record<ModelType, TrainingConfiguration> = {
      pricing: {
        batchSize: 32,
        epochs: 100,
        validationSplit: 0.2,
        learningRate: 0.001,
        retrainingThreshold: 1000,
        biasCheckInterval: 50,
        performanceThreshold: 0.8,
        earlyStoppingPatience: 10,
        saveCheckpoints: true,
      },
      matching: {
        batchSize: 64,
        epochs: 50,
        validationSplit: 0.2,
        learningRate: 0.001,
        retrainingThreshold: 500,
        biasCheckInterval: 25,
        performanceThreshold: 0.85,
        earlyStoppingPatience: 5,
        saveCheckpoints: true,
      },
      recommendation: {
        batchSize: 128,
        epochs: 75,
        validationSplit: 0.15,
        learningRate: 0.0005,
        retrainingThreshold: 2000,
        biasCheckInterval: 30,
        performanceThreshold: 0.75,
        earlyStoppingPatience: 8,
        saveCheckpoints: true,
      },
      sentiment: {
        batchSize: 32,
        epochs: 100,
        validationSplit: 0.2,
        learningRate: 0.001,
        retrainingThreshold: 1500,
        biasCheckInterval: 40,
        performanceThreshold: 0.8,
        earlyStoppingPatience: 10,
        saveCheckpoints: true,
      },
      fraud_detection: {
        batchSize: 256,
        epochs: 200,
        validationSplit: 0.25,
        learningRate: 0.0001,
        retrainingThreshold: 5000,
        biasCheckInterval: 50,
        performanceThreshold: 0.95,
        earlyStoppingPatience: 15,
        saveCheckpoints: true,
      },
    };

    return configs[modelType];
  }

  /**
   * Get system statistics
   */
  getSystemStats(): any {
    return {
      repository: this.repository.getStorageStats(),
      memory: this.trainingEngine.getMemoryInfo(),
      activeJobs: this.activeJobs.size,
      eventListeners: Array.from(this.eventListeners.entries()).map(([type, listeners]) => ({
        type,
        count: listeners.length,
      })),
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Stop all active jobs
    this.activeJobs.clear();

    // Clear event listeners
    this.eventListeners.clear();

    // Dispose training engine
    this.trainingEngine.dispose();

    logger.info('MLTrainingPipelineService', 'Service disposed');
  }
}

// Export singleton instance
export const mlTrainingPipelineService = new MLTrainingPipelineService();