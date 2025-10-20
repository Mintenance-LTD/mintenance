module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.{js,ts,tsx}',
    '**/?(*.)+(spec|test).{js,ts,tsx}'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@mintenance/(.*)$': '<rootDir>/../../packages/$1/src'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    // Higher thresholds for critical files
    './app/lib/auth.ts': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    './app/api/**/*.ts': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    './middleware.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
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
  verbose: true
};