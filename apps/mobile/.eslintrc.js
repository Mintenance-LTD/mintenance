module.exports = {
  extends: ['expo', 'prettier'],
  rules: {
    // Enforce structured logging - no console.log allowed
    'no-console': [
      'error',
      {
        allow: ['warn', 'error'], // Allow console.warn and console.error for legitimate error logging
      },
    ],
    // Warn on any types (will help reduce 940 instances)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Prevent usage of @ts-ignore
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      },
    ],
  },
  overrides: [
    {
      // Allow console statements in logger implementation and tests
      files: [
        '**/utils/logger.ts',
        '**/__tests__/utils/logger.test.ts',
      ],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
