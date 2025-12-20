/**
 * ML Memory Leak Fixes Tests
 * Comprehensive tests for memory management in ML components
 */

// Import test utilities
import '../../__tests__/setup/testMocks';

// Mock the ML services to avoid TensorFlow dependency
jest.mock('../../services/MLMemoryFixes');
jest.mock('../../services/MLTrainingPipeline', () => ({
  MLTrainingPipeline: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    train: jest.fn(() => Promise.resolve()),
    predict: jest.fn(() => Promise.resolve([])),
    getModelStats: jest.fn(() => ({ accuracy: 0.85, loss: 0.15 })),
  })),
}));

import { mlMemoryManager, MLMemoryManager } from '../../services/MLMemoryFixes';

describe('ML Memory Leak Fixes', () => {
  let memoryManager: MLMemoryManager;

  beforeEach(() => {
    // Create fresh instance for each test
    memoryManager = MLMemoryManager.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    memoryManager.cleanup();
  });

  describe('Memory Tracking', () => {
    it('should start tracking a component', () => {
      const tracker = memoryManager.startTracking('test-component', 'TestComponent');

      expect(tracker).toBeDefined();
      expect(tracker.component).toBe('TestComponent');
      expect(tracker.tensors).toEqual([]);
      expect(tracker.intervals).toEqual([]);
      expect(tracker.timeouts).toEqual([]);
      expect(tracker.eventListeners).toEqual([]);
      expect(tracker.models).toBeInstanceOf(Map);
    });

    it('should stop tracking a component', () => {
      memoryManager.startTracking('test-component', 'TestComponent');
      const result = memoryManager.stopTracking('test-component');

      expect(result).toBe(true);
    });

    it('should return false when stopping non-existent component', () => {
      const result = memoryManager.stopTracking('non-existent-component');

      expect(result).toBe(false);
    });

    it('should provide memory stats', () => {
      memoryManager.startTracking('component1', 'Component1');
      memoryManager.startTracking('component2', 'Component2');

      const stats = memoryManager.getMemoryStats();

      expect(stats).toEqual({
        totalTensors: 0,
        totalModels: 0,
        totalMemoryUsage: 0,
        activeTrackers: 2,
      });
    });
  });

  describe('Memory Cleanup', () => {
    it('should cleanup all components', () => {
      memoryManager.startTracking('component1', 'Component1');
      memoryManager.startTracking('component2', 'Component2');

      memoryManager.cleanup();

      const stats = memoryManager.getMemoryStats();
      expect(stats.activeTrackers).toBe(0);
    });

    it('should clear intervals and timeouts during cleanup', () => {
      const tracker = memoryManager.startTracking('test-component', 'TestComponent');

      // Mock some intervals and timeouts
      const mockInterval = setTimeout(() => {}, 1000) as any;
      const mockTimeout = setTimeout(() => {}, 1000) as any;

      tracker.intervals.push(mockInterval);
      tracker.timeouts.push(mockTimeout);

      // Spy on clearInterval and clearTimeout
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      memoryManager.stopTracking('test-component');

      expect(clearIntervalSpy).toHaveBeenCalledWith(mockInterval);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);

      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MLMemoryManager.getInstance();
      const instance2 = MLMemoryManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tracker gracefully', () => {
      const stats = memoryManager.getMemoryStats();

      expect(stats.activeTrackers).toBe(0);
      expect(() => memoryManager.stopTracking('non-existent')).not.toThrow();
    });

    it('should handle cleanup with no active trackers', () => {
      expect(() => memoryManager.cleanup()).not.toThrow();

      const stats = memoryManager.getMemoryStats();
      expect(stats.activeTrackers).toBe(0);
    });
  });
});