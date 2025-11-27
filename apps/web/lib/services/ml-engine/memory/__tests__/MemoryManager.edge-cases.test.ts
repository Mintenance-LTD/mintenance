/**
 * Edge Case Unit Tests for MemoryManager
 * 
 * Tests error handling, boundary conditions, and async operation failures
 */

import { MemoryManager } from '../MemoryManager';
import { ContinuumMemorySystem } from '../ContinuumMemorySystem';
import type { ContinuumMemoryConfig, MemoryQueryResult } from '../types';

// Mock ContinuumMemorySystem
jest.mock('../ContinuumMemorySystem');

describe('MemoryManager - Edge Cases', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    // Get fresh instance
    memoryManager = MemoryManager.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    if (memoryManager) {
      try {
        memoryManager.cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('getOrCreateMemorySystem - Error Handling', () => {
    it('should handle null config', async () => {
      await expect(
        memoryManager.getOrCreateMemorySystem(null as unknown as ContinuumMemoryConfig)
      ).rejects.toThrow();
    });

    it('should handle config with missing required fields', async () => {
      const invalidConfig = {
        agentName: 'test-agent',
        // Missing levels, updateFrequency, etc.
      } as ContinuumMemoryConfig;

      await expect(
        memoryManager.getOrCreateMemorySystem(invalidConfig)
      ).rejects.toThrow();
    });

    it('should handle duplicate agent names', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      const system1 = await memoryManager.getOrCreateMemorySystem(config);
      const system2 = await memoryManager.getOrCreateMemorySystem(config);

      // Should return same instance
      expect(system1).toBe(system2);
    });
  });

  describe('queryMemory - Edge Cases', () => {
    it('should handle query with null agent name', async () => {
      await expect(
        memoryManager.queryMemory(null as unknown as string, 'test-query', {})
      ).rejects.toThrow();
    });

    it('should handle query with empty agent name', async () => {
      const result = await memoryManager.queryMemory('', 'test-query', {});

      expect(result).toBeNull();
    });

    it('should handle query for non-existent agent', async () => {
      const result = await memoryManager.queryMemory('non-existent-agent', 'test-query', {});

      expect(result).toBeNull();
    });

    it('should handle query with null query string', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      const result = await memoryManager.queryMemory('test-agent', null as unknown as string, {});

      expect(result).toBeNull();
    });

    it('should handle query with empty query string', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      const result = await memoryManager.queryMemory('test-agent', '', {});

      expect(result).toBeNull();
    });

    it('should handle query with very long query string', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      const longQuery = 'a'.repeat(10000);
      const result = await memoryManager.queryMemory('test-agent', longQuery, {});

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('updateMemory - Edge Cases', () => {
    it('should handle update with null agent name', async () => {
      await expect(
        memoryManager.updateMemory(null as unknown as string, {}, 'test-context')
      ).rejects.toThrow();
    });

    it('should handle update for non-existent agent', async () => {
      const result = await memoryManager.updateMemory(
        'non-existent-agent',
        { key: 'value' },
        'test-context'
      );

      // Should create system or return null
      expect(result).toBeDefined();
    });

    it('should handle update with null data', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      await expect(
        memoryManager.updateMemory('test-agent', null as unknown as Record<string, unknown>, 'test-context')
      ).rejects.toThrow();
    });

    it('should handle update with empty data object', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      const result = await memoryManager.updateMemory('test-agent', {}, 'test-context');

      expect(result).toBeDefined();
    });

    it('should handle update with very large data object', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'test-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      await memoryManager.getOrCreateMemorySystem(config);

      const largeData: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = 'value'.repeat(100);
      }

      const result = await memoryManager.updateMemory('test-agent', largeData, 'test-context');

      expect(result).toBeDefined();
    });
  });

  describe('initialize - Error Handling', () => {
    it('should handle multiple initialization calls', async () => {
      await memoryManager.initialize();
      await memoryManager.initialize();
      await memoryManager.initialize();

      // Should not throw, should be idempotent
      expect(true).toBe(true);
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock internal failure
      const originalStartScheduler = (memoryManager as any).startUpdateScheduler;
      (memoryManager as any).startUpdateScheduler = jest.fn(() => {
        throw new Error('Scheduler start failed');
      });

      await expect(memoryManager.initialize()).rejects.toThrow('Scheduler start failed');

      // Restore
      (memoryManager as any).startUpdateScheduler = originalStartScheduler;
    });
  });

  describe('getMemorySystem - Edge Cases', () => {
    it('should return undefined for non-existent agent', () => {
      const result = memoryManager.getMemorySystem('non-existent-agent');

      expect(result).toBeUndefined();
    });

    it('should handle null agent name', () => {
      const result = memoryManager.getMemorySystem(null as unknown as string);

      expect(result).toBeUndefined();
    });

    it('should handle empty agent name', () => {
      const result = memoryManager.getMemorySystem('');

      expect(result).toBeUndefined();
    });
  });

  describe('getPerformanceMetrics - Edge Cases', () => {
    it('should return metrics for non-existent agent', async () => {
      const metrics = await memoryManager.getPerformanceMetrics('non-existent-agent');

      expect(metrics).toBeNull();
    });

    it('should handle null agent name', async () => {
      const metrics = await memoryManager.getPerformanceMetrics(null as unknown as string);

      expect(metrics).toBeNull();
    });
  });

  describe('cleanup - Edge Cases', () => {
    it('should handle cleanup when not initialized', () => {
      // Should not throw
      expect(() => {
        memoryManager.cleanup();
      }).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      memoryManager.cleanup();
      memoryManager.cleanup();
      memoryManager.cleanup();

      // Should be idempotent
      expect(true).toBe(true);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle maximum number of memory systems', async () => {
      const systems: ContinuumMemorySystem[] = [];

      for (let i = 0; i < 100; i++) {
        const config: ContinuumMemoryConfig = {
          agentName: `agent-${i}`,
          levels: [
            {
              name: 'level1',
              updateFrequency: 10,
              capacity: 1000,
            },
          ],
          updateFrequency: 10,
          queryLimit: 100,
        };

        const system = await memoryManager.getOrCreateMemorySystem(config);
        systems.push(system);
      }

      expect(systems.length).toBe(100);
    });

    it('should handle concurrent memory system creation', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'concurrent-agent',
        levels: [
          {
            name: 'level1',
            updateFrequency: 10,
            capacity: 1000,
          },
        ],
        updateFrequency: 10,
        queryLimit: 100,
      };

      const promises = Array(10).fill(null).map(() =>
        memoryManager.getOrCreateMemorySystem(config)
      );

      const systems = await Promise.all(promises);

      // All should be the same instance
      const firstSystem = systems[0];
      expect(systems.every(s => s === firstSystem)).toBe(true);
    });
  });
});

