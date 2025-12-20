/**
 * Building Surveyor Initialization Service
 * 
 * Handles initialization of the building surveyor service dependencies:
 * - Adaptive Update Engine
 * - Learned Feature Extractor
 * - Continuum Memory System
 */

import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from '../../agents/AdaptiveUpdateEngine';
import { LearnedFeatureExtractor } from '../LearnedFeatureExtractor';
import type { ContinuumMemoryConfig } from '../../ml-engine/memory/types';

const AGENT_NAME = 'building-surveyor';

interface InitializationState {
  memorySystemInitialized: boolean;
  adaptiveEngine: AdaptiveUpdateEngine | null;
  learnedFeatureExtractor: LearnedFeatureExtractor | null;
  useLearnedFeatures: boolean;
}

const state: InitializationState = {
  memorySystemInitialized: false,
  adaptiveEngine: null,
  learnedFeatureExtractor: null,
  useLearnedFeatures: process.env.USE_LEARNED_FEATURES === 'true' || false,
};

/**
 * Initialize adaptive update engine
 */
async function initializeAdaptiveEngine(): Promise<void> {
  if (!state.adaptiveEngine) {
    state.adaptiveEngine = new AdaptiveUpdateEngine({
      agentName: AGENT_NAME,
    });
  }
}

/**
 * Initialize learned feature extractor
 */
async function initializeLearnedFeatureExtractor(): Promise<void> {
  if (state.learnedFeatureExtractor || !state.useLearnedFeatures) return;

  try {
    state.learnedFeatureExtractor = new LearnedFeatureExtractor(
      AGENT_NAME,
      {
        inputDim: 50,  // Raw input dimension (will be padded/truncated)
        outputDim: 40, // Fixed output dimension (matches handcrafted features)
        hiddenDims: [64, 48],
        learningRate: 0.001,
        regularization: 0.0001,
      }
    );

    await state.learnedFeatureExtractor.loadState();

    logger.info('Learned feature extractor initialized', {
      service: 'BuildingSurveyorInitializationService',
      agentName: AGENT_NAME,
    });
  } catch (error) {
    logger.error('Failed to initialize learned feature extractor', error, {
      service: 'BuildingSurveyorInitializationService',
    });
    // Fallback to handcrafted features
    state.useLearnedFeatures = false;
  }
}

/**
 * Initialize continuum memory system for building surveyor
 */
export async function initializeMemorySystem(): Promise<void> {
  if (state.memorySystemInitialized) return;

  await initializeAdaptiveEngine();
  await initializeLearnedFeatureExtractor();

  try {
    const config: ContinuumMemoryConfig = {
      agentName: AGENT_NAME,
      defaultChunkSize: 10,
      defaultLearningRate: 0.001,
      levels: [
        {
          level: 0,
          frequency: 1, // Updates every assessment
          chunkSize: 10,
          learningRate: 0.01,
          mlpConfig: {
            inputSize: 40,
            hiddenSizes: [64, 32],
            outputSize: 5, // [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
            activation: 'relu',
          },
        },
        {
          level: 1,
          frequency: 16, // Updates daily (assuming ~16 assessments/day)
          chunkSize: 100,
          learningRate: 0.005,
          mlpConfig: {
            inputSize: 40,
            hiddenSizes: [128, 64],
            outputSize: 5,
            activation: 'relu',
          },
        },
        {
          level: 2,
          frequency: 1000000, // Updates weekly (low frequency)
          chunkSize: 1000,
          learningRate: 0.001,
          mlpConfig: {
            inputSize: 40,
            hiddenSizes: [256, 128, 64],
            outputSize: 5,
            activation: 'relu',
          },
        },
      ],
    };

    const memorySystem = await memoryManager.getOrCreateMemorySystem(config);
    
    // Enable Titans for self-modification
    const useTitans = process.env.USE_TITANS === 'true' || false;
    if (useTitans) {
      memorySystem.enableTitans(true);
      logger.info('Titans enabled for building surveyor', {
        agentName: AGENT_NAME,
      });
    }
    
    state.memorySystemInitialized = true;

    logger.info('BuildingSurveyorService memory system initialized', {
      agentName: AGENT_NAME,
      levels: config.levels.length,
      useLearnedFeatures: state.useLearnedFeatures,
      useTitans,
    });
  } catch (error) {
    logger.error('Failed to initialize memory system', error, {
      service: 'BuildingSurveyorInitializationService',
    });
    // Continue with fallback behavior
  }
}

/**
 * Trigger self-modification when accuracy drops
 */
export async function triggerSelfModification(accuracyDrop: number): Promise<void> {
  await initializeAdaptiveEngine();

  logger.info('BuildingSurveyorService self-modification triggered', {
    agentName: AGENT_NAME,
    accuracyDrop,
  });

  if (state.adaptiveEngine) {
    await state.adaptiveEngine.recordPerformance(1 - accuracyDrop);
  }
}

/**
 * Get learned feature extractor instance
 */
export function getLearnedFeatureExtractor(): LearnedFeatureExtractor | null {
  return state.learnedFeatureExtractor;
}

/**
 * Check if learned features are enabled
 */
export function isLearnedFeaturesEnabled(): boolean {
  return state.useLearnedFeatures;
}

