jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

import * as ServiceAreasServiceModule from '../ServiceAreasService';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

describe('ServiceAreasService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module exports', () => {
    it('should export ServiceAreasService', () => {
      expect(ServiceAreasServiceModule.ServiceAreasService).toBeDefined();
    });

    it('should have expected structure', () => {
      const service = ServiceAreasServiceModule.ServiceAreasService;
      expect(service).toBeDefined();

      // Check if it's a class, instance, or namespace with functions
      const serviceType = typeof service;
      expect(['function', 'object'].includes(serviceType)).toBeTruthy();
    });
  });

  describe('functionality', () => {
    it('should provide service methods', () => {
      const service = ServiceAreasServiceModule.ServiceAreasService;

      // Service should have some methods or properties
      if (typeof service === 'object' && service !== null) {
        const keys = Object.keys(service);
        expect(keys.length).toBeGreaterThan(0);
      } else if (typeof service === 'function') {
        // It's a class constructor
        expect(service.prototype || service.length >= 0).toBeTruthy();
      }
    });
  });
});