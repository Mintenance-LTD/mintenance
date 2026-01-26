/**
 * Machine Learning System Type Definitions
 * Types for ML training, validation, and model management
 */

/**
 * Correction Record from Database
 * Represents user corrections to model predictions
 */
export interface CorrectionRecord {
  id: string;
  was_correct: boolean;
  created_at: string;
  model_predictions_log: ModelPrediction[];
}

/**
 * Model Prediction Entry
 */
export interface ModelPrediction {
  model_id: string;
  prediction: unknown;
  confidence: number;
  timestamp: string;
}

/**
 * Model Hyperparameters
 * Configuration for ML model training
 */
export interface ModelHyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  optimizer: string;
  lossFunction: string;
  dropout: number;
}

/**
 * Trigger Metadata
 * Information about why model retraining was triggered
 */
export interface TriggerMetadata {
  driftScore?: number;
  accuracyDrop?: number;
  correctionCount?: number;
  driftType?: string;
  affectedFeatures?: string[];
  lastRetrainingDate?: string;
  daysSinceLastRetrain?: number;
  reason?: string;
}

/**
 * Trained Model Result
 * Output from model training process
 */
export interface TrainedModel {
  modelId: string;
  weights: string;
  config: ModelHyperparameters;
}

/**
 * Validation Metrics
 * Model performance on validation dataset
 */
export interface ValidationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  loss: number;
  confusionMatrix?: number[][];
}

/**
 * Test Metrics
 * Model performance on test dataset
 */
export interface TestMetrics extends ValidationMetrics {
  testSetSize: number;
  timestamp: string;
}
