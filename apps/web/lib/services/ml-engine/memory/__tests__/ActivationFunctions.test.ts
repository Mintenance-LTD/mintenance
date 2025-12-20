/**
 * Tests for Activation Functions
 */

import { ActivationFunctions } from '../ActivationFunctions';

describe('ActivationFunctions', () => {
  describe('ReLU', () => {
    it('should return 0 for negative inputs', () => {
      expect(ActivationFunctions.relu(-5)).toBe(0);
      expect(ActivationFunctions.relu(-0.1)).toBe(0);
    });

    it('should return input for positive inputs', () => {
      expect(ActivationFunctions.relu(5)).toBe(5);
      expect(ActivationFunctions.relu(0.1)).toBe(0.1);
    });

    it('should return 0 for zero input', () => {
      expect(ActivationFunctions.relu(0)).toBe(0);
    });

    it('should compute correct derivative', () => {
      expect(ActivationFunctions.reluDerivative(5)).toBe(1);
      expect(ActivationFunctions.reluDerivative(-5)).toBe(0);
      expect(ActivationFunctions.reluDerivative(0)).toBe(0);
    });
  });

  describe('Leaky ReLU', () => {
    it('should apply slope to negative inputs', () => {
      expect(ActivationFunctions.leakyRelu(-10, 0.01)).toBe(-0.1);
      expect(ActivationFunctions.leakyRelu(-5, 0.1)).toBe(-0.5);
    });

    it('should return input for positive inputs', () => {
      expect(ActivationFunctions.leakyRelu(5, 0.01)).toBe(5);
    });

    it('should compute correct derivative', () => {
      expect(ActivationFunctions.leakyReluDerivative(5, 0.01)).toBe(1);
      expect(ActivationFunctions.leakyReluDerivative(-5, 0.01)).toBe(0.01);
    });
  });

  describe('Tanh', () => {
    it('should return values between -1 and 1', () => {
      expect(ActivationFunctions.tanh(0)).toBe(0);
      expect(Math.abs(ActivationFunctions.tanh(100))).toBeCloseTo(1, 5);
      expect(Math.abs(ActivationFunctions.tanh(-100))).toBeCloseTo(1, 5);
    });

    it('should compute correct derivative', () => {
      const x = 0.5;
      const tanhX = ActivationFunctions.tanh(x);
      const expected = 1 - tanhX * tanhX;
      expect(ActivationFunctions.tanhDerivative(x)).toBeCloseTo(expected, 10);
    });

    it('should have derivative of 1 at zero', () => {
      expect(ActivationFunctions.tanhDerivative(0)).toBeCloseTo(1, 10);
    });
  });

  describe('Sigmoid', () => {
    it('should return values between 0 and 1', () => {
      expect(ActivationFunctions.sigmoid(0)).toBe(0.5);
      expect(ActivationFunctions.sigmoid(100)).toBeCloseTo(1, 5);
      expect(ActivationFunctions.sigmoid(-100)).toBeCloseTo(0, 5);
    });

    it('should be numerically stable for large values', () => {
      expect(ActivationFunctions.sigmoid(1000)).toBe(1);
      expect(ActivationFunctions.sigmoid(-1000)).toBe(0);
    });

    it('should compute correct derivative', () => {
      const x = 0.5;
      const sigX = ActivationFunctions.sigmoid(x);
      const expected = sigX * (1 - sigX);
      expect(ActivationFunctions.sigmoidDerivative(x)).toBeCloseTo(expected, 10);
    });

    it('should have derivative of 0.25 at zero', () => {
      expect(ActivationFunctions.sigmoidDerivative(0)).toBeCloseTo(0.25, 10);
    });
  });

  describe('Linear', () => {
    it('should return input unchanged', () => {
      expect(ActivationFunctions.linear(5)).toBe(5);
      expect(ActivationFunctions.linear(-5)).toBe(-5);
      expect(ActivationFunctions.linear(0)).toBe(0);
    });

    it('should have derivative of 1', () => {
      expect(ActivationFunctions.linearDerivative(5)).toBe(1);
      expect(ActivationFunctions.linearDerivative(-5)).toBe(1);
    });
  });

  describe('apply and applyDerivative', () => {
    it('should apply correct activation function', () => {
      expect(ActivationFunctions.apply(5, 'relu')).toBe(5);
      expect(ActivationFunctions.apply(-5, 'relu')).toBe(0);
      expect(ActivationFunctions.apply(0, 'sigmoid')).toBe(0.5);
      expect(ActivationFunctions.apply(0, 'tanh')).toBe(0);
    });

    it('should apply correct derivative', () => {
      expect(ActivationFunctions.applyDerivative(5, 'relu')).toBe(1);
      expect(ActivationFunctions.applyDerivative(-5, 'relu')).toBe(0);
      expect(ActivationFunctions.applyDerivative(0, 'linear')).toBe(1);
    });
  });

  describe('applyToArray', () => {
    it('should apply activation to all elements', () => {
      const input = [-2, -1, 0, 1, 2];
      const result = ActivationFunctions.applyToArray(input, 'relu');
      expect(result).toEqual([0, 0, 0, 1, 2]);
    });

    it('should apply derivative to all elements', () => {
      const input = [-2, -1, 0, 1, 2];
      const result = ActivationFunctions.applyDerivativeToArray(input, 'relu');
      expect(result).toEqual([0, 0, 0, 1, 1]);
    });
  });

  describe('Numerical gradient check', () => {
    const epsilon = 1e-5;

    it('should match numerical gradient for ReLU', () => {
      const x = 0.5;
      const numerical = (ActivationFunctions.relu(x + epsilon) - ActivationFunctions.relu(x - epsilon)) / (2 * epsilon);
      const analytical = ActivationFunctions.reluDerivative(x);
      expect(analytical).toBeCloseTo(numerical, 3);
    });

    it('should match numerical gradient for Tanh', () => {
      const x = 0.5;
      const numerical = (ActivationFunctions.tanh(x + epsilon) - ActivationFunctions.tanh(x - epsilon)) / (2 * epsilon);
      const analytical = ActivationFunctions.tanhDerivative(x);
      expect(analytical).toBeCloseTo(numerical, 3);
    });

    it('should match numerical gradient for Sigmoid', () => {
      const x = 0.5;
      const numerical = (ActivationFunctions.sigmoid(x + epsilon) - ActivationFunctions.sigmoid(x - epsilon)) / (2 * epsilon);
      const analytical = ActivationFunctions.sigmoidDerivative(x);
      expect(analytical).toBeCloseTo(numerical, 3);
    });
  });
});
