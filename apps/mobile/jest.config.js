// Set NODE_ENV for tests
process.env.NODE_ENV = 'test';

module.exports = {
  displayName: 'mobile',
  testEnvironment: 'node',
  cache: false,
  setupFilesAfterEnv: [
    '<rootDir>/jest-setup.js',
    '<rootDir>/src/__tests__/setup/globalMocks.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup/',
    '/__tests__/mocks/',
    '/e2e/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mintenance/types$': '<rootDir>/../../packages/types/src',
    '^@mintenance/shared$': '<rootDir>/../../packages/shared/src',
    '^@mintenance/design-tokens$': '<rootDir>/../../packages/design-tokens/src',
    '^@mintenance/api-client$': '<rootDir>/../../packages/api-client/src',
    '^\\.\\./utils/test-utils$': '<rootDir>/src/__tests__/utils/test-utils.tsx',
    '^.+\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/fileMock.js',
    // Force AuthContext imports to use the lightweight fallback in tests
    'contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    '.*/contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    // Ensure all imports of config/supabase resolve to the chainable manual mock in tests
    '.*/config/supabase$': '<rootDir>/src/config/__mocks__/supabase.ts',
    '^../config/supabase$': '<rootDir>/src/config/__mocks__/supabase.ts',
    // Mock Stripe
    '^@stripe/stripe-react-native$': '<rootDir>/__mocks__/@stripe/stripe-react-native.js',
    // Mock utils/logger
    '^../utils/logger$': '<rootDir>/src/utils/logger.ts',
    '^../../utils/logger$': '<rootDir>/src/utils/logger.ts',
    // Mock React Native for component testing
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^.+/__mocks__/react-native\\.js$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.js',
    // Mock react-native-reanimated to fix test issues
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    // Mock other commonly failing modules
    '^\\.\\./services/(.*)$': '<rootDir>/src/services/$1',
    '^\\.\\.\\/\\.\\./services/(.*)$': '<rootDir>/src/services/$1',
    '^\\.\\.\\./\\.\\./services/(.*)$': '<rootDir>/src/services/$1',
    '^\\.\\./hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^\\.\\.\\./\\.\\./hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^\\.\\./components/(.*)$': '<rootDir>/src/components/$1',
    '^\\.\\.\\./\\.\\./components/(.*)$': '<rootDir>/src/components/$1',
    '^\\.\\./utils/(.*)$': '<rootDir>/src/utils/$1',
    '^\\.\\.\\./\\.\\./utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native|expo|expo-.*|@expo|@expo/.*|expo-modules-core|@supabase|@stripe|@tanstack|@sentry|@react-native-community|@react-navigation|react-native-deck-swiper|react-native-maps|react-native-gesture-handler|react-native-vector-icons|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context)/)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/index.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/__tests__/**/*',
    '!src/navigation/**/*', // Navigation is hard to unit test
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Start with achievable thresholds - increase as coverage improves
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30,
    },
  },
  // Increase test timeout for complex tests
  testTimeout: 30000,
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
