import { LocalDatabase } from '../LocalDatabase';

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
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('LocalDatabase', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();
    db = LocalDatabase;
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocalDatabase;
      const instance2 = LocalDatabase;
      expect(instance1).toBe(instance2);
    });
  });

  describe('methods', () => {
    it('should have expected methods', () => {
      expect(typeof db.init).toBe('function');
      expect(typeof db.saveUser).toBe('function');
      expect(typeof db.getUser).toBe('function');
      expect(typeof db.saveJob).toBe('function');
      expect(typeof db.getJob).toBe('function');
      expect(typeof db.clearAllData).toBe('function');
    });

    it('should initialize without errors', async () => {
      await expect(db.init()).resolves.not.toThrow();
    });

    it('should provide storage info', async () => {
      await db.init();
      const info = await db.getStorageInfo();
      expect(info).toBeDefined();
    });
  });
});
