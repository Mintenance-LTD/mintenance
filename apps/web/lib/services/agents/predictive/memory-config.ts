import type { ContinuumMemoryConfig } from '../../ml-engine/memory/types';

/**
 * Build the 3-level continuum-memory config used by PredictiveAgent.
 *
 * Extracted from PredictiveAgent.ts on 2026-05-09.
 *
 * Level 0 (high-frequency):  current job context, updates every prediction
 * Level 1 (mid-frequency):   recent 10 jobs pattern, updates every 10
 * Level 2 (low-frequency):   long-term contractor history, weekly updates
 *
 * Output dimensions: 4 risk types — [no-show, dispute, delay, quality].
 */
export function buildPredictiveMemoryConfig(
  agentName: string
): ContinuumMemoryConfig {
  return {
    agentName,
    defaultChunkSize: 10,
    defaultLearningRate: 0.001,
    levels: [
      {
        level: 0,
        frequency: 1,
        chunkSize: 10,
        learningRate: 0.01,
        mlpConfig: {
          inputSize: 24,
          hiddenSizes: [64, 32],
          outputSize: 4,
          activation: 'relu',
        },
      },
      {
        level: 1,
        frequency: 10,
        chunkSize: 100,
        learningRate: 0.005,
        mlpConfig: {
          inputSize: 24,
          hiddenSizes: [128, 64],
          outputSize: 4,
          activation: 'relu',
        },
      },
      {
        level: 2,
        frequency: 1000000,
        chunkSize: 1000,
        learningRate: 0.001,
        mlpConfig: {
          inputSize: 24,
          hiddenSizes: [256, 128, 64],
          outputSize: 4,
          activation: 'relu',
        },
      },
    ],
  };
}
