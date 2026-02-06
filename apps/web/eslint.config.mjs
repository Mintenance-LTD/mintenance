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
  ]),

  // Custom rules
  {
    rules: {
      // Enforce structured logging - no console.log allowed
      'no-console': 'error',

      // Warn on any types (upgrade to error after fixing existing issues)
      '@typescript-eslint/no-explicit-any': 'warn',

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

      // Enforce correct casing for imports (prevents Linux deployment issues)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/ui/button', '**/components/ui/card'],
              message:
                'Use PascalCase paths: @/components/ui/Button and @/components/ui/Card (required for Linux deployments)',
            },
          ],
        },
      ],
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
