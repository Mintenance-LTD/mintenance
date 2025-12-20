/**
 * MLP Backpropagation Implementation
 *
 * Implements proper backpropagation algorithm for Multi-Layer Perceptrons
 * Includes:
 * - Forward pass with activation storage
 * - Backward pass with gradient computation
 * - Weight updates with gradient clipping
 * - Momentum support (optional)
 */

import { ActivationFunctions, type ActivationType } from './ActivationFunctions';
import type { MemoryParameters, LayerParameters } from './types';

/**
 * Gradients for all MLP parameters
 */
export interface MLPGradients {
  weightGradients: number[][][]; // Per layer: [layer][output][input]
  biasGradients: number[][]; // Per layer: [layer][output]
}

/**
 * Forward pass result with intermediate activations
 */
export interface ForwardPassResult {
  activations: number[][]; // Activations after each layer (including input)
  preActivations: number[][]; // Pre-activation values (z = Wx + b)
  output: number[]; // Final output
}

/**
 * Training configuration
 */
export interface BackpropConfig {
  learningRate: number;
  gradientClipMax?: number; // Maximum gradient norm (default: 5.0)
  useMomentum?: boolean; // Use momentum (default: false)
  momentumBeta?: number; // Momentum coefficient (default: 0.9)
  l2Regularization?: number; // L2 regularization strength (default: 0)
}

/**
 * Momentum state for optimization
 */
interface MomentumState {
  weightVelocities: number[][][];
  biasVelocities: number[][];
}

/**
 * MLP Backpropagation Engine
 */
export class MLPBackpropagation {
  private momentumState?: MomentumState;

  /**
   * Forward pass through MLP
   * Stores activations and pre-activations for backpropagation
   */
  static forward(
    input: number[],
    weights: number[][][],
    biases: number[][],
    activation: ActivationType = 'relu'
  ): ForwardPassResult {
    const activations: number[][] = [input]; // Start with input layer
    const preActivations: number[][] = [];

    let currentInput = input;

    // Process each layer
    for (let l = 0; l < weights.length; l++) {
      const layerWeights = weights[l];
      const layerBiases = biases[l];
      const outputSize = layerWeights.length;

      const z: number[] = new Array(outputSize); // Pre-activation
      const a: number[] = new Array(outputSize); // Post-activation

      // Compute z = Wx + b and a = f(z)
      for (let i = 0; i < outputSize; i++) {
        let sum = layerBiases[i] || 0;
        for (let j = 0; j < currentInput.length; j++) {
          sum += currentInput[j] * layerWeights[i][j];
        }
        z[i] = sum;
        a[i] = ActivationFunctions.apply(sum, activation);
      }

      preActivations.push(z);
      activations.push(a);
      currentInput = a;
    }

    return {
      activations,
      preActivations,
      output: activations[activations.length - 1],
    };
  }

  /**
   * Backward pass through MLP
   * Computes gradients for all weights and biases using backpropagation
   */
  static backward(
    input: number[],
    target: number[],
    forwardResult: ForwardPassResult,
    weights: number[][][],
    biases: number[][],
    activation: ActivationType = 'relu',
    l2Regularization: number = 0
  ): MLPGradients {
    const { activations, preActivations } = forwardResult;
    const numLayers = weights.length;

    // Initialize gradients
    const weightGradients: number[][][] = [];
    const biasGradients: number[][] = [];

    // Initialize deltas (error signals)
    const deltas: number[][] = [];

    // Compute output layer delta
    // δ^L = (a^L - y) ⊙ f'(z^L)
    const outputLayer = activations[activations.length - 1];
    const outputPreActivation = preActivations[preActivations.length - 1];
    const outputDelta = outputLayer.map((a, i) => {
      const error = a - (target[i] || 0);
      const derivative = ActivationFunctions.applyDerivative(
        outputPreActivation[i],
        activation
      );
      return error * derivative;
    });
    deltas.push(outputDelta);

    // Backpropagate through hidden layers
    // δ^l = (W^(l+1))^T δ^(l+1) ⊙ f'(z^l)
    for (let l = numLayers - 2; l >= 0; l--) {
      const currentPreActivation = preActivations[l];
      const nextWeights = weights[l + 1];
      const nextDelta = deltas[0]; // Most recent delta

      const delta = currentPreActivation.map((z, i) => {
        let sum = 0;
        for (let j = 0; j < nextWeights.length; j++) {
          sum += nextWeights[j][i] * nextDelta[j];
        }
        const derivative = ActivationFunctions.applyDerivative(z, activation);
        return sum * derivative;
      });

      deltas.unshift(delta); // Add to front
    }

    // Compute gradients for each layer
    // ∂L/∂W^l = δ^l (a^(l-1))^T
    // ∂L/∂b^l = δ^l
    for (let l = 0; l < numLayers; l++) {
      const delta = deltas[l];
      const prevActivation = activations[l]; // Input to this layer
      const layerWeights = weights[l];

      // Weight gradients
      const wGrad: number[][] = [];
      for (let i = 0; i < delta.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < prevActivation.length; j++) {
          let grad = delta[i] * prevActivation[j];

          // Add L2 regularization gradient: λW
          if (l2Regularization > 0) {
            grad += l2Regularization * layerWeights[i][j];
          }

          row.push(grad);
        }
        wGrad.push(row);
      }
      weightGradients.push(wGrad);

      // Bias gradients (just the delta)
      biasGradients.push([...delta]);
    }

    return {
      weightGradients,
      biasGradients,
    };
  }

  /**
   * Update weights and biases using computed gradients
   * Includes gradient clipping and optional momentum
   */
  static updateWeights(
    weights: number[][][],
    biases: number[][],
    gradients: MLPGradients,
    config: BackpropConfig,
    momentumState?: MomentumState
  ): {
    weights: number[][][];
    biases: number[][];
    momentumState?: MomentumState;
    gradientNorm: number;
  } {
    const {
      learningRate,
      gradientClipMax = 5.0,
      useMomentum = false,
      momentumBeta = 0.9,
    } = config;

    // Compute gradient norm
    let gradientNorm = 0;
    for (const layerGrad of gradients.weightGradients) {
      for (const row of layerGrad) {
        for (const val of row) {
          gradientNorm += val * val;
        }
      }
    }
    for (const layerGrad of gradients.biasGradients) {
      for (const val of layerGrad) {
        gradientNorm += val * val;
      }
    }
    gradientNorm = Math.sqrt(gradientNorm);

    // Clip gradients if needed
    let clipScale = 1.0;
    if (gradientNorm > gradientClipMax) {
      clipScale = gradientClipMax / gradientNorm;
    }

    // Initialize momentum state if needed
    let newMomentumState: MomentumState | undefined = momentumState;
    if (useMomentum && !momentumState) {
      newMomentumState = {
        weightVelocities: weights.map(layer =>
          layer.map(row => new Array(row.length).fill(0))
        ),
        biasVelocities: biases.map(layer => new Array(layer.length).fill(0)),
      };
    }

    // Update weights and biases
    const newWeights: number[][][] = [];
    const newBiases: number[][] = [];

    for (let l = 0; l < weights.length; l++) {
      const layerWeights = weights[l];
      const layerBiases = biases[l];
      const layerWeightGrad = gradients.weightGradients[l];
      const layerBiasGrad = gradients.biasGradients[l];

      // Update weights
      const newLayerWeights: number[][] = [];
      for (let i = 0; i < layerWeights.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < layerWeights[i].length; j++) {
          const grad = layerWeightGrad[i][j] * clipScale;
          let update = learningRate * grad;

          if (useMomentum && newMomentumState) {
            // Momentum update: v = βv + ∇L
            const velocity = momentumBeta * newMomentumState.weightVelocities[l][i][j] + grad;
            newMomentumState.weightVelocities[l][i][j] = velocity;
            update = learningRate * velocity;
          }

          row.push(layerWeights[i][j] - update);
        }
        newLayerWeights.push(row);
      }
      newWeights.push(newLayerWeights);

      // Update biases
      const newLayerBiases: number[] = [];
      for (let i = 0; i < layerBiases.length; i++) {
        const grad = layerBiasGrad[i] * clipScale;
        let update = learningRate * grad;

        if (useMomentum && newMomentumState) {
          const velocity = momentumBeta * newMomentumState.biasVelocities[l][i] + grad;
          newMomentumState.biasVelocities[l][i] = velocity;
          update = learningRate * velocity;
        }

        newLayerBiases.push(layerBiases[i] - update);
      }
      newBiases.push(newLayerBiases);
    }

    return {
      weights: newWeights,
      biases: newBiases,
      momentumState: newMomentumState,
      gradientNorm,
    };
  }

  /**
   * Train for one step (forward + backward + update)
   */
  static trainStep(
    input: number[],
    target: number[],
    weights: number[][][],
    biases: number[][],
    config: BackpropConfig,
    activation: ActivationType = 'relu',
    momentumState?: MomentumState
  ): {
    weights: number[][][];
    biases: number[][];
    loss: number;
    momentumState?: MomentumState;
    gradientNorm: number;
  } {
    // Forward pass
    const forwardResult = this.forward(input, weights, biases, activation);

    // Compute loss (Mean Squared Error)
    let loss = 0;
    for (let i = 0; i < forwardResult.output.length; i++) {
      const error = forwardResult.output[i] - (target[i] || 0);
      loss += error * error;
    }
    loss /= forwardResult.output.length;

    // Add L2 regularization to loss
    if (config.l2Regularization && config.l2Regularization > 0) {
      let l2Loss = 0;
      for (const layer of weights) {
        for (const row of layer) {
          for (const w of row) {
            l2Loss += w * w;
          }
        }
      }
      loss += (config.l2Regularization / 2) * l2Loss;
    }

    // Backward pass
    const gradients = this.backward(
      input,
      target,
      forwardResult,
      weights,
      biases,
      activation,
      config.l2Regularization || 0
    );

    // Update weights
    const updateResult = this.updateWeights(
      weights,
      biases,
      gradients,
      config,
      momentumState
    );

    return {
      weights: updateResult.weights,
      biases: updateResult.biases,
      loss,
      momentumState: updateResult.momentumState,
      gradientNorm: updateResult.gradientNorm,
    };
  }

  /**
   * Batch training (multiple samples)
   */
  static trainBatch(
    inputs: number[][],
    targets: number[][],
    weights: number[][][],
    biases: number[][],
    config: BackpropConfig,
    activation: ActivationType = 'relu',
    momentumState?: MomentumState
  ): {
    weights: number[][][];
    biases: number[][];
    averageLoss: number;
    momentumState?: MomentumState;
    averageGradientNorm: number;
  } {
    let currentWeights = weights;
    let currentBiases = biases;
    let currentMomentumState = momentumState;
    let totalLoss = 0;
    let totalGradientNorm = 0;

    for (let i = 0; i < inputs.length; i++) {
      const result = this.trainStep(
        inputs[i],
        targets[i],
        currentWeights,
        currentBiases,
        config,
        activation,
        currentMomentumState
      );

      currentWeights = result.weights;
      currentBiases = result.biases;
      currentMomentumState = result.momentumState;
      totalLoss += result.loss;
      totalGradientNorm += result.gradientNorm;
    }

    return {
      weights: currentWeights,
      biases: currentBiases,
      averageLoss: totalLoss / inputs.length,
      momentumState: currentMomentumState,
      averageGradientNorm: totalGradientNorm / inputs.length,
    };
  }

  /**
   * Convert MemoryParameters to weights/biases arrays
   */
  static parametersToArrays(params: MemoryParameters): {
    weights: number[][][];
    biases: number[][];
  } {
    return {
      weights: params.layers.map(layer => layer.weights),
      biases: params.layers.map(layer => layer.biases),
    };
  }

  /**
   * Convert weights/biases arrays to MemoryParameters
   */
  static arraysToParameters(
    weights: number[][][],
    biases: number[][],
    originalParams: MemoryParameters
  ): MemoryParameters {
    const layers: LayerParameters[] = weights.map((layerWeights, idx) => ({
      weights: layerWeights,
      biases: biases[idx],
      layerIndex: idx,
      inputSize: layerWeights[0].length,
      outputSize: layerWeights.length,
    }));

    const totalParameters = layers.reduce(
      (sum, layer) => sum + layer.inputSize * layer.outputSize + layer.outputSize,
      0
    );

    return {
      layers,
      metadata: {
        ...originalParams.metadata,
        totalParameters,
        updatedAt: new Date(),
      },
    };
  }
}
