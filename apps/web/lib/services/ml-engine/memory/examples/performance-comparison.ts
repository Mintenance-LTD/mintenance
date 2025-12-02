/**
 * Performance Comparison: Simplified vs Proper Backpropagation
 *
 * Compares the error reduction and convergence speed of:
 * 1. Simplified gradient descent (legacy)
 * 2. Proper backpropagation
 * 3. Proper backpropagation + momentum
 */

import { MLPBackpropagation, type BackpropConfig } from '../MLPBackpropagation';

interface ComparisonResult {
  method: string;
  finalLoss: number;
  trainingTime: number;
  errorReduction: number;
  convergenceEpochs: number;
}

// ANSI colors
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

function simplifiedUpdate(
  weights: number[][][],
  biases: number[][],
  inputs: number[][],
  targets: number[][],
  learningRate: number
): { weights: number[][][]; biases: number[][] } {
  // Simplified: Only update output layer biases
  const newWeights = weights.map(w => w.map(row => [...row]));
  const newBiases = biases.map(b => [...b]);

  // Accumulate errors
  const errors = new Array(biases[biases.length - 1].length).fill(0);
  for (let i = 0; i < inputs.length; i++) {
    const forward = MLPBackpropagation.forward(inputs[i], weights, biases, 'relu');
    for (let j = 0; j < forward.output.length; j++) {
      errors[j] += (forward.output[j] - (targets[i][j] || 0)) * learningRate;
    }
  }

  // Update only output layer biases
  const outputLayerIdx = newBiases.length - 1;
  for (let i = 0; i < errors.length; i++) {
    newBiases[outputLayerIdx][i] -= errors[i];
  }

  return { weights: newWeights, biases: newBiases };
}

function runComparison(
  trainingData: { inputs: number[][]; targets: number[][] },
  architecture: number[],
  maxEpochs: number = 500
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  // 1. Simplified gradient descent
  {
    const startTime = Date.now();
    let { weights, biases } = initializeWeights(architecture);

    let initialLoss = 0;
    let finalLoss = 0;
    let convergenceEpoch = maxEpochs;
    const targetLoss = 0.1;

    // Initial loss
    for (let i = 0; i < trainingData.inputs.length; i++) {
      const forward = MLPBackpropagation.forward(
        trainingData.inputs[i],
        weights,
        biases,
        'relu'
      );
      const error = forward.output[0] - (trainingData.targets[i][0] || 0);
      initialLoss += error * error;
    }
    initialLoss /= trainingData.inputs.length;

    // Train
    for (let epoch = 0; epoch < maxEpochs; epoch++) {
      const result = simplifiedUpdate(
        weights,
        biases,
        trainingData.inputs,
        trainingData.targets,
        0.01
      );
      weights = result.weights;
      biases = result.biases;

      // Check loss
      let loss = 0;
      for (let i = 0; i < trainingData.inputs.length; i++) {
        const forward = MLPBackpropagation.forward(
          trainingData.inputs[i],
          weights,
          biases,
          'relu'
        );
        const error = forward.output[0] - (trainingData.targets[i][0] || 0);
        loss += error * error;
      }
      loss /= trainingData.inputs.length;

      if (loss < targetLoss && convergenceEpoch === maxEpochs) {
        convergenceEpoch = epoch;
      }

      if (epoch === maxEpochs - 1) {
        finalLoss = loss;
      }
    }

    const trainingTime = Date.now() - startTime;
    const errorReduction = ((initialLoss - finalLoss) / initialLoss) * 100;

    results.push({
      method: 'Simplified Gradient Descent',
      finalLoss,
      trainingTime,
      errorReduction,
      convergenceEpochs: convergenceEpoch,
    });
  }

  // 2. Proper backpropagation
  {
    const startTime = Date.now();
    let { weights, biases } = initializeWeights(architecture);

    const config: BackpropConfig = {
      learningRate: 0.01,
      gradientClipMax: 5.0,
      useMomentum: false,
    };

    let initialLoss = 0;
    let finalLoss = 0;
    let convergenceEpoch = maxEpochs;
    const targetLoss = 0.1;

    // Initial loss
    for (let i = 0; i < trainingData.inputs.length; i++) {
      const forward = MLPBackpropagation.forward(
        trainingData.inputs[i],
        weights,
        biases,
        'relu'
      );
      const error = forward.output[0] - (trainingData.targets[i][0] || 0);
      initialLoss += error * error / 2;
    }
    initialLoss /= trainingData.inputs.length;

    // Train
    for (let epoch = 0; epoch < maxEpochs; epoch++) {
      let loss = 0;

      for (let i = 0; i < trainingData.inputs.length; i++) {
        const result = MLPBackpropagation.trainStep(
          trainingData.inputs[i],
          trainingData.targets[i],
          weights,
          biases,
          config,
          'relu'
        );
        weights = result.weights;
        biases = result.biases;
        loss += result.loss;
      }

      loss /= trainingData.inputs.length;

      if (loss < targetLoss && convergenceEpoch === maxEpochs) {
        convergenceEpoch = epoch;
      }

      if (epoch === maxEpochs - 1) {
        finalLoss = loss;
      }
    }

    const trainingTime = Date.now() - startTime;
    const errorReduction = ((initialLoss - finalLoss) / initialLoss) * 100;

    results.push({
      method: 'Proper Backpropagation',
      finalLoss,
      trainingTime,
      errorReduction,
      convergenceEpochs: convergenceEpoch,
    });
  }

  // 3. Proper backpropagation + momentum
  {
    const startTime = Date.now();
    let { weights, biases } = initializeWeights(architecture);

    const config: BackpropConfig = {
      learningRate: 0.01,
      gradientClipMax: 5.0,
      useMomentum: true,
      momentumBeta: 0.9,
    };

    let initialLoss = 0;
    let finalLoss = 0;
    let convergenceEpoch = maxEpochs;
    const targetLoss = 0.1;
    let momentum;

    // Initial loss
    for (let i = 0; i < trainingData.inputs.length; i++) {
      const forward = MLPBackpropagation.forward(
        trainingData.inputs[i],
        weights,
        biases,
        'relu'
      );
      const error = forward.output[0] - (trainingData.targets[i][0] || 0);
      initialLoss += error * error / 2;
    }
    initialLoss /= trainingData.inputs.length;

    // Train
    for (let epoch = 0; epoch < maxEpochs; epoch++) {
      let loss = 0;

      for (let i = 0; i < trainingData.inputs.length; i++) {
        const result = MLPBackpropagation.trainStep(
          trainingData.inputs[i],
          trainingData.targets[i],
          weights,
          biases,
          config,
          'relu',
          momentum
        );
        weights = result.weights;
        biases = result.biases;
        momentum = result.momentumState;
        loss += result.loss;
      }

      loss /= trainingData.inputs.length;

      if (loss < targetLoss && convergenceEpoch === maxEpochs) {
        convergenceEpoch = epoch;
      }

      if (epoch === maxEpochs - 1) {
        finalLoss = loss;
      }
    }

    const trainingTime = Date.now() - startTime;
    const errorReduction = ((initialLoss - finalLoss) / initialLoss) * 100;

    results.push({
      method: 'Backpropagation + Momentum',
      finalLoss,
      trainingTime,
      errorReduction,
      convergenceEpochs: convergenceEpoch,
    });
  }

  return results;
}

function main() {
  log('\n' + '█'.repeat(60), 'bright');
  log('PERFORMANCE COMPARISON', 'cyan');
  log('Simplified vs Proper Backpropagation', 'cyan');
  log('█'.repeat(60) + '\n', 'bright');

  // Test dataset: Simple non-linear function
  const trainingData = {
    inputs: [
      [0.1, 0.2],
      [0.3, 0.4],
      [0.5, 0.6],
      [0.7, 0.8],
      [0.9, 1.0],
    ],
    targets: [
      [0.15],
      [0.35],
      [0.55],
      [0.75],
      [0.95],
    ],
  };

  log('Dataset:', 'yellow');
  log(`- Training samples: ${trainingData.inputs.length}`, 'blue');
  log(`- Input dimensions: ${trainingData.inputs[0].length}`, 'blue');
  log(`- Output dimensions: ${trainingData.targets[0].length}`, 'blue');
  log(`- Architecture: 2-4-1 (2 inputs, 4 hidden, 1 output)\n`, 'blue');

  log('Running comparison (500 epochs)...', 'yellow');
  const results = runComparison(trainingData, [2, 4, 1], 500);

  log('\n' + '─'.repeat(60), 'bright');
  log('RESULTS', 'cyan');
  log('─'.repeat(60) + '\n', 'bright');

  results.forEach((result, idx) => {
    log(`${idx + 1}. ${result.method}`, 'bright');
    log(`   Final Loss:        ${result.finalLoss.toFixed(6)}`, 'green');
    log(`   Training Time:     ${result.trainingTime}ms`, 'green');
    log(`   Error Reduction:   ${result.errorReduction.toFixed(1)}%`, 'green');
    log(
      `   Converged at:      Epoch ${result.convergenceEpochs}`,
      result.convergenceEpochs < 500 ? 'green' : 'yellow'
    );
    log('');
  });

  // Calculate improvements
  const baseline = results[0];
  log('─'.repeat(60), 'bright');
  log('IMPROVEMENTS OVER SIMPLIFIED', 'cyan');
  log('─'.repeat(60) + '\n', 'bright');

  for (let i = 1; i < results.length; i++) {
    const improvement = results[i];
    const lossImprovement =
      ((baseline.finalLoss - improvement.finalLoss) / baseline.finalLoss) * 100;
    const speedup =
      baseline.convergenceEpochs / improvement.convergenceEpochs;

    log(`${improvement.method}:`, 'bright');
    log(`   Loss reduction:    ${lossImprovement.toFixed(1)}% better`, lossImprovement > 0 ? 'green' : 'red');
    log(`   Convergence speed: ${speedup.toFixed(2)}x faster`, speedup > 1 ? 'green' : 'red');
    log(`   Time overhead:     ${improvement.trainingTime - baseline.trainingTime}ms`, 'yellow');
    log('');
  }

  log('─'.repeat(60), 'bright');
  log('CONCLUSION', 'cyan');
  log('─'.repeat(60) + '\n', 'bright');

  const bestMethod = results.reduce((best, current) =>
    current.finalLoss < best.finalLoss ? current : best
  );

  log(`Best method: ${bestMethod.method}`, 'green');
  log(`Recommendation: Use proper backpropagation with momentum`, 'green');
  log(`Trade-off: ~${results[2].trainingTime - baseline.trainingTime}ms extra for ${results[2].errorReduction.toFixed(0)}% better accuracy\n`, 'yellow');

  log('█'.repeat(60), 'bright');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runComparison };
