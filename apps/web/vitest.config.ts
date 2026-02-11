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
      '**/e2e/**',
      '**/test/examples/**',
      '**/*.e2e.{test,spec}.{ts,tsx}',
      '**/playwright/**',
      '**/*.playwright.{test,spec}.{ts,tsx}',
      '**/*.spec.ts.old',
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
        '**/__mocks__/**',
        '**/.next/**',
        'coverage/**',
        'dist/**',
      ],
      thresholds: {
        global: {
          statements: 40,
          branches: 35,
          functions: 48,
          lines: 40,
        },
      },
    },

    // Test timeout
    testTimeout: 15000,

    // Hook timeout
    hookTimeout: 15000,

    // Clear mocks automatically
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Mock reset between tests
    mockReset: true,

    // Verbose output
    reporters: ['verbose'],
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
