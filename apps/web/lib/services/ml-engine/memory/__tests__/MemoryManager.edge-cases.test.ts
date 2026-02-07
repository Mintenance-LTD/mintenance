import { vi } from 'vitest';
/**
 * Edge Case Unit Tests for MemoryManager
 *
 * Tests error handling, boundary conditions, and async operation failures
 *
 * Real MemoryManager API:
 * - getInstance() -> singleton
 * - initialize() -> void (idempotent)
 * - getOrCreateMemorySystem(config) -> ContinuumMemorySystem
 * - getMemorySystem(agentName) -> ContinuumMemorySystem | undefined
 * - process(agentName, input: number[]) -> number[]
 * - query(agentName, keys: number[], level?) -> MemoryQueryResult
 * - addContextFlow(agentName, keys: number[], values: number[], level?) -> void
 * - updateMemoryLevel(agentName, level: number) -> MemoryUpdateResult
 * - getMemoryLevels(agentName) -> MemoryLevel[]
 * - getPerformanceMetrics(agentName) -> MemoryPerformanceMetrics[]
 * - dispose() -> void (NOT cleanup)
 * - getRegisteredAgents() -> string[]
 */

import { MemoryManager } from '../MemoryManager';
import { ContinuumMemorySystem } from '../ContinuumMemorySystem';
import type { ContinuumMemoryConfig } from '../types';

// Mock ContinuumMemorySystem
vi.mock('../ContinuumMemorySystem');

// Mock logger so it doesn't interfere
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MemoryManager - Edge Cases', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    // Get fresh instance
    memoryManager = MemoryManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up using the real method name: dispose()
    if (memoryManager) {
      try {
        memoryManager.dispose();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('getOrCreateMemorySystem - Error Handling', () => {
    it('should throw when config is null', async () => {
      // getOrCreateMemorySystem first calls initialize() then accesses config.agentName
      // With null config, accessing config.agentName will throw
      await expect(
        memoryManager.getOrCreateMemorySystem(null as unknown as ContinuumMemoryConfig)
      ).rejects.toThrow();
    });

    it('should throw when config has missing levels field', async () => {
      const invalidConfig = {
        agentName: 'test-agent',
        // Missing levels - accessing config.levels.length in logger will throw
      } as ContinuumMemoryConfig;

      // The MemoryManager logs config.levels.length after creating the system,
      // which throws TypeError when levels is undefined.
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

  describe('query - Edge Cases', () => {
    it('should throw when querying non-existent agent', async () => {
      // query() throws Error if memory system not found
      await expect(
        memoryManager.query('non-existent-agent', [1, 2, 3])
      ).rejects.toThrow('Memory system not found for agent: non-existent-agent');
    });

    it('should throw when querying with null agent name', async () => {
      await expect(
        memoryManager.query(null as unknown as string, [1, 2, 3])
      ).rejects.toThrow();
    });

    it('should query successfully when agent exists', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'query-test-agent',
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
      // Mock the query method on the returned ContinuumMemorySystem instance
      (system.query as ReturnType<typeof vi.fn>).mockResolvedValue({ values: [0.5], keys: [1] });

      const result = await memoryManager.query('query-test-agent', [1, 2, 3]);
      expect(result).toBeDefined();
      expect(result.values).toEqual([0.5]);
    });
  });

  describe('addContextFlow - Edge Cases', () => {
    it('should throw when agent does not exist', async () => {
      await expect(
        memoryManager.addContextFlow('non-existent-agent', [1], [2])
      ).rejects.toThrow('Memory system not found for agent: non-existent-agent');
    });

    it('should throw with null agent name', async () => {
      await expect(
        memoryManager.addContextFlow(null as unknown as string, [1], [2])
      ).rejects.toThrow();
    });

    it('should add context flow when agent exists', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'flow-test-agent',
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
      (system.addContextFlow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        memoryManager.addContextFlow('flow-test-agent', [1, 2], [3, 4])
      ).resolves.toBeUndefined();
    });
  });

  describe('initialize - Edge Cases', () => {
    it('should handle multiple initialization calls (idempotent)', async () => {
      await memoryManager.initialize();
      await memoryManager.initialize();
      await memoryManager.initialize();

      // Should not throw, should be idempotent
      expect(true).toBe(true);
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
    it('should return empty array for non-existent agent', async () => {
      // getPerformanceMetrics returns [] (not null) when agent doesn't exist
      const metrics = await memoryManager.getPerformanceMetrics('non-existent-agent');

      expect(metrics).toEqual([]);
    });

    it('should return empty array for null agent name', async () => {
      const metrics = await memoryManager.getPerformanceMetrics(null as unknown as string);

      expect(metrics).toEqual([]);
    });
  });

  describe('dispose - Edge Cases', () => {
    it('should handle dispose when not initialized', () => {
      // dispose() is the real method (not cleanup)
      expect(() => {
        memoryManager.dispose();
      }).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      memoryManager.dispose();
      memoryManager.dispose();
      memoryManager.dispose();

      // Should be idempotent
      expect(true).toBe(true);
    });
  });

  describe('process - Edge Cases', () => {
    it('should throw when agent does not exist', async () => {
      await expect(
        memoryManager.process('non-existent-agent', [1, 2, 3])
      ).rejects.toThrow('Memory system not found for agent: non-existent-agent');
    });

    it('should process input when agent exists', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'process-test-agent',
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
      (system.process as ReturnType<typeof vi.fn>).mockResolvedValue([0.5, 0.3]);
      (system.incrementStep as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const result = await memoryManager.process('process-test-agent', [1, 2, 3]);
      expect(result).toEqual([0.5, 0.3]);
    });
  });

  describe('getMemoryLevels - Edge Cases', () => {
    it('should return empty array for non-existent agent', () => {
      const levels = memoryManager.getMemoryLevels('non-existent-agent');
      expect(levels).toEqual([]);
    });
  });

  describe('getRegisteredAgents - Edge Cases', () => {
    it('should return empty array when no agents registered', () => {
      const agents = memoryManager.getRegisteredAgents();
      expect(agents).toEqual([]);
    });

    it('should return registered agent names', async () => {
      const config: ContinuumMemoryConfig = {
        agentName: 'registered-agent',
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

      const agents = memoryManager.getRegisteredAgents();
      expect(agents).toContain('registered-agent');
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
