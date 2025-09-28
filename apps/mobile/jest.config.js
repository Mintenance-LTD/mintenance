module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest-setup.js',
    '<rootDir>/src/__tests__/setup/globalMocks.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mintenance/types$': '<rootDir>/../../packages/types/src',
    '^@mintenance/shared$': '<rootDir>/../../packages/shared/src',
    // Force AuthContext imports to use the lightweight fallback in tests
    'contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    '.*/contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    // Ensure all imports of config/supabase resolve to the chainable manual mock in tests
    '.*/config/supabase$': '<rootDir>/src/config/__mocks__/supabase.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native|expo|expo-.*|@expo|@expo/.*|expo-modules-core|@supabase|@stripe|@tanstack|@sentry|@react-native-community|@react-navigation|react-native-deck-swiper|react-native-maps|react-native-gesture-handler|react-native-vector-icons|react-native-reanimated)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/index.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    // Require higher standards for critical services
    'src/services/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testEnvironment: 'jsdom',
  setupFiles: [],
  globals: {
    __DEV__: true,
  },
  // TypeScript support
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        moduleResolution: 'bundler',
        allowJs: true,
        forceConsistentCasingInFileNames: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedIndexedAccess: false,
        exactOptionalPropertyTypes: false,
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // Mock React Native components for better test support
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@mintenance/types$': '<rootDir>/../../packages/types/src',
    '^@mintenance/shared$': '<rootDir>/../../packages/shared/src',
    // React Native component mocks
    '^react-native$': '<rootDir>/src/__tests__/mocks/reactNativeMocks.ts',
    '^react-native/(.*)$': '<rootDir>/src/__tests__/mocks/reactNativeMocks.ts',
    // Force AuthContext imports to use the lightweight fallback in tests
    'contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    '.*/contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    // Ensure all imports of config/supabase resolve to the chainable manual mock in tests
    '.*/config/supabase$': '<rootDir>/src/config/__mocks__/supabase.ts',
  },
};
