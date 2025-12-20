import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  test: {
    // Test environment
    environment: 'happy-dom',

    // Global test utilities
    globals: true,

    // Setup files
    setupFiles: ['./test/setup.ts'],

    // Test file patterns
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx}',
      '**/*.{test,spec}.{ts,tsx}',
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/_archive/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/.next/**',
        'coverage/**',
        'dist/**',
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Clear mocks automatically
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Mock reset between tests
    mockReset: true,

    // Verbose output
    reporters: ['verbose'],

    // Benchmark configuration
    benchmark: {
      include: ['**/*.bench.{ts,tsx}'],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@mintenance/types': path.resolve(__dirname, '../../packages/types/src'),
      '@mintenance/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@mintenance/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
