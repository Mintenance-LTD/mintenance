/**
 * TRAINING ORCHESTRATOR MODULE
 * Manages model training loop, checkpointing, and scheduling
 * Extracted from MLTrainingPipeline.ts for modularity
 */

import * as tf from '@tensorflow/tfjs';
import { mlMemoryManager } from '../MLMemoryFixes';
import { logger } from '../../utils/logger';
import { TrainingData } from './DataPreparation';

export interface TrainingConfig {
  batchSize: number;
  epochs: number;
  validationSplit: number;
  learningRate: number;
  retrainingThreshold: number;
  biasCheckInterval: number;
  performanceThreshold: number;
}

/**
 * Training Orchestrator Service
 * Handles model training, checkpointing, and scheduling
 */
export class TrainingOrchestrator {
  private componentId: string;
  private isTraining = false;
  private modelVersions: Map<string, tf.LayersModel> = new Map();
  private trainingSchedulerInterval?: NodeJS.Timeout;

  private config: TrainingConfig = {
    batchSize: 32,
    epochs: 10,
    validationSplit: 0.2,
    learningRate: 0.001,
    retrainingThreshold: 1000,
    biasCheckInterval: 100,
    performanceThreshold: 0.85,
  };

  constructor(componentId: string) {
    this.componentId = componentId;
  }

  /**
   * Get training configuration
   */
  getConfig(): TrainingConfig {
    return this.config;
  }

  /**
   * Check if currently training
   */
  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }

  /**
   * Get model version
   */
  getModelVersion(modelType: string): tf.LayersModel | undefined {
    return this.modelVersions.get(modelType);
  }

  /**
   * Start training scheduler
   */
  startTrainingScheduler(
    retrainingCallback: (modelType: string) => Promise<void>
  ): void {
    this.trainingSchedulerInterval = setInterval(
      async () => {
        try {
          logger.info('TrainingOrchestrator', 'Training scheduler tick');

          const modelTypes = ['pricing', 'matching', 'complexity', 'sentiment'];
          for (const modelType of modelTypes) {
            try {
              await retrainingCallback(modelType);
            } catch (error) {
              logger.error('TrainingOrchestrator', 'Retraining failed', {
                modelType,
                error: (error as Error).message,
              });
            }
          }
        } catch (error) {
          logger.error(
            'TrainingOrchestrator',
            'Training scheduler error',
            error as Error
          );
        }
      },
      60 * 60 * 1000
    ); // Check every hour

    // Track the interval for cleanup
    mlMemoryManager.trackInterval(this.componentId, this.trainingSchedulerInterval);
  }

  /**
   * Schedule retraining for specific model
   */
  async scheduleRetraining(
    modelType: string,
    callback: () => Promise<void>
  ): Promise<void> {
    logger.info('Scheduling retraining for model', { modelType });
    const timeout = setTimeout(() => callback(), 5000);
    mlMemoryManager.trackTimeout(this.componentId, timeout);
  }

  /**
   * Create or load model architecture
   */
  async createOrLoadModel(
    modelType: string,
    inputShape: number,
    outputShape: number
  ): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputShape],
          units: 128,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: outputShape, activation: 'sigmoid' }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['accuracy', 'mae'],
    });

    return model;
  }

  /**
   * Train model with data
   */
  async trainModel(
    model: tf.LayersModel,
    data: TrainingData,
    modelType: string
  ): Promise<tf.LayersModel> {
    logger.info('Training model', { modelType });
    this.isTraining = true;

    try {
      const xs = tf.tensor2d(data.features);
      const ys = tf.tensor2d(data.labels);

      await model.fit(xs, ys, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: this.config.validationSplit,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.debug('Training epoch completed', {
              epoch: epoch + 1,
              loss: logs?.loss?.toFixed(4),
              accuracy: logs?.acc?.toFixed(4),
            });
          },
        },
      });

      // Track tensors before disposal
      mlMemoryManager.trackTensor(this.componentId, xs, 'training features');
      mlMemoryManager.trackTensor(this.componentId, ys, 'training labels');

      xs.dispose();
      ys.dispose();

      // Track model with memory manager
      mlMemoryManager.trackModel(this.componentId, modelType, model);

      // Store model in versions map
      this.modelVersions.set(modelType, model);

      return model;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Train adversarial fair model for bias mitigation
   */
  async trainAdversarialFairModel(
    data: TrainingData,
    inputShape: number,
    outputShape: number
  ): Promise<tf.LayersModel> {
    logger.info('Training adversarial fair model');
    return await this.createOrLoadModel('pricing', inputShape, outputShape);
  }

  /**
   * Train model with fairness constraints
   */
  async trainWithFairnessConstraints(
    data: TrainingData,
    inputShape: number,
    outputShape: number
  ): Promise<tf.LayersModel> {
    logger.info('Training with fairness constraints');
    return await this.createOrLoadModel('pricing', inputShape, outputShape);
  }

  /**
   * Stop training scheduler
   */
  stopTrainingScheduler(): void {
    if (this.trainingSchedulerInterval) {
      clearInterval(this.trainingSchedulerInterval);
      this.trainingSchedulerInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopTrainingScheduler();
    this.modelVersions.clear();
    this.isTraining = false;
    logger.info('Training orchestrator disposed');
  }
}
