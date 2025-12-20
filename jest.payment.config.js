/**
 * Jest Configuration for Payment Tests
 * Specialized configuration for payment flow testing
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'Payment Tests',
  testMatch: [
    '<rootDir>/src/__tests__/services/Payment*.test.ts',
    '<rootDir>/src/__tests__/services/PaymentFlows.*.test.ts',
    '<rootDir>/src/__tests__/integration/PaymentWorkflows.*.test.tsx',
    '<rootDir>/src/__tests__/components/*Payment*.test.tsx',
  ],
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/src/__tests__/setup/paymentTestSetup.ts',
  ],
  testTimeout: 30000, // Longer timeout for payment flows
  collectCoverageFrom: [
    'src/services/PaymentService.ts',
    'src/services/PaymentGateway.ts',
    'src/components/*Payment*.tsx',
    'src/screens/*Payment*.tsx',
    'src/hooks/usePayment*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/PaymentService.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/test-utils/payment$': '<rootDir>/src/__tests__/utils/paymentTestUtils',
  },
  testEnvironment: 'jsdom',
  globals: {
    __DEV__: true,
    __PAYMENT_TEST_MODE__: true,
  },
};