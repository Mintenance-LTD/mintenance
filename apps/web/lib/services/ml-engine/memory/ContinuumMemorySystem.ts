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
import { SelfModifyingTitans } from './SelfModifyingTitans';
import { type ActivationType } from './ActivationFunctions';
import type {
  ContinuumMemoryConfig,
  MemoryLevel,
  ContextFlow,
  MemoryUpdateResult,
  MemoryQueryResult,
} from './types';
import {
  applyMLP,
  initializeMLPParameters,
} from './continuum-memory/mlp-operations';
import {
  calculateErrorReduction,
  calculateConfidence,
} from './continuum-memory/error-calculations';
import {
  loadExistingMemoryStates,
  saveMemoryLevel,
  logUpdateHistory,
} from './continuum-memory/persistence';
import { computeUpdatedParameters } from './continuum-memory/training-step';

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
  private titansModules: Map<string, SelfModifyingTitans> = new Map();
  private useTitans: boolean = false;
  private useProperBackprop: boolean = true; // Use proper backpropagation (default: true)
  private activation: ActivationType = 'relu'; // Default activation function

  constructor(config: ContinuumMemoryConfig) {
    this.config = config;
    this.initializeMemoryLevels();
  }

  /**
   * Enable Titans integration for self-modification
   */
  enableTitans(enable: boolean = true): void {
    this.useTitans = enable;
    if (enable) {
      logger.info('Titans enabled for continuum memory', {
        agentName: this.config.agentName,
      });
    }
  }

  /**
   * Enable or disable proper backpropagation
   * Set to false to use simplified gradient descent (legacy behavior)
   */
  enableProperBackpropagation(enable: boolean = true): void {
    this.useProperBackprop = enable;
    logger.info('Backpropagation mode changed', {
      agentName: this.config.agentName,
      mode: enable ? 'proper' : 'simplified',
    });
  }

  /**
   * Set activation function type
   */
  setActivationFunction(activation: ActivationType): void {
    this.activation = activation;
    logger.info('Activation function changed', {
      agentName: this.config.agentName,
      activation,
    });
  }

  /**
   * Initialize memory levels from config
   */
  private async initializeMemoryLevels(): Promise<void> {
    try {
      // Load existing memory states from database
      const existingStates = await loadExistingMemoryStates(this.config.agentName);

      // Initialize each level
      for (const levelConfig of this.config.levels) {
        const levelKey = this.getLevelKey(levelConfig.level);

        // Check if state exists in database
        const existingState = existingStates?.find(
          (s) => s.memory_level === levelConfig.level
        );

        if (existingState) {
          // Load existing state
          const memoryLevel: MemoryLevel = {
            level: levelConfig.level,
            frequency: levelConfig.frequency,
            chunkSize: levelConfig.chunkSize,
            parameters: existingState.parameters_jsonb,
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
            parameters: initializeMLPParameters(levelConfig.mlpConfig),
            lastUpdateStep: 0,
            lastUpdateTime: new Date(),
            updateCount: 0,
          };
          this.memoryLevels.set(levelKey, memoryLevel);

          // Save to database
          await saveMemoryLevel(this.config.agentName, memoryLevel);
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
      currentInput = applyMLP(currentInput, level.parameters, this.activation);
    }

    return currentInput;
  }

  /**
   * Enhanced process with Titans self-modification
   * Combines continuum memory with self-modifying projections
   *
   * Process: Continuum Memory → Titans → Output
   */
  async processWithTitans(input: number[]): Promise<number[]> {
    // First, process through continuum memory (existing)
    const processed = await this.process(input);

    if (!this.useTitans) {
      return processed;
    }

    // Then, apply Titans for self-modification at highest frequency level
    const highestLevel = this.getHighestFrequencyLevel();
    if (!highestLevel) {
      return processed;
    }

    const levelKey = highestLevel.level.toString();

    if (!this.titansModules.has(levelKey)) {
      const titans = new SelfModifyingTitans(
        `${this.config.agentName}_level_${levelKey}`,
        {
          inputDim: processed.length,
          hiddenDim: Math.max(32, Math.floor(processed.length * 1.5)),
          outputDim: processed.length,
          learningRate: 0.001,
          memorySize: 100,
        }
      );
      await titans.loadState();
      this.titansModules.set(levelKey, titans);
    }

    const titans = this.titansModules.get(levelKey)!;
    return await titans.forward(processed);
  }

  /**
   * Learn from surprise signal with Titans
   * Updates both continuum memory and Titans projections
   */
  async learnFromSurpriseWithTitans(
    input: number[],
    surpriseSignal: number[],
    level?: number
  ): Promise<void> {
    // Update continuum memory (existing)
    await this.addContextFlow(input, surpriseSignal, level);

    // Update Titans if enabled
    if (this.useTitans) {
      const targetLevel = level !== undefined
        ? this.getLevelByIndex(level)
        : this.getHighestFrequencyLevel();

      if (targetLevel) {
        const levelKey = targetLevel.level.toString();
        const titans = this.titansModules.get(levelKey);

        if (titans) {
          // Process input through continuum memory first
          const processed = await this.process(input);

          // Compute target for Titans (surprise signal adjusted for processed dimension)
          const titansTarget = processed.length === surpriseSignal.length
            ? surpriseSignal
            : surpriseSignal.slice(0, processed.length);

          await titans.learnFromSurprise(processed, titansTarget);
        }
      }
    }
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
    const values = applyMLP(keys, targetLevel.parameters, this.activation);

    return {
      values,
      confidence: calculateConfidence(keys, targetLevel),
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

    const parametersBefore = JSON.parse(JSON.stringify(memoryLevel.parameters));
    const levelConfig = this.config.levels.find(l => l.level === level)!;
    const parametersAfter = computeUpdatedParameters({
      agentName: this.config.agentName,
      level,
      levelConfig,
      currentParameters: memoryLevel.parameters,
      contextFlows,
      activation: this.activation,
      useProperBackprop: this.useProperBackprop,
    });

    // Update memory level
    memoryLevel.parameters = parametersAfter;
    memoryLevel.lastUpdateStep = this.currentStep;
    memoryLevel.lastUpdateTime = new Date();
    memoryLevel.updateCount += 1;

    // Clear context flow buffer for this level
    this.contextFlowBuffer.set(levelKey, []);

    // Save to database
    await saveMemoryLevel(this.config.agentName, memoryLevel);

    // Calculate error reduction
    const errorReduction = calculateErrorReduction(
      parametersBefore,
      parametersAfter,
      contextFlows,
      this.activation
    );

    // Log update history
    await logUpdateHistory(
      this.config.agentName,
      memoryLevel,
      errorReduction,
      this.currentStep
    );

    logger.info('Memory level updated', {
      agentName: this.config.agentName,
      level,
      updateStep: this.currentStep,
      errorReduction,
      contextFlowsProcessed: contextFlows.length,
      method: this.useProperBackprop ? 'backpropagation' : 'simplified',
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
