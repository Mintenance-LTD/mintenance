/**
 * Advanced ML Framework - Shared Types
 *
 * Type definitions for the ML framework components
 */

// ML Model Types
export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'ranking' | 'recommendation' | 'nlp';
  status: 'training' | 'deployed' | 'testing' | 'retired';
  accuracy: number;
  createdAt: number;
  lastUpdated: number;
  metadata: Record<string, any>;
}

export interface ModelPrediction {
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  timestamp: number;
  latency: number;
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABTestVariant[];
  trafficAllocation: Record<string, number>;
  successMetrics: string[];
  startDate: number;
  endDate?: number;
  minSampleSize: number;
  significance: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  modelId?: string;
  config: Record<string, any>;
  allocation: number; // 0-100 percentage
}

export interface ABTestResult {
  testId: string;
  variant: string;
  metric: string;
  value: number;
  sampleSize: number;
  timestamp: number;
}

export interface ModelDeploymentConfig {
  modelId: string;
  environment: 'staging' | 'canary' | 'production';
  trafficPercentage: number;
  rollbackThreshold: number;
  healthChecks: string[];
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetLatency: number;
  };
}

export interface MLFeature {
  name: string;
  type: 'numerical' | 'categorical' | 'text' | 'boolean' | 'datetime';
  value: any;
  importance?: number;
}

export interface ModelTrainingConfig {
  algorithm: 'random_forest' | 'xgboost' | 'neural_network' | 'linear_regression' | 'svm';
  hyperparameters: Record<string, any>;
  features: string[];
  target: string;
  validationSplit: number;
  crossValidation: number;
  earlyStoppingRounds?: number;
}
