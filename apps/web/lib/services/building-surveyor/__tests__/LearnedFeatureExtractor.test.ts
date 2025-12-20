/**
 * Unit tests for LearnedFeatureExtractor
 */

import { LearnedFeatureExtractor } from '../LearnedFeatureExtractor';
import type { RoboflowDetection, VisionAnalysisSummary } from '../types';

describe('LearnedFeatureExtractor', () => {
  const agentName = 'test-building-surveyor';
  const config = {
    inputDim: 30,
    outputDim: 40,
    hiddenDims: [64, 48],
    learningRate: 0.001,
    regularization: 0.0001,
  };

  const mockRoboflowDetections: RoboflowDetection[] = [
    {
      id: '1',
      className: 'crack',
      confidence: 85,
      boundingBox: { x: 100, y: 100, width: 50, height: 50 },
      imageUrl: 'https://example.com/image1.jpg',
    },
    {
      id: '2',
      className: 'mold',
      confidence: 90,
      boundingBox: { x: 200, y: 200, width: 30, height: 30 },
      imageUrl: 'https://example.com/image2.jpg',
    },
  ];

  const mockVisionSummary: VisionAnalysisSummary = {
    provider: 'google-vision',
    confidence: 85,
    labels: [
      { description: 'water damage', score: 0.9 },
      { description: 'structural issue', score: 0.8 },
    ],
    objects: [
      { name: 'crack', score: 0.85, boundingBox: { x: 100, y: 100, width: 50, height: 50 } },
    ],
    detectedFeatures: ['water_damage', 'structural_crack', 'mold'],
    suggestedCategories: ['structural', 'environmental'],
    propertyType: 'residential',
    condition: 'poor',
    complexity: 'moderate',
  };

  describe('initialization', () => {
    it('should initialize with correct dimensions', () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const state = extractor.getState();

      expect(state.weights).toHaveLength(3); // input -> hidden1 -> hidden2 -> output
      expect(state.weights[0].length).toBe(config.hiddenDims[0]); // First hidden layer
      expect(state.weights[0][0].length).toBe(config.inputDim);
      expect(state.biases).toHaveLength(3);
      expect(state.updateCount).toBe(0);
    });

    it('should initialize weights with reasonable values', () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const state = extractor.getState();

      // Check that weights are initialized (not all zeros)
      const hasNonZero = state.weights[0].some(row => 
        row.some(val => val !== 0)
      );
      expect(hasNonZero).toBe(true);

      // Check that weights are in reasonable range (Xavier init)
      const allReasonable = state.weights[0].every(row =>
        row.every(val => Math.abs(val) < 2.0)
      );
      expect(allReasonable).toBe(true);
    });
  });

  describe('feature extraction', () => {
    it('should extract features with correct dimensions', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];

      const features = await extractor.extractFeatures(
        imageUrls,
        { propertyType: 'residential', ageOfProperty: 50 },
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(features).toHaveLength(config.outputDim);
      expect(features.every(val => typeof val === 'number')).toBe(true);
      expect(features.every(val => isFinite(val))).toBe(true);
    });

    it('should handle missing detections', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];

      const features = await extractor.extractFeatures(
        imageUrls,
        { propertyType: 'residential' },
        undefined,
        null
      );

      expect(features).toHaveLength(config.outputDim);
      expect(features.every(val => isFinite(val))).toBe(true);
    });

    it('should handle missing vision summary', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];

      const features = await extractor.extractFeatures(
        imageUrls,
        { propertyType: 'commercial' },
        mockRoboflowDetections,
        null
      );

      expect(features).toHaveLength(config.outputDim);
    });

    it('should produce consistent features for same input', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const, ageOfProperty: 50 };

      const features1 = await extractor.extractFeatures(
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      const features2 = await extractor.extractFeatures(
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      // Should be identical (deterministic)
      expect(features1).toEqual(features2);
    });

    it('should handle multiple images', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const features = await extractor.extractFeatures(
        imageUrls,
        { propertyType: 'residential' },
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(features).toHaveLength(config.outputDim);
    });
  });

  describe('learning from surprise', () => {
    it('should update weights based on surprise signal', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const };

      // Get initial features
      const initialFeatures = await extractor.extractFeatures(
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      const stateBefore = extractor.getState();
      const weightsBefore = JSON.parse(JSON.stringify(stateBefore.weights));

      // Learn from surprise signal (target features)
      const surpriseSignal = initialFeatures.map(f => f + 0.1); // Slight modification
      
      // Build raw input for learning
      const rawInput = extractor['buildRawInput'](
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      await extractor.learnFromSurprise(rawInput, surpriseSignal);

      const stateAfter = extractor.getState();
      expect(stateAfter.updateCount).toBe(1);

      // Weights should have changed
      const weightsChanged = 
        JSON.stringify(stateAfter.weights) !== JSON.stringify(weightsBefore);
      expect(weightsChanged).toBe(true);
    });

    it('should track cumulative error', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const };

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      const surpriseSignal1 = new Array(config.outputDim).fill(0.5);
      const surpriseSignal2 = new Array(config.outputDim).fill(0.7);

      await extractor.learnFromSurprise(rawInput, surpriseSignal1);
      await extractor.learnFromSurprise(rawInput, surpriseSignal2);

      const avgError = extractor.getAverageError();
      expect(avgError).toBeGreaterThan(0);
      expect(isFinite(avgError)).toBe(true);
    });

    it('should handle multiple learning updates', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const };

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      for (let i = 0; i < 5; i++) {
        const surpriseSignal = new Array(config.outputDim).fill(i / 10);
        await extractor.learnFromSurprise(rawInput, surpriseSignal);
      }

      const state = extractor.getState();
      expect(state.updateCount).toBe(5);
    });

    it('should handle different learning rates', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const };

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );

      const stateBefore = extractor.getState();
      const weightsBefore = JSON.parse(JSON.stringify(stateBefore.weights));

      const surpriseSignal = new Array(config.outputDim).fill(0.8);

      // Learn with custom learning rate
      await extractor.learnFromSurprise(rawInput, surpriseSignal, 0.01);

      const stateAfter = extractor.getState();
      const weightsAfter = stateAfter.weights;

      // With higher learning rate, changes should be more pronounced
      const maxChange = Math.max(
        ...weightsAfter[0].flat().map((val, idx) => 
          Math.abs(val - weightsBefore[0].flat()[idx])
        )
      );
      expect(maxChange).toBeGreaterThan(0);
    });
  });

  describe('raw input building', () => {
    it('should build raw input with correct dimensions', () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        { propertyType: 'residential', ageOfProperty: 50 },
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(rawInput).toHaveLength(config.inputDim);
      expect(rawInput.every(val => typeof val === 'number')).toBe(true);
    });

    it('should pad input if too short', () => {
      const extractor = new LearnedFeatureExtractor(agentName, {
        ...config,
        inputDim: 100, // Larger than what we'll provide
      });
      const imageUrls = ['https://example.com/image1.jpg'];

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        { propertyType: 'residential' },
        [],
        null
      );

      expect(rawInput).toHaveLength(100);
    });

    it('should truncate input if too long', () => {
      const extractor = new LearnedFeatureExtractor(agentName, {
        ...config,
        inputDim: 5, // Smaller than what we'll provide
      });
      const imageUrls = ['https://example.com/image1.jpg'];

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        { propertyType: 'residential' },
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(rawInput).toHaveLength(5);
    });
  });

  describe('state management', () => {
    it('should return immutable state', () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const state1 = extractor.getState();
      const state2 = extractor.getState();

      // Should return new objects
      expect(state1).not.toBe(state2);
      
      // But content should be same
      expect(JSON.stringify(state1.weights)).toBe(
        JSON.stringify(state2.weights)
      );
    });

    it('should track update count correctly', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = ['https://example.com/image1.jpg'];
      const context = { propertyType: 'residential' as const };

      const rawInput = extractor['buildRawInput'](
        imageUrls,
        context,
        mockRoboflowDetections,
        mockVisionSummary
      );
      const surpriseSignal = new Array(config.outputDim).fill(0.5);

      expect(extractor.getState().updateCount).toBe(0);

      await extractor.learnFromSurprise(rawInput, surpriseSignal);
      expect(extractor.getState().updateCount).toBe(1);

      await extractor.learnFromSurprise(rawInput, surpriseSignal);
      expect(extractor.getState().updateCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty image URLs', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);

      const features = await extractor.extractFeatures(
        [],
        { propertyType: 'residential' },
        undefined,
        null
      );

      expect(features).toHaveLength(config.outputDim);
    });

    it('should handle missing context', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);

      const features = await extractor.extractFeatures(
        ['https://example.com/image1.jpg'],
        undefined,
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(features).toHaveLength(config.outputDim);
    });

    it('should handle extreme input values', async () => {
      const extractor = new LearnedFeatureExtractor(agentName, config);
      const imageUrls = Array(100).fill('https://example.com/image.jpg');

      const features = await extractor.extractFeatures(
        imageUrls,
        { propertyType: 'residential', ageOfProperty: 1000 },
        mockRoboflowDetections,
        mockVisionSummary
      );

      expect(features).toHaveLength(config.outputDim);
      expect(features.every(val => isFinite(val))).toBe(true);
    });
  });
});

