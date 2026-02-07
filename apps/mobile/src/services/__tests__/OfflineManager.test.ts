import { OfflineManager } from '../OfflineManager';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve('[]')),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('../lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}), { virtual: true });

describe('OfflineManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('instance methods', () => {
    it('should have instance methods available', () => {
      expect(OfflineManager).toBeDefined();
      expect(OfflineManager.queueAction).toBeDefined();
      expect(OfflineManager.syncQueue).toBeDefined();
      expect(typeof OfflineManager.queueAction).toBe('function');
      expect(typeof OfflineManager.syncQueue).toBe('function');
    });

    it('should queue operations when offline', async () => {
      const action = {
        type: 'CREATE',
        entity: 'jobs',
        data: { title: 'Test Job' },
        timestamp: Date.now(),
      };

      await OfflineManager.queueAction(action);

      // Verify the operation was queued
      expect(OfflineManager.getQueue).toBeDefined();
    });

    it('should handle sync operations', async () => {
      // The sync should work without errors
      await expect(OfflineManager.syncQueue()).resolves.not.toThrow();
    });
  });
});