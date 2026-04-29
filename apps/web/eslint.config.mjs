import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'next-env.d.ts',
    '*.d.ts',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/_archived/**',
    '**/_archive/**',
    '**/*.cjs',
    'public/**',
    'e2e/**',
    'test/**',
    'test-*.ts',
    'sentry.*.config.ts',
    'next.config.js',
    'next.config.ts',
    'next.config.mjs',
    '**/scripts/**/*.js',
    '**/scripts/**/*.mjs',
  ]),

  // Custom rules
  {
    rules: {
      // Enforce structured logging - no console.log allowed
      'no-console': 'error',

      // Warn on any types (upgrade to error after fixing existing issues)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Ignore args/vars prefixed with _ (standard TypeScript idiom for unused params)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Prevent usage of @ts-ignore without description
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description',
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],

      // Disabled for now - too many violations
      '@typescript-eslint/explicit-function-return-type': 'off',

      // Allow apostrophes in JSX text content (overly noisy in UK English copy)
      'react/no-unescaped-entities': 'off',

      // setMounted(true) in useEffect is a valid SSR hydration guard pattern
      'react-hooks/set-state-in-effect': 'off',

      // React Compiler sub-rules — downgraded to warn while codebase is being migrated.
      // These fire on patterns the compiler can't optimise but that are functionally valid.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',

      // Downgraded while existing code is cleaned up
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@next/next/no-assign-module-variable': 'warn',

      // Many files use require() for dynamic imports and CJS-specific patterns.
      // Downgraded to warn while the codebase is migrated to ESM imports.
      '@typescript-eslint/no-require-imports': 'warn',

      // Ban direct `createClient` imports from @supabase/supabase-js in app code.
      // Use the canonical wrappers in @/lib/api/supabaseServer instead:
      //   - createAnonClient() for public/anon operations
      //   - createServerSupabaseClient() for service-role operations
      //   - createUserScopedClient(jwt) for user-scoped (RLS-respecting) operations
      // Type-only imports (e.g. `import type { SupabaseClient }`) are still allowed.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              importNames: ['createClient'],
              message:
                'Do not import createClient directly. Use createAnonClient / createServerSupabaseClient / createUserScopedClient from @/lib/api/supabaseServer.',
            },
          ],
        },
      ],
    },
  },

  // Exempt the canonical wrapper itself and test utilities — these are the
  // legitimate places where createClient is imported.
  //
  // 2026-04-27: extended to cover all script + test paths surfaced by the
  // CI lint pass. These are infra (migration runners, schema validators,
  // model uploaders) or test setup (creating scoped clients with specific
  // JWTs to verify RLS policies). Application code in
  // `lib/notifications/feed.ts`, `lib/supabase.ts`, and the
  // `bids/[bidId]/accept/_helpers.ts` route helper still need to be
  // canonicalized; tracked separately as P2.
  {
    files: [
      '**/lib/api/supabaseServer.ts',
      '**/lib/supabase/server.ts',
      '**/lib/supabase.ts', // canonical browser anon-key client
      '**/test/integration/**',
      '**/__tests__/**',
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/scripts/**',
      '**/e2e/**',
      '**/hooks/useRealtime.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Allow console in CLI scripts, config files, and infrastructure code
  {
    files: [
      '**/scripts/**/*.ts',
      '**/scripts/**/*.js',
      '**/migration-runner.ts',
      '**/redis-validator.ts',
      '**/instrumentation.ts',
      '**/lib/logger.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // Stricter rules for API routes
  {
    files: ['**/app/api/**/*.ts', '**/app/api/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Downgrade prefer-const to warn for large files pending refactor
  // These files exceed the 500-line limit and cannot be committed with changes
  // until they are split. The prefer-const violations are non-functional.
  {
    files: [
      '**/lib/auth-manager.ts',
      '**/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts',
    ],
    rules: {
      'prefer-const': 'warn',
    },
  },
]);

export default eslintConfig;
