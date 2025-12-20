/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('OfflineManager Memory Leak', () => {
  let OfflineManager: any;
  let listenerStore: Map<string, Set<Function>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Listener store to track all listeners
    listenerStore = new Map();

    // OfflineManager implementation
    OfflineManager = {
      listeners: listenerStore,

      // Add listener - returns unsubscribe function
      addListener: (event: string, callback: Function) => {
        if (!listenerStore.has(event)) {
          listenerStore.set(event, new Set());
        }

        const listeners = listenerStore.get(event)!;
        listeners.add(callback);

        // Return unsubscribe function
        return () => {
          const currentListeners = listenerStore.get(event);
          if (currentListeners) {
            currentListeners.delete(callback);

            // Clean up empty sets
            if (currentListeners.size === 0) {
              listenerStore.delete(event);
            }
          }
        };
      },

      // Emit event to all listeners
      emit: (event: string, data?: any) => {
        const listeners = listenerStore.get(event);
        if (listeners) {
          listeners.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error('Listener error:', error);
            }
          });
        }
      },

      // Get listener count for event
      getListenerCount: (event: string) => {
        const listeners = listenerStore.get(event);
        return listeners ? listeners.size : 0;
      },

      // Get total listener count across all events
      getTotalListenerCount: () => {
        let total = 0;
        listenerStore.forEach((listeners) => {
          total += listeners.size;
        });
        return total;
      },

      // Clear all listeners (for testing)
      clearAllListeners: () => {
        listenerStore.clear();
      },
    };
  });

  afterEach(() => {
    OfflineManager.clearAllListeners();
  });

  describe('Add listener', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should add listener to store', () => {
      const callback = jest.fn();
      OfflineManager.addListener('sync', callback);

      expect(OfflineManager.getListenerCount('sync')).toBe(1);
    });

    it('should call listener when event is emitted', () => {
      const callback = jest.fn();
      OfflineManager.addListener('sync', callback);

      OfflineManager.emit('sync', { status: 'complete' });

      expect(callback).toHaveBeenCalledWith({ status: 'complete' });
    });

    it('should support multiple events', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      OfflineManager.addListener('sync', callback1);
      OfflineManager.addListener('error', callback2);

      expect(OfflineManager.getListenerCount('sync')).toBe(1);
      expect(OfflineManager.getListenerCount('error')).toBe(1);
      expect(OfflineManager.getTotalListenerCount()).toBe(2);
    });
  });

  describe('Multiple listeners', () => {
    it('should track all listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      OfflineManager.addListener('sync', callback1);
      OfflineManager.addListener('sync', callback2);
      OfflineManager.addListener('sync', callback3);

      expect(OfflineManager.getListenerCount('sync')).toBe(3);
    });

    it('should call all listeners when event is emitted', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      OfflineManager.addListener('sync', callback1);
      OfflineManager.addListener('sync', callback2);

      OfflineManager.emit('sync', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should track listeners across multiple events', () => {
      OfflineManager.addListener('sync', jest.fn());
      OfflineManager.addListener('sync', jest.fn());
      OfflineManager.addListener('error', jest.fn());
      OfflineManager.addListener('complete', jest.fn());

      expect(OfflineManager.getTotalListenerCount()).toBe(4);
    });
  });

  describe('Unsubscribe', () => {
    it('should remove specific listener', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      expect(OfflineManager.getListenerCount('sync')).toBe(1);

      unsubscribe();

      expect(OfflineManager.getListenerCount('sync')).toBe(0);
    });

    it('should not call listener after unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      OfflineManager.emit('sync', { data: 'before' });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      OfflineManager.emit('sync', { data: 'after' });
      expect(callback).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should only remove the specific listener, not others', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      const unsubscribe1 = OfflineManager.addListener('sync', callback1);
      OfflineManager.addListener('sync', callback2);
      OfflineManager.addListener('sync', callback3);

      expect(OfflineManager.getListenerCount('sync')).toBe(3);

      unsubscribe1();

      expect(OfflineManager.getListenerCount('sync')).toBe(2);

      OfflineManager.emit('sync', { data: 'test' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should handle multiple unsubscribes safely', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      unsubscribe();
      unsubscribe(); // Should not throw

      expect(OfflineManager.getListenerCount('sync')).toBe(0);
    });

    it('should clean up empty event sets', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      expect(listenerStore.has('sync')).toBe(true);

      unsubscribe();

      // Empty set should be removed
      expect(listenerStore.has('sync')).toBe(false);
    });
  });

  describe('Component unmount - cleanup listeners', () => {
    it('should cleanup listeners on component unmount', () => {
      // Simulate React component lifecycle
      const mockComponent = () => {
        const unsubscribe = OfflineManager.addListener('sync', jest.fn());

        // Component unmount
        return unsubscribe;
      };

      const cleanup = mockComponent();
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      cleanup(); // Unmount
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });

    it('should cleanup multiple listeners from same component', () => {
      const mockComponent = () => {
        const unsubscribes: Function[] = [];

        unsubscribes.push(OfflineManager.addListener('sync', jest.fn()));
        unsubscribes.push(OfflineManager.addListener('error', jest.fn()));
        unsubscribes.push(OfflineManager.addListener('complete', jest.fn()));

        return () => {
          unsubscribes.forEach((unsub) => unsub());
        };
      };

      const cleanup = mockComponent();
      expect(OfflineManager.getTotalListenerCount()).toBe(3);

      cleanup();
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });

    it('should handle component remounting', () => {
      const createComponent = () => {
        return OfflineManager.addListener('sync', jest.fn());
      };

      // Mount
      const cleanup1 = createComponent();
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      // Unmount
      cleanup1();
      expect(OfflineManager.getTotalListenerCount()).toBe(0);

      // Remount
      const cleanup2 = createComponent();
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      // Unmount again
      cleanup2();
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });

    it('should not affect other components listeners', () => {
      const component1Cleanup = OfflineManager.addListener('sync', jest.fn());
      const component2Cleanup = OfflineManager.addListener('sync', jest.fn());

      expect(OfflineManager.getListenerCount('sync')).toBe(2);

      // Component 1 unmounts
      component1Cleanup();

      expect(OfflineManager.getListenerCount('sync')).toBe(1);

      // Component 2 still has listener
      OfflineManager.emit('sync', { data: 'test' });
    });
  });

  describe('Memory usage over time', () => {
    it('should not grow unbounded with add/remove cycles', () => {
      const cycles = 1000;

      for (let i = 0; i < cycles; i++) {
        const unsubscribe = OfflineManager.addListener('sync', jest.fn());
        unsubscribe();
      }

      // After 1000 add/remove cycles, count should be 0
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
      expect(listenerStore.size).toBe(0); // No lingering event keys
    });

    it('should handle many concurrent listeners', () => {
      const listeners: Function[] = [];

      // Add 100 listeners
      for (let i = 0; i < 100; i++) {
        const unsubscribe = OfflineManager.addListener('sync', jest.fn());
        listeners.push(unsubscribe);
      }

      expect(OfflineManager.getListenerCount('sync')).toBe(100);

      // Remove all listeners
      listeners.forEach((unsubscribe) => unsubscribe());

      expect(OfflineManager.getListenerCount('sync')).toBe(0);
      expect(listenerStore.size).toBe(0);
    });

    it('should maintain stable memory with continuous usage', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // Add 5 listeners
        const unsubscribes = Array.from({ length: 5 }, () =>
          OfflineManager.addListener('sync', jest.fn())
        );

        expect(OfflineManager.getListenerCount('sync')).toBe(5);

        // Remove 5 listeners
        unsubscribes.forEach((unsub) => unsub());

        expect(OfflineManager.getListenerCount('sync')).toBe(0);
      }

      // Final state should be clean
      expect(listenerStore.size).toBe(0);
    });

    it('should not leak listeners in error scenarios', () => {
      const failingCallback = jest.fn(() => {
        throw new Error('Listener error');
      });

      const unsubscribe = OfflineManager.addListener('sync', failingCallback);

      // Emit should not throw even if listener throws
      expect(() => {
        OfflineManager.emit('sync', { data: 'test' });
      }).not.toThrow();

      // Cleanup should still work
      unsubscribe();
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle typical component lifecycle pattern', () => {
      // Simulate React useEffect pattern
      const useOfflineSync = () => {
        const [syncStatus, setSyncStatus] = [null, jest.fn()];

        const unsubscribe = OfflineManager.addListener('sync', (data: any) => {
          setSyncStatus(data.status);
        });

        // Cleanup function returned by useEffect
        return unsubscribe;
      };

      const cleanup1 = useOfflineSync();
      const cleanup2 = useOfflineSync();
      const cleanup3 = useOfflineSync();

      expect(OfflineManager.getListenerCount('sync')).toBe(3);

      cleanup1();
      cleanup2();
      cleanup3();

      expect(OfflineManager.getListenerCount('sync')).toBe(0);
    });

    it('should handle screen navigation pattern', () => {
      // Screen A mounts
      const screenACleanup = OfflineManager.addListener('sync', jest.fn());
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      // Navigate to Screen B (Screen A stays mounted)
      const screenBCleanup = OfflineManager.addListener('sync', jest.fn());
      expect(OfflineManager.getTotalListenerCount()).toBe(2);

      // Navigate back (Screen B unmounts)
      screenBCleanup();
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      // Navigate away (Screen A unmounts)
      screenACleanup();
      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });

    it('should handle tab switching pattern', () => {
      const tabs = ['home', 'profile', 'settings'];
      const cleanups: Map<string, Function> = new Map();

      // User switches through tabs
      tabs.forEach((tab) => {
        const cleanup = OfflineManager.addListener('sync', jest.fn());
        cleanups.set(tab, cleanup);
      });

      expect(OfflineManager.getTotalListenerCount()).toBe(3);

      // User closes all tabs
      cleanups.forEach((cleanup) => cleanup());

      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });

    it('should handle conditional listener registration', () => {
      const isOfflineMode = (enabled: boolean) => {
        if (enabled) {
          return OfflineManager.addListener('sync', jest.fn());
        }
        return () => {}; // No-op cleanup
      };

      // Offline mode enabled
      const cleanup1 = isOfflineMode(true);
      expect(OfflineManager.getTotalListenerCount()).toBe(1);

      // Offline mode disabled
      const cleanup2 = isOfflineMode(false);
      expect(OfflineManager.getTotalListenerCount()).toBe(1); // Still 1

      cleanup1();
      cleanup2(); // Should not throw

      expect(OfflineManager.getTotalListenerCount()).toBe(0);
    });
  });

  describe('Memory leak detection', () => {
    it('should not retain references to removed listeners', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      // Create weak reference (if possible in test environment)
      const listenerSet = listenerStore.get('sync');
      expect(listenerSet?.has(callback)).toBe(true);

      unsubscribe();

      // Reference should be removed
      const listenerSetAfter = listenerStore.get('sync');
      expect(listenerSetAfter).toBeUndefined();
    });

    it('should cleanup event keys with no listeners', () => {
      OfflineManager.addListener('event1', jest.fn())();
      OfflineManager.addListener('event2', jest.fn())();
      OfflineManager.addListener('event3', jest.fn())();

      // All listeners removed immediately, no keys should remain
      expect(listenerStore.has('event1')).toBe(false);
      expect(listenerStore.has('event2')).toBe(false);
      expect(listenerStore.has('event3')).toBe(false);
    });

    it('should handle rapid add/remove cycles', () => {
      const rapid = () => {
        for (let i = 0; i < 10; i++) {
          const unsub = OfflineManager.addListener('sync', jest.fn());
          unsub();
        }
      };

      rapid();
      rapid();
      rapid();

      expect(OfflineManager.getTotalListenerCount()).toBe(0);
      expect(listenerStore.size).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle same callback registered multiple times', () => {
      const callback = jest.fn();

      const unsub1 = OfflineManager.addListener('sync', callback);
      const unsub2 = OfflineManager.addListener('sync', callback);

      // Set should only contain callback once (Set deduplication)
      expect(OfflineManager.getListenerCount('sync')).toBe(1);

      unsub1();
      expect(OfflineManager.getListenerCount('sync')).toBe(0);

      // Second unsubscribe should be safe
      unsub2();
      expect(OfflineManager.getListenerCount('sync')).toBe(0);
    });

    it('should handle empty event name', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('', callback);

      expect(OfflineManager.getListenerCount('')).toBe(1);

      unsubscribe();
      expect(OfflineManager.getListenerCount('')).toBe(0);
    });

    it('should handle unsubscribe before any emit', () => {
      const callback = jest.fn();
      const unsubscribe = OfflineManager.addListener('sync', callback);

      unsubscribe();

      OfflineManager.emit('sync', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
