/**
 * Model Training Engine
 * Handles actual TensorFlow.js model training, configuration, and optimization
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '../../utils/logger';
import {
  TrainingData,
  ModelConfiguration,
  TrainingConfiguration,
  ModelPerformance,
  TrainingJob,
  ModelType,
  LayerConfig,
  OptimizerConfig,
} from './types';

export class ModelTrainingEngine {
  private trainingJobs = new Map<string, tf.LayersModel>();
  private trainingCallbacks = new Map<string, tf.Callback[]>();

  constructor() {
    this.initializeTensorFlow();
  }

  /**
   * Initialize TensorFlow.js backend
   */
  private async initializeTensorFlow(): Promise<void> {
    try {
      await tf.ready();
      logger.info('ModelTrainingEngine', 'TensorFlow.js initialized', {
        backend: tf.getBackend(),
        version: tf.version.tfjs,
      });
    } catch (error) {
      logger.error('ModelTrainingEngine', 'Failed to initialize TensorFlow.js', error);
      throw error;
    }
  }

  /**
   * Create model architecture based on configuration
   */
  createModel(config: ModelConfiguration): tf.LayersModel {
    try {
      const model = tf.sequential();

      // Add layers based on configuration
      config.layers.forEach((layerConfig, index) => {
        const layer = this.createLayer(layerConfig, index === 0 ? config.inputShape : undefined);
        model.add(layer);
      });

      // Compile model
      const optimizer = this.createOptimizer(config.optimizer);
      model.compile({
        optimizer,
        loss: config.loss,
        metrics: config.metrics,
      });

      logger.info('ModelTrainingEngine', 'Model created', {
        architecture: config.architecture,
        parameters: model.countParams(),
        layers: config.layers.length,
      });

      return model;
    } catch (error) {
      logger.error('ModelTrainingEngine', 'Failed to create model', error);
      throw error;
    }
  }

  /**
   * Create individual layer based on configuration
   */
  private createLayer(config: LayerConfig, inputShape?: number[]): tf.layers.Layer {
    const layerOptions: any = {};

    if (inputShape) {
      layerOptions.inputShape = inputShape;
    }

    switch (config.type) {
      case 'dense':
        return tf.layers.dense({
          units: config.units!,
          activation: config.activation || 'relu',
          ...layerOptions,
        });

      case 'conv2d':
        return tf.layers.conv2d({
          filters: config.filters!,
          kernelSize: config.kernelSize!,
          activation: config.activation || 'relu',
          ...layerOptions,
        });

      case 'maxPooling2d':
        return tf.layers.maxPooling2d({
          poolSize: config.poolSize!,
          ...layerOptions,
        });

      case 'flatten':
        return tf.layers.flatten(layerOptions);

      case 'dropout':
        return tf.layers.dropout({
          rate: config.dropout!,
          ...layerOptions,
        });

      case 'lstm':
        return tf.layers.lstm({
          units: config.units!,
          ...layerOptions,
        });

      default:
        throw new Error(`Unsupported layer type: ${config.type}`);
    }
  }

  /**
   * Create optimizer based on configuration
   */
  private createOptimizer(config: OptimizerConfig): tf.Optimizer {
    switch (config.type) {
      case 'adam':
        return tf.train.adam({
          learningRate: config.learningRate,
          beta1: config.beta1,
          beta2: config.beta2,
        });

      case 'sgd':
        return tf.train.sgd({
          learningRate: config.learningRate,
          momentum: config.momentum,
        });

      case 'rmsprop':
        return tf.train.rmsprop({
          learningRate: config.learningRate,
        });

      default:
        throw new Error(`Unsupported optimizer type: ${config.type}`);
    }
  }

  /**
   * Train model with given data and configuration
   */
  async trainModel(
    jobId: string,
    model: tf.LayersModel,
    trainingData: TrainingData,
    config: TrainingConfiguration,
    onProgress?: (epoch: number, logs: tf.Logs) => void
  ): Promise<{ model: tf.LayersModel; history: tf.History }> {
    try {
      // Convert training data to tensors
      const { xs, ys } = this.prepareTrainingData(trainingData);

      // Create callbacks
      const callbacks = this.createTrainingCallbacks(jobId, config, onProgress);
      this.trainingCallbacks.set(jobId, callbacks);

      logger.info('ModelTrainingEngine', 'Starting model training', {
        jobId,
        dataSize: trainingData.features.length,
        epochs: config.epochs,
        batchSize: config.batchSize,
      });

      // Train the model
      const history = await model.fit(xs, ys, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: config.validationSplit,
        callbacks,
        shuffle: true,
        verbose: 0,
      });

      // Cleanup tensors
      xs.dispose();
      ys.dispose();

      logger.info('ModelTrainingEngine', 'Model training completed', {
        jobId,
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalAccuracy: history.history.acc?.[history.history.acc.length - 1],
      });

      return { model, history };
    } catch (error) {
      logger.error('ModelTrainingEngine', 'Model training failed', { jobId, error });
      throw error;
    } finally {
      this.trainingCallbacks.delete(jobId);
    }
  }

  /**
   * Prepare training data for TensorFlow
   */
  private prepareTrainingData(data: TrainingData): { xs: tf.Tensor; ys: tf.Tensor } {
    try {
      const xs = tf.tensor2d(data.features);
      const ys = tf.tensor2d(data.labels);

      // Normalize features
      const normalizedXs = this.normalizeFeatures(xs);

      xs.dispose(); // Dispose original tensor

      return { xs: normalizedXs, ys };
    } catch (error) {
      logger.error('ModelTrainingEngine', 'Failed to prepare training data', error);
      throw error;
    }
  }

  /**
   * Normalize features using min-max scaling
   */
  private normalizeFeatures(features: tf.Tensor): tf.Tensor {
    const min = features.min(0, true);
    const max = features.max(0, true);
    const range = max.sub(min);

    // Avoid division by zero
    const normalizedRange = range.where(range.greater(0), tf.scalar(1));
    const normalized = features.sub(min).div(normalizedRange);

    min.dispose();
    max.dispose();
    range.dispose();
    normalizedRange.dispose();

    return normalized;
  }

  /**
   * Create training callbacks
   */
  private createTrainingCallbacks(
    jobId: string,
    config: TrainingConfiguration,
    onProgress?: (epoch: number, logs: tf.Logs) => void
  ): tf.Callback[] {
    const callbacks: tf.Callback[] = [];

    // Progress callback
    callbacks.push({
      onEpochEnd: (epoch, logs) => {
        logger.debug('ModelTrainingEngine', 'Epoch completed', {
          jobId,
          epoch,
          loss: logs?.loss,
          accuracy: logs?.acc,
          valLoss: logs?.val_loss,
          valAccuracy: logs?.val_acc,
        });

        if (onProgress) {
          onProgress(epoch, logs || {});
        }
      },
    });

    // Early stopping callback
    if (config.earlyStoppingPatience) {
      let bestLoss = Infinity;
      let patience = 0;

      callbacks.push({
        onEpochEnd: (epoch, logs) => {
          const currentLoss = logs?.val_loss || logs?.loss || Infinity;

          if (currentLoss < bestLoss) {
            bestLoss = currentLoss;
            patience = 0;
          } else {
            patience++;

            if (patience >= config.earlyStoppingPatience!) {
              logger.info('ModelTrainingEngine', 'Early stopping triggered', {
                jobId,
                epoch,
                patience,
                bestLoss,
              });
              // Note: TensorFlow.js doesn't support stopping training from callback
              // This would need to be handled at a higher level
            }
          }
        },
      });
    }

    return callbacks;
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(
    model: tf.LayersModel,
    testData: TrainingData
  ): Promise<ModelPerformance> {
    try {
      const startTime = Date.now();
      const { xs, ys } = this.prepareTrainingData(testData);

      // Get model predictions
      const predictions = model.predict(xs) as tf.Tensor;
      const predictionValues = await predictions.data();
      const actualValues = await ys.data();

      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(
        Array.from(actualValues),
        Array.from(predictionValues),
        Date.now() - startTime,
        testData.features.length
      );

      // Cleanup tensors
      xs.dispose();
      ys.dispose();
      predictions.dispose();

      logger.info('ModelTrainingEngine', 'Model evaluation completed', {
        accuracy: performance.accuracy,
        precision: performance.precision,
        recall: performance.recall,
        f1Score: performance.f1Score,
      });

      return performance;
    } catch (error) {
      logger.error('ModelTrainingEngine', 'Model evaluation failed', error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    actual: number[],
    predicted: number[],
    latency: number,
    sampleSize: number
  ): ModelPerformance {
    const accuracy = this.calculateAccuracy(actual, predicted);
    const precision = this.calculatePrecision(actual, predicted);
    const recall = this.calculateRecall(actual, predicted);
    const f1Score = this.calculateF1Score(precision, recall);
    const mse = this.calculateMSE(actual, predicted);
    const mae = this.calculateMAE(actual, predicted);

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      mse,
      mae,
      latency,
      throughput: sampleSize / (latency / 1000), // samples per second
      timestamp: Date.now(),
      validationSize: sampleSize,
    };
  }

  /**
   * Calculate accuracy
   */
  private calculateAccuracy(actual: number[], predicted: number[]): number {
    const correct = actual.reduce((sum, actualValue, index) => {
      const predictedValue = predicted[index] > 0.5 ? 1 : 0;
      const actualBinary = actualValue > 0.5 ? 1 : 0;
      return sum + (predictedValue === actualBinary ? 1 : 0);
    }, 0);

    return correct / actual.length;
  }

  /**
   * Calculate precision
   */
  private calculatePrecision(actual: number[], predicted: number[]): number {
    let truePositive = 0;
    let falsePositive = 0;

    for (let i = 0; i < actual.length; i++) {
      const predictedBinary = predicted[i] > 0.5 ? 1 : 0;
      const actualBinary = actual[i] > 0.5 ? 1 : 0;

      if (predictedBinary === 1) {
        if (actualBinary === 1) {
          truePositive++;
        } else {
          falsePositive++;
        }
      }
    }

    return truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0;
  }

  /**
   * Calculate recall
   */
  private calculateRecall(actual: number[], predicted: number[]): number {
    let truePositive = 0;
    let falseNegative = 0;

    for (let i = 0; i < actual.length; i++) {
      const predictedBinary = predicted[i] > 0.5 ? 1 : 0;
      const actualBinary = actual[i] > 0.5 ? 1 : 0;

      if (actualBinary === 1) {
        if (predictedBinary === 1) {
          truePositive++;
        } else {
          falseNegative++;
        }
      }
    }

    return truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0;
  }

  /**
   * Calculate F1 score
   */
  private calculateF1Score(precision: number, recall: number): number {
    return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  }

  /**
   * Calculate Mean Squared Error
   */
  private calculateMSE(actual: number[], predicted: number[]): number {
    const sumSquaredErrors = actual.reduce((sum, actualValue, index) => {
      const error = actualValue - predicted[index];
      return sum + error * error;
    }, 0);

    return sumSquaredErrors / actual.length;
  }

  /**
   * Calculate Mean Absolute Error
   */
  private calculateMAE(actual: number[], predicted: number[]): number {
    const sumAbsoluteErrors = actual.reduce((sum, actualValue, index) => {
      return sum + Math.abs(actualValue - predicted[index]);
    }, 0);

    return sumAbsoluteErrors / actual.length;
  }

  /**
   * Get default model configuration for different model types
   */
  getDefaultModelConfiguration(modelType: ModelType, inputSize: number): ModelConfiguration {
    const configs: Record<ModelType, ModelConfiguration> = {
      pricing: {
        architecture: 'Dense Neural Network',
        inputShape: [inputSize],
        outputShape: [1],
        layers: [
          { type: 'dense', units: 128, activation: 'relu' },
          { type: 'dropout', dropout: 0.2 },
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dropout', dropout: 0.2 },
          { type: 'dense', units: 32, activation: 'relu' },
          { type: 'dense', units: 1, activation: 'linear' },
        ],
        optimizer: { type: 'adam', learningRate: 0.001, beta1: 0.9, beta2: 0.999 },
        loss: 'meanSquaredError',
        metrics: ['mae'],
      },
      matching: {
        architecture: 'Dense Neural Network',
        inputShape: [inputSize],
        outputShape: [1],
        layers: [
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dropout', dropout: 0.3 },
          { type: 'dense', units: 32, activation: 'relu' },
          { type: 'dropout', dropout: 0.3 },
          { type: 'dense', units: 1, activation: 'sigmoid' },
        ],
        optimizer: { type: 'adam', learningRate: 0.001 },
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      },
      recommendation: {
        architecture: 'Dense Neural Network',
        inputShape: [inputSize],
        outputShape: [1],
        layers: [
          { type: 'dense', units: 128, activation: 'relu' },
          { type: 'dropout', dropout: 0.2 },
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dense', units: 1, activation: 'sigmoid' },
        ],
        optimizer: { type: 'adam', learningRate: 0.0005 },
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      },
      sentiment: {
        architecture: 'LSTM Neural Network',
        inputShape: [inputSize],
        outputShape: [3],
        layers: [
          { type: 'lstm', units: 64 },
          { type: 'dropout', dropout: 0.5 },
          { type: 'dense', units: 32, activation: 'relu' },
          { type: 'dense', units: 3, activation: 'softmax' },
        ],
        optimizer: { type: 'adam', learningRate: 0.001 },
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      },
      fraud_detection: {
        architecture: 'Dense Neural Network',
        inputShape: [inputSize],
        outputShape: [1],
        layers: [
          { type: 'dense', units: 256, activation: 'relu' },
          { type: 'dropout', dropout: 0.4 },
          { type: 'dense', units: 128, activation: 'relu' },
          { type: 'dropout', dropout: 0.4 },
          { type: 'dense', units: 64, activation: 'relu' },
          { type: 'dense', units: 1, activation: 'sigmoid' },
        ],
        optimizer: { type: 'adam', learningRate: 0.0001 },
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall'],
      },
    };

    return configs[modelType];
  }

  /**
   * Stop training job
   */
  stopTraining(jobId: string): void {
    const callbacks = this.trainingCallbacks.get(jobId);
    if (callbacks) {
      // TensorFlow.js doesn't support stopping training directly
      // This would need to be implemented at a higher level
      logger.warn('ModelTrainingEngine', 'Training stop requested but not supported by TensorFlow.js', {
        jobId,
      });
    }
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Dispose any cached models
    for (const model of this.trainingJobs.values()) {
      model.dispose();
    }
    this.trainingJobs.clear();
    this.trainingCallbacks.clear();

    logger.info('ModelTrainingEngine', 'Resources disposed');
  }
}