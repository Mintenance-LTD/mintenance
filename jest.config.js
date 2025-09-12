module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Force AuthContext imports to use the lightweight fallback in tests
    'contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
    '.*/contexts/AuthContext$': '<rootDir>/src/contexts/AuthContext-fallback.tsx',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native|expo|expo-.*|@expo|@expo/.*|expo-modules-core|@supabase|@stripe|@tanstack|@sentry|@react-native-community|@react-navigation|react-native-deck-swiper|react-native-maps|react-native-gesture-handler|react-native-vector-icons|react-native-reanimated)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/index.ts',
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
  testEnvironment: 'node',
  setupFiles: [],
  globals: {
    __DEV__: true,
  },
};
