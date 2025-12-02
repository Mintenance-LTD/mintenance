/**
 * Backpropagation Demo
 *
 * Demonstrates the MLP backpropagation implementation with various examples
 */

import { MLPBackpropagation, type BackpropConfig } from '../MLPBackpropagation';
import { ActivationFunctions } from '../ActivationFunctions';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title: string) {
  log('\n' + '='.repeat(60), 'bright');
  log(title.toUpperCase(), 'cyan');
  log('='.repeat(60) + '\n', 'bright');
}

// Helper to initialize random weights
function initializeWeights(architecture: number[]): {
  weights: number[][][];
  biases: number[][];
} {
  const weights: number[][][] = [];
  const biases: number[][] = [];

  for (let i = 0; i < architecture.length - 1; i++) {
    const inputSize = architecture[i];
    const outputSize = architecture[i + 1];
    const limit = Math.sqrt(6.0 / (inputSize + outputSize));

    const layerWeights: number[][] = [];
    for (let j = 0; j < outputSize; j++) {
      const row: number[] = [];
      for (let k = 0; k < inputSize; k++) {
        row.push((Math.random() * 2 - 1) * limit);
      }
      layerWeights.push(row);
    }
    weights.push(layerWeights);
    biases.push(new Array(outputSize).fill(0));
  }

  return { weights, biases };
}

// Demo 1: Simple Linear Regression
function demo1LinearRegression() {
  header('Demo 1: Linear Regression');

  log('Learning a simple linear function: y = 2x + 1', 'blue');

  // Single layer network: 1 input -> 1 output
  let { weights, biases } = initializeWeights([1, 1]);

  const config: BackpropConfig = {
    learningRate: 0.01,
    gradientClipMax: 5.0,
  };

  // Training data
  const trainingData = [
    { input: [0], target: [1] },
    { input: [1], target: [3] },
    { input: [2], target: [5] },
    { input: [3], target: [7] },
  ];

  log('\nTraining for 100 epochs...', 'yellow');

  for (let epoch = 0; epoch < 100; epoch++) {
    let totalLoss = 0;

    for (const { input, target } of trainingData) {
      const result = MLPBackpropagation.trainStep(
        input,
        target,
        weights,
        biases,
        config,
        'linear'
      );
      weights = result.weights;
      biases = result.biases;
      totalLoss += result.loss;
    }

    if (epoch % 20 === 0) {
      log(`Epoch ${epoch}: Loss = ${(totalLoss / trainingData.length).toFixed(6)}`, 'green');
    }
  }

  log('\nLearned parameters:', 'yellow');
  log(`Weight: ${weights[0][0][0].toFixed(4)} (expected: ~2.0)`, 'green');
  log(`Bias: ${biases[0][0].toFixed(4)} (expected: ~1.0)`, 'green');

  log('\nTest predictions:', 'yellow');
  for (let x = 0; x <= 5; x++) {
    const result = MLPBackpropagation.forward([x], weights, biases, 'linear');
    log(`f(${x}) = ${result.output[0].toFixed(2)} (expected: ${2 * x + 1})`, 'green');
  }
}

// Demo 2: XOR Problem
function demo2XOR() {
  header('Demo 2: XOR Problem (Non-linear)');

  log('Learning XOR function - requires hidden layer', 'blue');
  log('Architecture: 2 inputs -> 4 hidden -> 1 output', 'blue');

  // 2-4-1 architecture
  let { weights, biases } = initializeWeights([2, 4, 1]);

  const config: BackpropConfig = {
    learningRate: 0.1,
    gradientClipMax: 5.0,
    useMomentum: true,
    momentumBeta: 0.9,
  };

  const trainingData = [
    { input: [0, 0], target: [0], label: '0 XOR 0 = 0' },
    { input: [0, 1], target: [1], label: '0 XOR 1 = 1' },
    { input: [1, 0], target: [1], label: '1 XOR 0 = 1' },
    { input: [1, 1], target: [0], label: '1 XOR 1 = 0' },
  ];

  log('\nTraining for 2000 epochs with momentum...', 'yellow');

  let momentum;
  for (let epoch = 0; epoch < 2000; epoch++) {
    let totalLoss = 0;

    for (const { input, target } of trainingData) {
      const result = MLPBackpropagation.trainStep(
        input,
        target,
        weights,
        biases,
        config,
        'tanh',
        momentum
      );
      weights = result.weights;
      biases = result.biases;
      momentum = result.momentumState;
      totalLoss += result.loss;
    }

    if (epoch % 400 === 0) {
      log(`Epoch ${epoch}: Loss = ${(totalLoss / trainingData.length).toFixed(6)}`, 'green');
    }
  }

  log('\nTest predictions:', 'yellow');
  for (const { input, target, label } of trainingData) {
    const result = MLPBackpropagation.forward(input, weights, biases, 'tanh');
    const predicted = result.output[0];
    const expected = target[0];
    const error = Math.abs(predicted - expected);
    const status = error < 0.3 ? '✓' : '✗';
    log(
      `${status} ${label}: predicted = ${predicted.toFixed(3)}, expected = ${expected}`,
      error < 0.3 ? 'green' : 'red'
    );
  }
}

// Demo 3: Activation Functions Comparison
function demo3ActivationComparison() {
  header('Demo 3: Activation Functions Comparison');

  log('Comparing different activation functions on simple task', 'blue');

  const activations = ['relu', 'tanh', 'sigmoid'] as const;
  const trainingData = [
    { input: [0.5, 0.5], target: [0.8] },
    { input: [0.2, 0.8], target: [0.6] },
    { input: [0.9, 0.1], target: [0.4] },
  ];

  for (const activation of activations) {
    log(`\nTesting ${activation.toUpperCase()}:`, 'yellow');

    let { weights, biases } = initializeWeights([2, 3, 1]);

    const config: BackpropConfig = {
      learningRate: 0.1,
      gradientClipMax: 5.0,
    };

    // Train for 500 epochs
    for (let epoch = 0; epoch < 500; epoch++) {
      for (const { input, target } of trainingData) {
        const result = MLPBackpropagation.trainStep(
          input,
          target,
          weights,
          biases,
          config,
          activation
        );
        weights = result.weights;
        biases = result.biases;
      }
    }

    // Test
    let totalError = 0;
    for (const { input, target } of trainingData) {
      const result = MLPBackpropagation.forward(input, weights, biases, activation);
      const error = Math.abs(result.output[0] - target[0]);
      totalError += error;
    }

    log(`Average error: ${(totalError / trainingData.length).toFixed(4)}`, 'green');
  }
}

// Demo 4: Gradient Clipping
function demo4GradientClipping() {
  header('Demo 4: Gradient Clipping');

  log('Demonstrating gradient clipping with large gradients', 'blue');

  let { weights, biases } = initializeWeights([2, 1]);

  // Create scenario with potentially large gradients
  const config: BackpropConfig = {
    learningRate: 1.0, // Very large learning rate
    gradientClipMax: 1.0, // Strict clipping
  };

  const input = [10, 10]; // Large inputs
  const target = [0]; // Large error

  log('\nWithout clipping (simulation):', 'yellow');
  const resultNoClip = MLPBackpropagation.trainStep(
    input,
    target,
    weights,
    biases,
    { ...config, gradientClipMax: 1000 }, // Effectively no clipping
    'linear'
  );
  log(`Gradient norm: ${resultNoClip.gradientNorm.toFixed(2)}`, 'red');

  log('\nWith clipping (max norm = 1.0):', 'yellow');
  const resultWithClip = MLPBackpropagation.trainStep(
    input,
    target,
    weights,
    biases,
    config,
    'linear'
  );
  log(`Gradient norm: ${resultWithClip.gradientNorm.toFixed(2)}`, 'green');
  log('Gradients were clipped to prevent explosion!', 'green');
}

// Demo 5: Momentum Effect
function demo5Momentum() {
  header('Demo 5: Momentum Comparison');

  log('Comparing training with and without momentum', 'blue');

  const trainingData = [
    { input: [1, 2], target: [5] },
    { input: [2, 3], target: [8] },
    { input: [3, 4], target: [11] },
  ];

  // Without momentum
  log('\nTraining WITHOUT momentum:', 'yellow');
  let { weights: w1, biases: b1 } = initializeWeights([2, 3, 1]);
  const configNoMomentum: BackpropConfig = {
    learningRate: 0.01,
    useMomentum: false,
  };

  const lossesNoMomentum: number[] = [];
  for (let epoch = 0; epoch < 100; epoch++) {
    let totalLoss = 0;
    for (const { input, target } of trainingData) {
      const result = MLPBackpropagation.trainStep(input, target, w1, b1, configNoMomentum, 'relu');
      w1 = result.weights;
      b1 = result.biases;
      totalLoss += result.loss;
    }
    lossesNoMomentum.push(totalLoss / trainingData.length);
  }
  log(`Final loss: ${lossesNoMomentum[lossesNoMomentum.length - 1].toFixed(6)}`, 'green');

  // With momentum
  log('\nTraining WITH momentum (β = 0.9):', 'yellow');
  let { weights: w2, biases: b2 } = initializeWeights([2, 3, 1]);
  const configMomentum: BackpropConfig = {
    learningRate: 0.01,
    useMomentum: true,
    momentumBeta: 0.9,
  };

  const lossesMomentum: number[] = [];
  let momentum;
  for (let epoch = 0; epoch < 100; epoch++) {
    let totalLoss = 0;
    for (const { input, target } of trainingData) {
      const result = MLPBackpropagation.trainStep(
        input,
        target,
        w2,
        b2,
        configMomentum,
        'relu',
        momentum
      );
      w2 = result.weights;
      b2 = result.biases;
      momentum = result.momentumState;
      totalLoss += result.loss;
    }
    lossesMomentum.push(totalLoss / trainingData.length);
  }
  log(`Final loss: ${lossesMomentum[lossesMomentum.length - 1].toFixed(6)}`, 'green');

  log('\nConclusion:', 'yellow');
  const improvement =
    ((lossesNoMomentum[99] - lossesMomentum[99]) / lossesNoMomentum[99]) * 100;
  log(`Momentum improved convergence by ${improvement.toFixed(1)}%`, 'green');
}

// Main execution
async function main() {
  log('\n' + '█'.repeat(60), 'bright');
  log('MLP BACKPROPAGATION DEMONSTRATION', 'bright');
  log('█'.repeat(60) + '\n', 'bright');

  try {
    demo1LinearRegression();
    demo2XOR();
    demo3ActivationComparison();
    demo4GradientClipping();
    demo5Momentum();

    log('\n' + '█'.repeat(60), 'bright');
    log('ALL DEMOS COMPLETED SUCCESSFULLY', 'green');
    log('█'.repeat(60) + '\n', 'bright');
  } catch (error) {
    log('\nERROR:', 'red');
    console.error(error);
  }
}

// Run demos if executed directly
if (require.main === module) {
  main();
}

export { demo1LinearRegression, demo2XOR, demo3ActivationComparison, demo4GradientClipping, demo5Momentum };
