/**
 * Continuum Memory System
 * 
 * Implements multi-frequency MLP chains for nested learning
 * Based on Equation 30-31 from "Nested Learning" paper
 * 
 * Each memory level updates at different frequencies:
 * - High-frequency: Updates every step (immediate context)
 * - Mid-frequency: Updates every C^(ℓ-1) steps (recent patterns)
 * - Low-frequency: Updates every C^(ℓ) steps (long-term knowledge)
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  ContinuumMemoryConfig,
  MemoryLevel,
  MemoryLevelConfig,
  ContextFlow,
  MemoryUpdateResult,
  MemoryQueryResult,
  MemoryParameters,
  MLPConfig,
  LayerParameters,
} from './types';

/**
 * Continuum Memory System
 * 
 * Manages MLP chains with different update frequencies
 * Implements Equation 30: y_t = MLP(f_k)(MLP(f_{k-1})(...MLP(f_1)(x_t)))
 * Implements Equation 31: θ_{i+1} = θ_i - Ση_t f(θ_i; x_t) when i ≡ 0 (mod C^(ℓ))
 */
export class ContinuumMemorySystem {
  private memoryLevels: Map<string, MemoryLevel> = new Map();
  private config: ContinuumMemoryConfig;
  private currentStep: number = 0;
  private contextFlowBuffer: Map<string, ContextFlow[]> = new Map();

  constructor(config: ContinuumMemoryConfig) {
    this.config = config;
    this.initializeMemoryLevels();
  }

  /**
   * Initialize memory levels from config
   */
  private async initializeMemoryLevels(): Promise<void> {
    try {
      // Load existing memory states from database
      const { data: existingStates, error } = await serverSupabase
        .from('continuum_memory_states')
        .select('*')
        .eq('agent_name', this.config.agentName)
        .order('memory_level', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for first initialization
        logger.error('Failed to load existing memory states', {
          service: 'ContinuumMemorySystem',
          agentName: this.config.agentName,
          error: error.message,
        });
      }

      // Initialize each level
      for (const levelConfig of this.config.levels) {
        const levelKey = this.getLevelKey(levelConfig.level);
        
        // Check if state exists in database
        const existingState = existingStates?.find(
          (s: any) => s.memory_level === levelConfig.level
        );

        if (existingState) {
          // Load existing state
          const memoryLevel: MemoryLevel = {
            level: levelConfig.level,
            frequency: levelConfig.frequency,
            chunkSize: levelConfig.chunkSize,
            parameters: existingState.parameters_jsonb as MemoryParameters,
            lastUpdateStep: existingState.last_update_step || 0,
            lastUpdateTime: new Date(existingState.last_updated),
            updateCount: existingState.update_count || 0,
          };
          this.memoryLevels.set(levelKey, memoryLevel);
        } else {
          // Initialize new memory level with random parameters
          const memoryLevel: MemoryLevel = {
            level: levelConfig.level,
            frequency: levelConfig.frequency,
            chunkSize: levelConfig.chunkSize,
            parameters: this.initializeMLPParameters(levelConfig.mlpConfig),
            lastUpdateStep: 0,
            lastUpdateTime: new Date(),
            updateCount: 0,
          };
          this.memoryLevels.set(levelKey, memoryLevel);
          
          // Save to database
          await this.saveMemoryLevel(memoryLevel);
        }

        // Initialize context flow buffer for this level
        this.contextFlowBuffer.set(levelKey, []);
      }

      logger.info('ContinuumMemorySystem initialized', {
        agentName: this.config.agentName,
        levels: this.config.levels.length,
      });
    } catch (error) {
      logger.error('Failed to initialize ContinuumMemorySystem', error, {
        service: 'ContinuumMemorySystem',
        agentName: this.config.agentName,
      });
      throw error;
    }
  }

  /**
   * Process input through continuum memory chain
   * Implements Equation 30: y_t = MLP(f_k)(MLP(f_{k-1})(...MLP(f_1)(x_t)))
   */
  async process(input: number[]): Promise<number[]> {
    let currentInput = input;

    // Process through each level in order (low to high frequency)
    const sortedLevels = Array.from(this.memoryLevels.values()).sort(
      (a, b) => a.level - b.level
    );

    for (const level of sortedLevels) {
      currentInput = this.applyMLP(currentInput, level.parameters);
    }

    return currentInput;
  }

  /**
   * Query memory with keys to get values
   * Implements associative memory retrieval M(K) → V
   */
  async query(keys: number[], level?: number): Promise<MemoryQueryResult> {
    const targetLevel = level !== undefined 
      ? this.getLevelByIndex(level)
      : this.getHighestFrequencyLevel();

    if (!targetLevel) {
      throw new Error(`Memory level ${level} not found`);
    }

    // Apply MLP to keys to get values
    const values = this.applyMLP(keys, targetLevel.parameters);

    return {
      values,
      confidence: this.calculateConfidence(keys, targetLevel),
      level: targetLevel.level,
      usedParameters: true,
      timestamp: new Date(),
    };
  }

  /**
   * Add context flow data for memory updates
   * Stores keys and values for later compression into parameters
   */
  async addContextFlow(keys: number[], values: number[], level?: number): Promise<void> {
    const targetLevel = level !== undefined
      ? this.getLevelByIndex(level)
      : this.getHighestFrequencyLevel();

    if (!targetLevel) {
      throw new Error(`Memory level ${level} not found`);
    }

    const levelKey = this.getLevelKey(targetLevel.level);
    const flow: ContextFlow = {
      keys,
      values,
      timestamp: new Date(),
    };

    const buffer = this.contextFlowBuffer.get(levelKey) || [];
    buffer.push(flow);
    this.contextFlowBuffer.set(levelKey, buffer);

    // Check if update is due based on frequency
    const stepsSinceUpdate = this.currentStep - targetLevel.lastUpdateStep;
    if (stepsSinceUpdate >= targetLevel.chunkSize) {
      await this.updateMemoryLevel(targetLevel.level);
    }
  }

  /**
   * Update memory level parameters
   * Implements Equation 31: θ_{i+1} = θ_i - Ση_t f(θ_i; x_t) when i ≡ 0 (mod C^(ℓ))
   */
  async updateMemoryLevel(level: number): Promise<MemoryUpdateResult> {
    const memoryLevel = this.getLevelByIndex(level);
    if (!memoryLevel) {
      throw new Error(`Memory level ${level} not found`);
    }

    const levelKey = this.getLevelKey(level);
    const contextFlows = this.contextFlowBuffer.get(levelKey) || [];

    if (contextFlows.length === 0) {
      // No data to update with
      return {
        success: false,
        memoryStateId: '',
        level,
        parametersBefore: memoryLevel.parameters,
        parametersAfter: memoryLevel.parameters,
        updateStep: this.currentStep,
        errorReduction: 0,
        timestamp: new Date(),
      };
    }

    // Calculate accumulated error
    const accumulatedError = this.calculateAccumulatedError(
      memoryLevel.parameters,
      contextFlows,
      this.config.levels.find(l => l.level === level)!.learningRate
    );

    // Update parameters: θ_{i+1} = θ_i - error
    const parametersBefore = JSON.parse(JSON.stringify(memoryLevel.parameters));
    const parametersAfter = this.updateParameters(
      memoryLevel.parameters,
      accumulatedError,
      this.config.levels.find(l => l.level === level)!.learningRate
    );

    // Update memory level
    memoryLevel.parameters = parametersAfter;
    memoryLevel.lastUpdateStep = this.currentStep;
    memoryLevel.lastUpdateTime = new Date();
    memoryLevel.updateCount += 1;

    // Clear context flow buffer for this level
    this.contextFlowBuffer.set(levelKey, []);

    // Save to database
    await this.saveMemoryLevel(memoryLevel);

    // Calculate error reduction
    const errorReduction = this.calculateErrorReduction(
      parametersBefore,
      parametersAfter,
      contextFlows
    );

    // Log update history
    await this.logUpdateHistory(memoryLevel, errorReduction);

    logger.info('Memory level updated', {
      agentName: this.config.agentName,
      level,
      updateStep: this.currentStep,
      errorReduction,
      contextFlowsProcessed: contextFlows.length,
    });

    return {
      success: true,
      memoryStateId: levelKey,
      level,
      parametersBefore,
      parametersAfter,
      updateStep: this.currentStep,
      errorReduction,
      timestamp: new Date(),
    };
  }

  /**
   * Increment step counter
   * Should be called after each data point processed
   */
  incrementStep(): void {
    this.currentStep += 1;

    // Check all levels for update eligibility
    for (const level of this.memoryLevels.values()) {
      const stepsSinceUpdate = this.currentStep - level.lastUpdateStep;
      if (stepsSinceUpdate >= level.chunkSize) {
        // Trigger update asynchronously
        this.updateMemoryLevel(level.level).catch((error) => {
          logger.error('Failed to update memory level', error, {
            service: 'ContinuumMemorySystem',
            level: level.level,
          });
        });
      }
    }
  }

  /**
   * Apply MLP to input
   */
  private applyMLP(input: number[], parameters: MemoryParameters): number[] {
    let currentInput = input;

    for (const layer of parameters.layers) {
      // Matrix multiplication: output = input * weights + biases
      const output: number[] = new Array(layer.outputSize).fill(0);

      for (let i = 0; i < layer.outputSize; i++) {
        let sum = layer.biases[i] || 0;
        for (let j = 0; j < layer.inputSize; j++) {
          sum += currentInput[j] * layer.weights[i][j];
        }
        output[i] = this.applyActivation(sum, 'relu');
      }

      currentInput = output;
    }

    return currentInput;
  }

  /**
   * Initialize MLP parameters with random values
   */
  private initializeMLPParameters(config: MLPConfig): MemoryParameters {
    const layers: LayerParameters[] = [];
    let inputSize = config.inputSize;

    // Create hidden layers
    for (let i = 0; i < config.hiddenSizes.length; i++) {
      const outputSize = config.hiddenSizes[i];
      layers.push(this.createRandomLayer(inputSize, outputSize, i));
      inputSize = outputSize;
    }

    // Create output layer
    layers.push(this.createRandomLayer(inputSize, config.outputSize, layers.length));

    const totalParameters = layers.reduce(
      (sum, layer) => sum + layer.inputSize * layer.outputSize + layer.outputSize,
      0
    );

    return {
      layers,
      metadata: {
        inputSize: config.inputSize,
        outputSize: config.outputSize,
        totalParameters,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Create random layer parameters
   */
  private createRandomLayer(
    inputSize: number,
    outputSize: number,
    layerIndex: number
  ): LayerParameters {
    // Xavier/Glorot initialization
    const limit = Math.sqrt(6.0 / (inputSize + outputSize));
    
    const weights: number[][] = [];
    for (let i = 0; i < outputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * limit;
      }
    }

    const biases: number[] = new Array(outputSize).fill(0);

    return {
      weights,
      biases,
      layerIndex,
      inputSize,
      outputSize,
    };
  }

  /**
   * Calculate accumulated error for parameter update
   * Implements: Ση_t f(θ_i; x_t) where f is the error function
   */
  private calculateAccumulatedError(
    parameters: MemoryParameters,
    contextFlows: ContextFlow[],
    learningRate: number
  ): number[] {
    // Calculate error for each context flow
    const errors: number[][] = [];

    for (const flow of contextFlows) {
      // Predict values using current parameters
      const predictedValues = this.applyMLP(flow.keys, parameters);
      
      // Calculate error: predicted - actual
      const error = predictedValues.map((pred, i) => pred - (flow.values[i] || 0));
      errors.push(error);
    }

    // Accumulate errors: sum all errors
    const accumulated = new Array(errors[0]?.length || 0).fill(0);
    for (const error of errors) {
      for (let i = 0; i < error.length; i++) {
        accumulated[i] += error[i] * learningRate;
      }
    }

    return accumulated;
  }

  /**
   * Update parameters with accumulated error
   */
  private updateParameters(
    parameters: MemoryParameters,
    accumulatedError: number[],
    learningRate: number
  ): MemoryParameters {
    // Simple gradient descent update
    // In practice, this would use backpropagation through the MLP
    // For now, we update the output layer biases directly
    
    const updatedLayers = parameters.layers.map((layer, layerIndex) => {
      if (layerIndex === parameters.layers.length - 1) {
        // Update output layer biases
        const updatedBiases = layer.biases.map((bias, i) => 
          bias - (accumulatedError[i] || 0)
        );
        return { ...layer, biases: updatedBiases };
      }
      return layer;
    });

    return {
      layers: updatedLayers,
      metadata: {
        ...parameters.metadata,
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Calculate error reduction after update
   */
  private calculateErrorReduction(
    before: MemoryParameters,
    after: MemoryParameters,
    contextFlows: ContextFlow[]
  ): number {
    let totalErrorBefore = 0;
    let totalErrorAfter = 0;

    for (const flow of contextFlows) {
      const predBefore = this.applyMLP(flow.keys, before);
      const predAfter = this.applyMLP(flow.keys, after);

      const errorBefore = predBefore.reduce(
        (sum, pred, i) => sum + Math.abs(pred - (flow.values[i] || 0)),
        0
      );
      const errorAfter = predAfter.reduce(
        (sum, pred, i) => sum + Math.abs(pred - (flow.values[i] || 0)),
        0
      );

      totalErrorBefore += errorBefore;
      totalErrorAfter += errorAfter;
    }

    if (totalErrorBefore === 0) return 0;
    return (totalErrorBefore - totalErrorAfter) / totalErrorBefore;
  }

  /**
   * Apply activation function
   */
  private applyActivation(value: number, activation: string): number {
    switch (activation) {
      case 'relu':
        return Math.max(0, value);
      case 'tanh':
        return Math.tanh(value);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-value));
      case 'linear':
      default:
        return value;
    }
  }

  /**
   * Calculate confidence for query result
   */
  private calculateConfidence(keys: number[], level: MemoryLevel): number {
    // Simple confidence based on update count and recency
    const recencyFactor = Math.min(1, level.updateCount / 100);
    const recency = Math.min(1, (Date.now() - level.lastUpdateTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return (recencyFactor + (1 - recency)) / 2;
  }

  /**
   * Get memory level by index
   */
  private getLevelByIndex(level: number): MemoryLevel | undefined {
    return this.memoryLevels.get(this.getLevelKey(level));
  }

  /**
   * Get highest frequency level (level 0)
   */
  private getHighestFrequencyLevel(): MemoryLevel | undefined {
    return this.getLevelByIndex(0);
  }

  /**
   * Get level key for Map
   */
  private getLevelKey(level: number): string {
    return `${this.config.agentName}_level_${level}`;
  }

  /**
   * Save memory level to database
   */
  private async saveMemoryLevel(level: MemoryLevel): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('continuum_memory_states')
        .upsert({
          agent_name: this.config.agentName,
          memory_level: level.level,
          parameters_jsonb: level.parameters,
          chunk_size: level.chunkSize,
          frequency: level.frequency,
          last_update_step: level.lastUpdateStep,
          last_updated: level.lastUpdateTime.toISOString(),
          update_count: level.updateCount,
        }, {
          onConflict: 'agent_name,memory_level',
        });

      if (error) {
        logger.error('Failed to save memory level', {
          service: 'ContinuumMemorySystem',
          error: error.message,
          level: level.level,
        });
      }
    } catch (error) {
      logger.error('Error saving memory level', error, {
        service: 'ContinuumMemorySystem',
        level: level.level,
      });
    }
  }

  /**
   * Log update history
   */
  private async logUpdateHistory(level: MemoryLevel, errorReduction: number): Promise<void> {
    try {
      const levelKey = this.getLevelKey(level.level);
      
      // Get memory state ID
      const { data: state } = await serverSupabase
        .from('continuum_memory_states')
        .select('id')
        .eq('agent_name', this.config.agentName)
        .eq('memory_level', level.level)
        .single();

      if (state) {
        await serverSupabase
          .from('memory_update_history')
          .insert({
            memory_state_id: state.id,
            update_count: level.updateCount,
            last_update_time: level.lastUpdateTime.toISOString(),
            update_frequency: level.frequency,
            error_reduction: errorReduction,
            step: this.currentStep,
          });
      }
    } catch (error) {
      logger.error('Failed to log update history', error, {
        service: 'ContinuumMemorySystem',
      });
    }
  }

  /**
   * Get all memory levels
   */
  getMemoryLevels(): MemoryLevel[] {
    return Array.from(this.memoryLevels.values());
  }

  /**
   * Get current step
   */
  getCurrentStep(): number {
    return this.currentStep;
  }
}

