/**
 * ML Training Pipeline Types and Interfaces
 * Centralized type definitions for machine learning training system
 */

import * as tf from '@tensorflow/tfjs';

export interface TrainingData {
  features: number[][];
  labels: number[][];
  metadata: TrainingMetadata[];
}

export interface TrainingMetadata {
  contractorId?: string;
  jobId?: string;
  timestamp: number;
  location: string;
  category: string;
  userId?: string;
  sessionId?: string;
  deviceInfo?: any;
}

export interface BiasMetrics {
  fairnessScore: number;
  disparateImpact: number;
  demographicParity: number;
  equalOpportunity: number;
  calibration: number;
  biasDetected: boolean;
  affectedGroups: string[];
  recommendations: string[];
  timestamp: number;
  datasetSize: number;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number;
  mae: number;
  latency: number;
  throughput: number;
  timestamp: number;
  validationSize: number;
}

export interface ValidationResults {
  performance: ModelPerformance;
  biasMetrics: BiasMetrics;
  passedValidation: boolean;
  issues: string[];
  improvements: string[];
  validationTimestamp: number;
  modelVersion: string;
}

export interface ModelConfiguration {
  architecture: string;
  inputShape: number[];
  outputShape: number[];
  layers: LayerConfig[];
  optimizer: OptimizerConfig;
  loss: string;
  metrics: string[];
}

export interface LayerConfig {
  type: string;
  units?: number;
  activation?: string;
  dropout?: number;
  kernelSize?: number[];
  filters?: number;
  poolSize?: number[];
}

export interface OptimizerConfig {
  type: 'adam' | 'sgd' | 'rmsprop' | 'nested-adam' | 'deep-momentum';
  learningRate: number;
  beta1?: number;
  beta2?: number;
  momentum?: number;
  epsilon?: number;
  useNesterov?: boolean;
  mlpHiddenSizes?: number[];
}

export interface TrainingConfiguration {
  batchSize: number;
  epochs: number;
  validationSplit: number;
  learningRate: number;
  retrainingThreshold: number;
  biasCheckInterval: number;
  performanceThreshold: number;
  earlyStoppingPatience?: number;
  saveCheckpoints?: boolean;
  enableOnlineLearning?: boolean; // Enable online/incremental learning mode
}

export interface ModelInfo {
  version: string;
  architecture: string;
  parameters: number;
  trainingTime: number;
  dataSize: number;
  createdAt: number;
  updatedAt: number;
  deployedAt?: number;
}

export interface ABTestConfig {
  name: string;
  modelA: string;
  modelB: string;
  trafficSplit: number; // Percentage for model B
  metrics: string[];
  duration: number; // Test duration in days
  minSampleSize: number;
  confidenceLevel: number;
}

export interface ABTestResults {
  testName: string;
  modelA: {
    performance: ModelPerformance;
    sampleSize: number;
  };
  modelB: {
    performance: ModelPerformance;
    sampleSize: number;
  };
  statisticalSignificance: boolean;
  winner: 'A' | 'B' | 'no_difference';
  confidence: number;
  recommendation: string;
}

export interface TrainingJob {
  id: string;
  modelType: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  config: TrainingConfiguration;
  dataSize: number;
  startTime?: number;
  endTime?: number;
  progress: number; // 0-100
  currentEpoch?: number;
  currentLoss?: number;
  error?: string;
}

export interface ModelMetrics {
  modelType: string;
  version: string;
  performance: ModelPerformance;
  bias: BiasMetrics;
  validation: ValidationResults;
  deployment?: {
    environment: 'staging' | 'production';
    deployedAt: number;
    traffic: number; // Percentage of traffic
  };
}

export interface TrainingReport {
  modelInfo: ModelInfo;
  performance: ModelPerformance;
  biasAnalysis: BiasMetrics;
  recommendations: string[];
  nextSteps: string[];
  timestamp: number;
  trainingHistory: {
    epoch: number;
    loss: number;
    accuracy: number;
    valLoss: number;
    valAccuracy: number;
  }[];
}

export interface DataQualityMetrics {
  completeness: number; // Percentage of complete records
  consistency: number; // Consistency score
  validity: number; // Validity score
  duplicates: number; // Number of duplicate records
  outliers: number; // Number of outliers detected
  balance: { [key: string]: number }; // Class balance ratios
  recommendations: string[];
}

export interface FairnessCriteria {
  demographicParity: boolean;
  equalOpportunity: boolean;
  equalisedOdds: boolean;
  calibration: boolean;
  individualFairness: boolean;
  customMetrics?: string[];
}

export interface ModelDeployment {
  modelId: string;
  version: string;
  environment: 'staging' | 'production';
  endpoint: string;
  status: 'deploying' | 'active' | 'inactive' | 'error';
  traffic: number; // Percentage
  deployedAt: number;
  healthCheck?: {
    lastCheck: number;
    status: 'healthy' | 'unhealthy';
    latency: number;
    errorRate: number;
  };
}

export type ModelType = 'pricing' | 'matching' | 'recommendation' | 'sentiment' | 'fraud_detection';

export type TrainingEventType =
  | 'training_started'
  | 'training_completed'
  | 'training_failed'
  | 'bias_detected'
  | 'performance_degraded'
  | 'model_deployed'
  | 'ab_test_started'
  | 'ab_test_completed';

export interface TrainingEvent {
  type: TrainingEventType;
  modelType: ModelType;
  timestamp: number;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    version?: string;
  };
}