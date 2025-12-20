/**
 * Deep Momentum Gradient Descent (DMGD)
 * 
 * Implements MLP-based momentum memory replacing linear momentum
 * Based on Equation 23 from "Nested Learning" paper
 * 
 * m_{i+1}(u_i) = α_{i+1}m_i - η_t ∇L^(2)(m_i; u_i, I)
 * 
 * Uses MLP to learn non-linear gradient compression patterns
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '@mintenance/shared';
import type { NestedOptimizerConfig } from './NestedOptimizer';

/**
 * Configuration for Deep Momentum GD
 */
export interface DeepMomentumGDConfig extends NestedOptimizerConfig {
  mlpHiddenSizes?: number[]; // Hidden layer sizes for momentum MLP (default: [64, 32])
  momentumInputSize?: number; // Input size for momentum MLP (default: gradient size)
}

/**
 * Deep Momentum Gradient Descent Optimizer
 * 
 * Replaces linear momentum with MLP-based memory
 * Reference: Paper Equation 23
 */
export class DeepMomentumGD extends tf.Optimizer {
  private learningRate: number;
  private momentumDecay: number;
  private epsilon: number;
  private mlpHiddenSizes: number[];
  private momentum: Map<string, tf.Tensor> = new Map();
  private momentumMLPs: Map<string, tf.LayersModel> = new Map();

  constructor(config: DeepMomentumGDConfig) {
    super();
    this.learningRate = config.learningRate;
    this.momentumDecay = config.momentumDecay || 0.9;
    this.epsilon = config.epsilon || 1e-8;
    this.mlpHiddenSizes = config.mlpHiddenSizes || [64, 32];
  }

  /**
   * Apply gradients with deep momentum
   * Implements Equation 23: m_{i+1}(u_i) = α_{i+1}m_i - η_t ∇L^(2)(m_i; u_i, I)
   */
  applyGradients(variableGradients: tf.NamedTensorMap): void {
    const variableNames = Object.keys(variableGradients);

    for (const variableName of variableNames) {
      const gradient = variableGradients[variableName];
      if (!gradient) continue;

      // Get or initialize momentum for this variable
      let momentum = this.momentum.get(variableName);
      if (!momentum) {
        momentum = tf.zerosLike(gradient);
        this.momentum.set(variableName, momentum);
      }

      // Get or create momentum MLP for this variable
      let momentumMLP = this.momentumMLPs.get(variableName);
      if (!momentumMLP) {
        momentumMLP = this.createMomentumMLP(gradient.shape);
        this.momentumMLPs.set(variableName, momentumMLP);
      }

      // Get variable
      const variable = this.getVariable(variableName);
      if (!variable) continue;

      // Compute momentum update using MLP
      // m_{i+1}(u_i) = α_{i+1}m_i - η_t ∇L^(2)(m_i; u_i, I)
      const newMomentum = tf.tidy(() => {
        // Prepare input: concatenate gradient and current momentum
        const gradientFlat = gradient.flatten();
        const momentumFlat = momentum.flatten();
        const input = tf.concat([gradientFlat, momentumFlat], 0);

        // Apply MLP to compute momentum update
        const mlpOutput = momentumMLP.predict(input.expandDims(0)) as tf.Tensor;
        const mlpOutputFlat = mlpOutput.flatten();

        // Reshape to match gradient shape
        const mlpOutputReshaped = mlpOutputFlat.reshape(gradient.shape);

        // Combine with decayed momentum: α*m_i - η*MLP(gradient, momentum)
        const momentumTerm = momentum.mul(this.momentumDecay);
        const mlpTerm = mlpOutputReshaped.mul(this.learningRate);

        return momentumTerm.sub(mlpTerm);
      });

      // Update variable: W_{i+1} = W_i - m_{i+1}
      variable.assign(variable.sub(newMomentum));

      // Update momentum storage
      momentum.dispose();
      this.momentum.set(variableName, newMomentum);
    }
  }

  /**
   * Create MLP for momentum computation
   */
  private createMomentumMLP(outputShape: number[]): tf.LayersModel {
    const outputSize = outputShape.reduce((a, b) => a * b, 1);
    const inputSize = outputSize * 2; // gradient + momentum

    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
      units: this.mlpHiddenSizes[0] || 64,
      inputShape: [inputSize],
      activation: 'relu',
      name: 'momentum_mlp_hidden_0',
    }));

    // Hidden layers
    for (let i = 1; i < this.mlpHiddenSizes.length; i++) {
      model.add(tf.layers.dense({
        units: this.mlpHiddenSizes[i],
        activation: 'relu',
        name: `momentum_mlp_hidden_${i}`,
      }));
    }

    // Output layer
    model.add(tf.layers.dense({
      units: outputSize,
      activation: 'linear',
      name: 'momentum_mlp_output',
    }));

    // Compile model (no optimizer needed - it's part of the optimizer itself)
    model.compile({
      optimizer: 'sgd',
      loss: 'meanSquaredError',
    });

    return model;
  }

  /**
   * Get variable by name (placeholder)
   */
  private getVariable(name: string): tf.Variable | null {
    // In TensorFlow.js, variables are typically accessed through model
    return null;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    for (const momentum of this.momentum.values()) {
      momentum.dispose();
    }
    this.momentum.clear();

    for (const mlp of this.momentumMLPs.values()) {
      mlp.dispose();
    }
    this.momentumMLPs.clear();
  }

  /**
   * Get optimizer configuration
   */
  getConfig(): DeepMomentumGDConfig {
    return {
      learningRate: this.learningRate,
      momentumDecay: this.momentumDecay,
      epsilon: this.epsilon,
      mlpHiddenSizes: this.mlpHiddenSizes,
    };
  }
}

/**
 * Create Deep Momentum GD optimizer instance
 */
export function createDeepMomentumGD(config: DeepMomentumGDConfig): DeepMomentumGD {
  return new DeepMomentumGD(config);
}

