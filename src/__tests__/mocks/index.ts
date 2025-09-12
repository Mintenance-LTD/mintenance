// Centralized Mock Factory Exports
export * from './supabaseMock';
export * from './expoMocks';
export * from './reactNativeMocks';
export * from './navigationMocks';
export * from './servicesMocks';

// Re-export commonly used factories
export { SupabaseMockFactory } from './supabaseMock';
export { ExpoMockFactory } from './expoMocks';
export { ReactNativeMockFactory } from './reactNativeMocks';
export { NavigationMockFactory } from './navigationMocks';
export { ServicesMockFactory } from './servicesMocks';

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
  global.__DEV__ = process.env.NODE_ENV !== 'production';

  // Mock console methods to reduce noise in tests
  global.console = {
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
    expect(SupabaseMockFactory).toBeDefined();
    expect(ExpoMockFactory).toBeDefined();
    expect(ReactNativeMockFactory).toBeDefined();
    expect(NavigationMockFactory).toBeDefined();
    expect(ServicesMockFactory).toBeDefined();
  });
});
