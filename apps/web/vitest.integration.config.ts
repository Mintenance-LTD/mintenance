import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

/**
 * Vitest config for REAL-DB integration tests in __tests__/integration-real/**.
 *
 * Differs from the default `vitest.config.ts` in three load-bearing ways:
 *   1. `environment: 'node'` — these tests have no DOM and need the
 *      Node fetch / TLS stack for `@supabase/supabase-js`.
 *   2. **No setupFiles.** The default `test/setup.ts` mocks
 *      `@supabase/supabase-js` and `@/lib/api/supabaseServer`, which would
 *      silently make these tests hit mocks instead of the real DB —
 *      defeating the whole point.
 *   3. Only includes `__tests__/integration-real/**`. The default config
 *      excludes that directory; this config exclusively targets it.
 *
 * Prerequisites:
 *   - Local Supabase running at http://localhost:54321 (`supabase start`)
 *   - `INTEGRATION_TESTS=1` in env (the wrapper at scripts/run-integration-tests.js
 *     sets this; the workflow at .github/workflows/integration-tests.yml runs the
 *     wrapper).
 *
 * See docs/TESTING_INTEGRATION.md for the full guide.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,

    // Only the real-DB integration tests. The default unit/integration
    // config excludes this directory.
    include: ['__tests__/integration-real/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
    ],

    // Real-DB tests: no shared setup, no mock reset (we don't use mocks here).
    // Crucially, do NOT load test/setup.ts — it mocks @supabase/supabase-js.
    setupFiles: [],
    clearMocks: false,
    restoreMocks: false,
    mockReset: false,

    // Real DB roundtrips + Supabase auth signup are slower than mocks.
    testTimeout: 30000,
    hookTimeout: 60000,

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
