import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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
      // Real-DB integration tests use a separate config (vitest.integration.config.ts)
      '**/__tests__/integration-real/**',
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
      // Coverage thresholds. NOTE: these keys must sit DIRECTLY under
      // `thresholds` — Vitest does NOT support Jest's `global: { ... }`
      // nesting. When nested, Vitest treated "global" as a file-glob (which
      // matched nothing), read all four real thresholds as `undefined`, and
      // enforced nothing — so `--coverage` could never fail. (2026-07-10 audit)
      //
      // The numbers below are a REGRESSION FLOOR set just under the measured
      // baseline on 2026-07-10 (stmts 45.85 / branch 38.92 / funcs 52.36 /
      // lines 46.62). They prevent coverage from sliding backwards. The
      // long-term target remains 70/65/70/70 — ratchet these up as coverage
      // improves rather than jumping straight to 70 (which would fail today).
      thresholds: {
        statements: 45,
        branches: 38,
        functions: 52,
        lines: 46,
      },
    },

    // Test timeout
    testTimeout: 60000,

    // Hook timeout
    hookTimeout: 30000,

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
      '@mintenance/shared': path.resolve(
        __dirname,
        '../../packages/shared/src'
      ),
    },
  },
});
