import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

/**
 * Separate Vitest config for REAL-DB integration tests.
 *
 * Differs from vitest.config.ts:
 *  - No global mocks (setupFiles is empty) — tests talk to real Supabase
 *  - environment: 'node' (no happy-dom; server-side code only)
 *  - Only loads tests under __tests__/integration-real/
 *
 * Invoked via `npm run test:integration` (sets INTEGRATION_TESTS=1).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    // CRITICAL: do NOT load test/setup.ts — it mocks @supabase/supabase-js
    setupFiles: [],
    include: ['**/__tests__/integration-real/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
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
