/**
 * MLP Operations (pure helpers)
 *
 * Forward pass, parameter initialization, and random layer creation for
 * the Continuum Memory MLP chains.
 */

import { ActivationFunctions, type ActivationType } from '../ActivationFunctions';
import type {
  MemoryParameters,
  MLPConfig,
  LayerParameters,
} from '../types';

/**
 * Apply MLP forward pass to input
 */
export function applyMLP(
  input: number[],
  parameters: MemoryParameters,
  activation: ActivationType
): number[] {
  let currentInput = input;

  for (const layer of parameters.layers) {
    // Matrix multiplication: output = input * weights + biases
    const output: number[] = new Array(layer.outputSize).fill(0);

    for (let i = 0; i < layer.outputSize; i++) {
      let sum = layer.biases[i] || 0;
      for (let j = 0; j < layer.inputSize; j++) {
        sum += currentInput[j] * layer.weights[i][j];
      }
      output[i] = ActivationFunctions.apply(sum, activation);
    }

    currentInput = output;
  }

  return currentInput;
}

/**
 * Create random layer parameters using Xavier/Glorot initialization
 */
export function createRandomLayer(
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
 * Initialize MLP parameters with random values
 */
export function initializeMLPParameters(config: MLPConfig): MemoryParameters {
  const layers: LayerParameters[] = [];
  let inputSize = config.inputSize;

  // Create hidden layers
  for (let i = 0; i < config.hiddenSizes.length; i++) {
    const outputSize = config.hiddenSizes[i];
    layers.push(createRandomLayer(inputSize, outputSize, i));
    inputSize = outputSize;
  }

  // Create output layer
  layers.push(createRandomLayer(inputSize, config.outputSize, layers.length));

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
