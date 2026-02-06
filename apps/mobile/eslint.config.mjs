import expoConfig from 'eslint-config-expo/flat.js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  ...expoConfig,
  prettier,

  // Custom rules (with typescript-eslint plugin for @typescript-eslint/* rules)
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Enforce structured logging
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Warn on any types
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
    },
  },

  // Allow console in logger implementation and tests
  {
    files: ['**/utils/logger.ts', '**/__tests__/utils/logger.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'build/**'],
  },
];
