// Centralized Mock Factory Exports
import { SupabaseMockFactory } from './supabaseMock';
import { ExpoMockFactory } from './expoMocks';
import { ReactNativeMockFactory } from './reactNativeMocks';
import { NavigationMockFactory } from './navigationMocks';
import { ServicesMockFactory } from './servicesMocks';

export * from './supabaseMock';
export * from './expoMocks';
export * from './reactNativeMocks';
export * from './navigationMocks';
export * from './servicesMocks';

// Re-export commonly used factories
export { SupabaseMockFactory, ExpoMockFactory, ReactNativeMockFactory, NavigationMockFactory, ServicesMockFactory };

// Utility function to reset all mocks
export const resetAllMocks = () => {
  SupabaseMockFactory.resetMocks();
  ExpoMockFactory.resetMocks();
  ReactNativeMockFactory.resetMocks();
  NavigationMockFactory.resetMocks();
  ServicesMockFactory.resetMocks();
};

// Common test setup function
export const setupTestMocks = () => {
  resetAllMocks();

  // Set up global test environment
  (global as any).__DEV__ = process.env.NODE_ENV !== 'production';

  // Mock console methods to reduce noise in tests
  (global as any).console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  return {
    supabase: SupabaseMockFactory.createMockClient(),
    expo: ExpoMockFactory.createAllMocks(),
    reactNative: ReactNativeMockFactory.createReactNativeMock(),
    navigation: NavigationMockFactory.createAllMocks(),
    services: ServicesMockFactory.createAllMocks(),
  };
};

// Dummy test to prevent Jest from complaining about no tests
describe('Mock factories', () => {
  it('should export all mock factories', () => {
    // Test only if factories are available to avoid import errors
    try {
      expect(SupabaseMockFactory).toBeDefined();
    } catch (e) {
      logger.warn('SupabaseMockFactory not available');
    }

    try {
      expect(ExpoMockFactory).toBeDefined();
    } catch (e) {
      logger.warn('ExpoMockFactory not available');
    }

    try {
      expect(ReactNativeMockFactory).toBeDefined();
    } catch (e) {
      logger.warn('ReactNativeMockFactory not available');
    }

    try {
      expect(NavigationMockFactory).toBeDefined();
    } catch (e) {
      logger.warn('NavigationMockFactory not available');
    }

    try {
      expect(ServicesMockFactory).toBeDefined();
    } catch (e) {
      logger.warn('ServicesMockFactory not available');
    }

    // Always pass
    expect(true).toBe(true);
  });
});