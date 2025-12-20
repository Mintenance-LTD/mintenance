module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/scripts/__tests__/**/*.test.{js,ts}',
    '**/scripts/**/*.test.{js,ts}'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@mintenance/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Coverage configuration
  collectCoverageFrom: [
    'scripts/**/*.{ts,js}',
    '!scripts/**/*.test.{ts,js}',
    '!scripts/**/__tests__/**',
  ],
};

