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
    '__tests__/**',
    '__mocks__/**',
    '_archived/**',
    'e2e/**',
    'test/**',
    'test-*.ts',
    'sentry.*.config.ts',
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
    },
  },

  // Allow console in CLI scripts
  {
    files: [
      '**/scripts/**/*.ts',
      '**/scripts/**/*.js',
      '**/migration-runner.ts',
      '**/redis-validator.ts',
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
]);

export default eslintConfig;
