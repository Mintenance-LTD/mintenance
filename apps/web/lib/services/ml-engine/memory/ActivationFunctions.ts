/**
 * Activation Functions for Neural Networks
 *
 * Provides activation functions and their derivatives for backpropagation
 * Supports: ReLU, Tanh, Sigmoid, Leaky ReLU, ELU
 */

export type ActivationType = 'relu' | 'tanh' | 'sigmoid' | 'leaky_relu' | 'elu' | 'linear';

/**
 * Activation function utilities
 */
export class ActivationFunctions {
  /**
   * ReLU (Rectified Linear Unit)
   * f(x) = max(0, x)
   */
  static relu(x: number): number {
    return Math.max(0, x);
  }

  /**
   * ReLU derivative
   * f'(x) = 1 if x > 0, else 0
   */
  static reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
  }

  /**
   * Leaky ReLU
   * f(x) = max(0.01 * x, x)
   */
  static leakyRelu(x: number, alpha: number = 0.01): number {
    return x > 0 ? x : alpha * x;
  }

  /**
   * Leaky ReLU derivative
   * f'(x) = 1 if x > 0, else alpha
   */
  static leakyReluDerivative(x: number, alpha: number = 0.01): number {
    return x > 0 ? 1 : alpha;
  }

  /**
   * ELU (Exponential Linear Unit)
   * f(x) = x if x > 0, else alpha * (exp(x) - 1)
   */
  static elu(x: number, alpha: number = 1.0): number {
    return x > 0 ? x : alpha * (Math.exp(x) - 1);
  }

  /**
   * ELU derivative
   * f'(x) = 1 if x > 0, else f(x) + alpha
   */
  static eluDerivative(x: number, alpha: number = 1.0): number {
    return x > 0 ? 1 : this.elu(x, alpha) + alpha;
  }

  /**
   * Tanh (Hyperbolic Tangent)
   * f(x) = tanh(x) = (e^x - e^(-x)) / (e^x + e^(-x))
   */
  static tanh(x: number): number {
    return Math.tanh(x);
  }

  /**
   * Tanh derivative
   * f'(x) = 1 - tanh²(x)
   */
  static tanhDerivative(x: number): number {
    const t = Math.tanh(x);
    return 1 - t * t;
  }

  /**
   * Sigmoid (Logistic function)
   * f(x) = 1 / (1 + e^(-x))
   */
  static sigmoid(x: number): number {
    // Numerically stable sigmoid
    if (x >= 0) {
      const z = Math.exp(-x);
      return 1 / (1 + z);
    } else {
      const z = Math.exp(x);
      return z / (1 + z);
    }
  }

  /**
   * Sigmoid derivative
   * f'(x) = f(x) * (1 - f(x))
   */
  static sigmoidDerivative(x: number): number {
    const s = this.sigmoid(x);
    return s * (1 - s);
  }

  /**
   * Linear activation (identity)
   * f(x) = x
   */
  static linear(x: number): number {
    return x;
  }

  /**
   * Linear derivative
   * f'(x) = 1
   */
  static linearDerivative(x: number): number {
    return 1;
  }

  /**
   * Apply activation function by type
   */
  static apply(x: number, type: ActivationType): number {
    switch (type) {
      case 'relu':
        return this.relu(x);
      case 'leaky_relu':
        return this.leakyRelu(x);
      case 'elu':
        return this.elu(x);
      case 'tanh':
        return this.tanh(x);
      case 'sigmoid':
        return this.sigmoid(x);
      case 'linear':
      default:
        return this.linear(x);
    }
  }

  /**
   * Apply activation derivative by type
   */
  static applyDerivative(x: number, type: ActivationType): number {
    switch (type) {
      case 'relu':
        return this.reluDerivative(x);
      case 'leaky_relu':
        return this.leakyReluDerivative(x);
      case 'elu':
        return this.eluDerivative(x);
      case 'tanh':
        return this.tanhDerivative(x);
      case 'sigmoid':
        return this.sigmoidDerivative(x);
      case 'linear':
      default:
        return this.linearDerivative(x);
    }
  }

  /**
   * Apply activation function to array
   */
  static applyToArray(arr: number[], type: ActivationType): number[] {
    return arr.map(x => this.apply(x, type));
  }

  /**
   * Apply activation derivative to array
   */
  static applyDerivativeToArray(arr: number[], type: ActivationType): number[] {
    return arr.map(x => this.applyDerivative(x, type));
  }
}
