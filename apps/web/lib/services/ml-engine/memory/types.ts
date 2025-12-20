/**
 * Nested Learning Memory Types
 * 
 * Type definitions for Continuum Memory System and Nested Learning components
 * Based on "Nested Learning: The Illusion of Deep Learning Architectures" paper
 */

/**
 * Configuration for a continuum memory system
 * Defines MLP chains with different update frequencies
 */
export interface ContinuumMemoryConfig {
  agentName: string;
  levels: MemoryLevelConfig[];
  defaultChunkSize: number;
  defaultLearningRate: number;
}

/**
 * Configuration for a single memory level
 */
export interface MemoryLevelConfig {
  level: number; // Level index (0 = highest frequency, higher = lower frequency)
  frequency: number; // Update frequency (steps per update)
  chunkSize: number; // Chunk size C^(ℓ) = max_t C_t^(ℓ) / f_t^(ℓ)
  mlpConfig: MLPConfig;
  learningRate: number; // η_t^(ℓ) for this level
}

/**
 * MLP (Multi-Layer Perceptron) configuration for memory
 */
export interface MLPConfig {
  inputSize: number;
  hiddenSizes: number[]; // Array of hidden layer sizes
  outputSize: number;
  activation?: 'relu' | 'tanh' | 'sigmoid' | 'linear';
  useResidual?: boolean;
}

/**
 * Memory level state
 */
export interface MemoryLevel {
  level: number;
  frequency: number;
  chunkSize: number;
  parameters: MemoryParameters;
  lastUpdateStep: number;
  lastUpdateTime: Date;
  updateCount: number;
}

/**
 * Memory parameters (MLP weights)
 * Stored as JSONB in database, structured as layer weights
 */
export interface MemoryParameters {
  layers: LayerParameters[];
  metadata: {
    inputSize: number;
    outputSize: number;
    totalParameters: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Parameters for a single layer
 */
export interface LayerParameters {
  weights: number[][]; // Weight matrix
  biases: number[]; // Bias vector
  layerIndex: number;
  inputSize: number;
  outputSize: number;
}

/**
 * Context flow data (keys and values)
 * Represents the data flowing through memory levels
 */
export interface ContextFlow {
  keys: number[]; // Key vector K ⊆ R^(dk)
  values: number[]; // Value vector V ⊆ R^(dv)
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Context flow batch for memory updates
 */
export interface ContextFlowBatch {
  memoryStateId: string;
  level: number;
  flows: ContextFlow[];
  accumulatedError?: number[];
  readyForUpdate: boolean;
}

/**
 * Memory update result
 */
export interface MemoryUpdateResult {
  success: boolean;
  memoryStateId: string;
  level: number;
  parametersBefore: MemoryParameters;
  parametersAfter: MemoryParameters;
  updateStep: number;
  errorReduction: number;
  timestamp: Date;
}

/**
 * Memory query result
 * Result of querying memory with keys
 */
export interface MemoryQueryResult {
  values: number[];
  confidence: number;
  level: number;
  usedParameters: boolean; // Whether parameters were used vs direct lookup
  timestamp: Date;
}

/**
 * Associative memory mapping
 * M: K → V where K is keys and V is values
 */
export interface AssociativeMemory {
  keys: number[][];
  values: number[][];
  compressedParameters?: MemoryParameters;
  compressionRatio: number;
  lastCompression: Date;
}

/**
 * Memory performance metrics
 */
export interface MemoryPerformanceMetrics {
  memoryStateId: string;
  level: number;
  updateFrequencyCompliance: number; // % of updates at correct frequency
  compressionRatio: number;
  queryLatency: number; // Average query time in ms
  updateLatency: number; // Average update time in ms
  errorReduction: number; // Average error reduction per update
  lastCalculated: Date;
}

/**
 * Self-modification event
 */
export interface SelfModificationEvent {
  agentName: string;
  modificationType: 'frequency_adjustment' | 'chunk_size_adjustment' | 'learning_rate_adjustment' | 'architecture_change';
  before: Record<string, any>;
  after: Record<string, any>;
  reason: string;
  performanceImpact: number;
  timestamp: Date;
}

