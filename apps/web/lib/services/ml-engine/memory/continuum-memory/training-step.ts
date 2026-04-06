/**
 * Training Step (pure helpers)
 *
 * Computes updated parameters for a memory level using either proper
 * backpropagation or legacy simplified gradient descent.
 */

import { logger } from '@mintenance/shared';
import { MLPBackpropagation, type BackpropConfig } from '../MLPBackpropagation';
import type { ActivationType } from '../ActivationFunctions';
import type {
  ContextFlow,
  MemoryLevelConfig,
  MemoryParameters,
} from '../types';
import {
  calculateAccumulatedError,
  updateParametersSimplified,
} from './error-calculations';

export interface TrainingStepOptions {
  agentName: string;
  level: number;
  levelConfig: MemoryLevelConfig;
  currentParameters: MemoryParameters;
  contextFlows: ContextFlow[];
  activation: ActivationType;
  useProperBackprop: boolean;
}

/**
 * Compute updated MLP parameters from a batch of context flows.
 */
export function computeUpdatedParameters(
  opts: TrainingStepOptions
): MemoryParameters {
  const {
    agentName,
    level,
    levelConfig,
    currentParameters,
    contextFlows,
    activation,
    useProperBackprop,
  } = opts;

  if (useProperBackprop) {
    // Use proper backpropagation
    const { weights, biases } = MLPBackpropagation.parametersToArrays(currentParameters);

    const backpropConfig: BackpropConfig = {
      learningRate: levelConfig.learningRate,
      gradientClipMax: 5.0,
      useMomentum: true,
      momentumBeta: 0.9,
      l2Regularization: 0.0001, // Small L2 regularization for stability
    };

    // Extract inputs and targets from context flows
    const inputs = contextFlows.map((flow) => flow.keys);
    const targets = contextFlows.map((flow) => flow.values);

    // Train on batch
    const result = MLPBackpropagation.trainBatch(
      inputs,
      targets,
      weights,
      biases,
      backpropConfig,
      activation
    );

    // Convert back to MemoryParameters
    const parametersAfter = MLPBackpropagation.arraysToParameters(
      result.weights,
      result.biases,
      currentParameters
    );

    logger.info('Backpropagation training completed', {
      agentName,
      level,
      averageLoss: result.averageLoss,
      averageGradientNorm: result.averageGradientNorm,
      samples: contextFlows.length,
    });

    return parametersAfter;
  }

  // Use simplified gradient descent (legacy)
  const accumulatedError = calculateAccumulatedError(
    currentParameters,
    contextFlows,
    levelConfig.learningRate,
    activation
  );

  return updateParametersSimplified(currentParameters, accumulatedError);
}
