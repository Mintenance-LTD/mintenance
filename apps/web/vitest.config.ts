import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Keep Vitest scoped to the web workspace. Auto-discovering every parent
  // tsconfig in the monorepo makes startup depend on filesystem traversal and
  // can resolve outside the repository in restricted/CI environments.
  root: configDirectory,
  plugins: [
    react(),
    tsconfigPaths({
      projects: [path.resolve(configDirectory, 'tsconfig.json')],
    }),
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
        // ── Money-critical per-directory ratchets (audit 2026-07-27) ──
        // Set just under the baseline measured after the payment/escrow
        // depth-test push (bid-accept RPC race, escrow CAS ordering +
        // reconciliation, confirm-completion→cron handoff, webhook
        // out-of-order guards). These floors exist so coverage on the
        // paths that move money can only ratchet UP — raise them when you
        // add tests here; never lower them to make a build pass.
        // NOTE: vitest removes glob-matched files from the global
        // calculation above. Bracketed route segments ([id]) are matched
        // with `*` because [] is a glob character class.
        'app/api/payments/release-escrow/**': {
          statements: 76,
          branches: 73,
          functions: 90,
          lines: 76,
        },
        'app/api/jobs/*/bids/*/accept/**': {
          statements: 68,
          branches: 62,
          functions: 44,
          lines: 68,
        },
        'app/api/jobs/*/confirm-completion/**': {
          statements: 84,
          branches: 72,
          functions: 95,
          lines: 84,
        },
        'lib/services/escrow/EscrowAutoReleaseService.ts': {
          statements: 88,
          branches: 78,
          functions: 80,
          lines: 88,
        },
        'lib/services/stripe-webhook/**': {
          statements: 65,
          branches: 56,
          functions: 68,
          lines: 65,
        },
        'app/api/webhooks/stripe/**': {
          statements: 93,
          branches: 76,
          functions: 95,
          lines: 93,
        },
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
      '@': path.resolve(configDirectory, './'),
      '@mintenance/types': path.resolve(configDirectory, '../../packages/types/src'),
      '@mintenance/auth': path.resolve(configDirectory, '../../packages/auth/src'),
      // Must precede the '@mintenance/shared' entry below: that alias points
      // at the package's src/, but deep-link-paths.json deliberately lives at
      // the package ROOT so app.config.js (plain Node, build time) can require
      // it without a compiled dist/. Without this, the subpath resolves to a
      // non-existent src/deep-link-paths.json under vitest only.
      '@mintenance/shared/deep-link-paths.json': path.resolve(
        configDirectory,
        '../../packages/shared/deep-link-paths.json'
      ),
      '@mintenance/shared': path.resolve(
        configDirectory,
        '../../packages/shared/src'
      ),
    },
  },
});
