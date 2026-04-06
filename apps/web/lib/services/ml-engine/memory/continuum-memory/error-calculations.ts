/**
 * Error Calculations (pure helpers)
 *
 * Accumulated error computation, parameter updates (simplified legacy path),
 * error-reduction metrics, and confidence estimation.
 */

import type { ActivationType } from '../ActivationFunctions';
import type {
  ContextFlow,
  MemoryLevel,
  MemoryParameters,
} from '../types';
import { applyMLP } from './mlp-operations';

/**
 * Calculate accumulated error for parameter update
 * Implements: Ση_t f(θ_i; x_t) where f is the error function
 */
export function calculateAccumulatedError(
  parameters: MemoryParameters,
  contextFlows: ContextFlow[],
  learningRate: number,
  activation: ActivationType
): number[] {
  // Calculate error for each context flow
  const errors: number[][] = [];

  for (const flow of contextFlows) {
    // Predict values using current parameters
    const predictedValues = applyMLP(flow.keys, parameters, activation);

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
 * Update parameters with accumulated error (simplified gradient descent).
 * Only updates output layer biases. Used for legacy path.
 */
export function updateParametersSimplified(
  parameters: MemoryParameters,
  accumulatedError: number[]
): MemoryParameters {
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
export function calculateErrorReduction(
  before: MemoryParameters,
  after: MemoryParameters,
  contextFlows: ContextFlow[],
  activation: ActivationType
): number {
  let totalErrorBefore = 0;
  let totalErrorAfter = 0;

  for (const flow of contextFlows) {
    const predBefore = applyMLP(flow.keys, before, activation);
    const predAfter = applyMLP(flow.keys, after, activation);

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
 * Calculate confidence for query result.
 * Simple confidence based on update count and recency.
 */
export function calculateConfidence(_keys: number[], level: MemoryLevel): number {
  const recencyFactor = Math.min(1, level.updateCount / 100);
  const recency = Math.min(
    1,
    (Date.now() - level.lastUpdateTime.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return (recencyFactor + (1 - recency)) / 2;
}
