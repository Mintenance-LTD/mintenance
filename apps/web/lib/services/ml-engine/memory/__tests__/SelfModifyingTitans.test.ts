/**
 * Unit tests for SelfModifyingTitans
 */

import { SelfModifyingTitans } from '../SelfModifyingTitans';

describe('SelfModifyingTitans', () => {
  const agentName = 'test-agent';
  const config = {
    inputDim: 10,
    hiddenDim: 8,
    outputDim: 5,
    learningRate: 0.01,
    memorySize: 50,
  };

  describe('initialization', () => {
    it('should initialize with correct dimensions', () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const state = titans.getState();

      expect(state.projections.W_k.length).toBe(config.hiddenDim);
      expect(state.projections.W_k[0].length).toBe(config.inputDim);
      expect(state.projections.W_v.length).toBe(config.hiddenDim);
      expect(state.projections.W_q.length).toBe(config.hiddenDim);
      expect(state.projections.W_o?.length).toBe(config.outputDim);
      expect(state.contextMemory).toHaveLength(0);
      expect(state.updateCount).toBe(0);
    });

    it('should initialize projection matrices with reasonable values', () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const state = titans.getState();

      // Check that weights are initialized (not all zeros)
      const hasNonZero = state.projections.W_k.some(row => 
        row.some(val => val !== 0)
      );
      expect(hasNonZero).toBe(true);

      // Check that weights are in reasonable range (Xavier init)
      const allReasonable = state.projections.W_k.every(row =>
        row.every(val => Math.abs(val) < 2.0)
      );
      expect(allReasonable).toBe(true);
    });
  });

  describe('forward pass', () => {
    it('should compute output with correct dimensions', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);

      const output = await titans.forward(context);

      expect(output).toHaveLength(config.outputDim);
      expect(output.every(val => typeof val === 'number')).toBe(true);
    });

    it('should update context memory on forward pass', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);

      const stateBefore = titans.getState();
      expect(stateBefore.contextMemory).toHaveLength(0);

      await titans.forward(context);

      const stateAfter = titans.getState();
      expect(stateAfter.contextMemory.length).toBeGreaterThan(0);
    });

    it('should handle multiple forward passes', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context1 = new Array(config.inputDim).fill(0.3);
      const context2 = new Array(config.inputDim).fill(0.7);

      const output1 = await titans.forward(context1);
      const output2 = await titans.forward(context2);

      expect(output1).toHaveLength(config.outputDim);
      expect(output2).toHaveLength(config.outputDim);
      
      // Outputs should be different (memory affects computation)
      const state = titans.getState();
      expect(state.contextMemory.length).toBe(2);
    });

    it('should respect memory size limit', async () => {
      const titans = new SelfModifyingTitans(agentName, {
        ...config,
        memorySize: 5,
      });

      // Add more contexts than memory size
      for (let i = 0; i < 10; i++) {
        const context = new Array(config.inputDim).fill(i / 10);
        await titans.forward(context);
      }

      const state = titans.getState();
      expect(state.contextMemory.length).toBeLessThanOrEqual(5);
    });

    it('should throw error for wrong input dimension', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const wrongContext = new Array(config.inputDim + 1).fill(0.5);

      await expect(titans.forward(wrongContext)).rejects.toThrow('dimension mismatch');
    });
  });

  describe('learning from surprise', () => {
    it('should update projections based on surprise signal', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);
      const surpriseSignal = new Array(config.outputDim).fill(0.8);

      const stateBefore = titans.getState();
      const projectionsBefore = JSON.parse(JSON.stringify(stateBefore.projections));

      await titans.learnFromSurprise(context, surpriseSignal);

      const stateAfter = titans.getState();
      expect(stateAfter.updateCount).toBe(1);

      // Projections should have changed
      const projectionsChanged = 
        JSON.stringify(stateAfter.projections) !== JSON.stringify(projectionsBefore);
      expect(projectionsChanged).toBe(true);
    });

    it('should handle multiple learning updates', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);

      for (let i = 0; i < 5; i++) {
        const surpriseSignal = new Array(config.outputDim).fill(i / 10);
        await titans.learnFromSurprise(context, surpriseSignal);
      }

      const state = titans.getState();
      expect(state.updateCount).toBe(5);
    });

    it('should handle different learning rates', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);
      const surpriseSignal = new Array(config.outputDim).fill(0.8);

      const stateBefore = titans.getState();
      const projectionsBefore = JSON.parse(JSON.stringify(stateBefore.projections));

      // Learn with custom learning rate
      await titans.learnFromSurprise(context, surpriseSignal, 0.1);

      const stateAfter = titans.getState();
      const projectionsAfter = stateAfter.projections;

      // With higher learning rate, changes should be more pronounced
      const maxChange = Math.max(
        ...projectionsAfter.W_q.flat().map((val, idx) => 
          Math.abs(val - projectionsBefore.W_q.flat()[idx])
        )
      );
      expect(maxChange).toBeGreaterThan(0);
    });

    it('should handle mismatched surprise signal dimensions', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);
      const surpriseSignal = new Array(config.outputDim + 5).fill(0.8);

      // Should not throw, should truncate
      await expect(
        titans.learnFromSurprise(context, surpriseSignal)
      ).resolves.not.toThrow();
    });
  });

  describe('memory management', () => {
    it('should reset memory while keeping projections', () => {
      const titans = new SelfModifyingTitans(agentName, config);
      
      // Add some memory
      const context = new Array(config.inputDim).fill(0.5);
      titans.forward(context);

      const stateBefore = titans.getState();
      expect(stateBefore.contextMemory.length).toBeGreaterThan(0);

      // Reset memory
      titans.resetMemory();

      const stateAfter = titans.getState();
      expect(stateAfter.contextMemory).toHaveLength(0);
      
      // Projections should remain unchanged
      expect(JSON.stringify(stateAfter.projections)).toBe(
        JSON.stringify(stateBefore.projections)
      );
    });
  });

  describe('state management', () => {
    it('should return immutable state', () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const state1 = titans.getState();
      const state2 = titans.getState();

      // Should return new objects
      expect(state1).not.toBe(state2);
      
      // But content should be same
      expect(JSON.stringify(state1.projections)).toBe(
        JSON.stringify(state2.projections)
      );
    });

    it('should track update count correctly', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);
      const surpriseSignal = new Array(config.outputDim).fill(0.8);

      expect(titans.getState().updateCount).toBe(0);

      await titans.learnFromSurprise(context, surpriseSignal);
      expect(titans.getState().updateCount).toBe(1);

      await titans.learnFromSurprise(context, surpriseSignal);
      expect(titans.getState().updateCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero input', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const zeroContext = new Array(config.inputDim).fill(0);

      const output = await titans.forward(zeroContext);
      expect(output).toHaveLength(config.outputDim);
    });

    it('should handle extreme input values', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const extremeContext = new Array(config.inputDim).fill(1000);

      const output = await titans.forward(extremeContext);
      expect(output).toHaveLength(config.outputDim);
      expect(output.every(val => isFinite(val))).toBe(true);
    });

    it('should handle empty surprise signal', async () => {
      const titans = new SelfModifyingTitans(agentName, config);
      const context = new Array(config.inputDim).fill(0.5);
      const emptySurprise: number[] = [];

      // Should not throw, should handle gracefully
      await expect(
        titans.learnFromSurprise(context, emptySurprise)
      ).resolves.not.toThrow();
    });
  });
});

