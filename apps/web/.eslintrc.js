module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    // Enforce structured logging - no console.log allowed
    // Based on code review: 631 instances found that need replacement
    'no-console': [
      'error',
      {
        allow: ['warn', 'error'], // Temporarily allow warn/error while migrating to logger
      },
    ],
    // Enforce no explicit any types
    // Based on code review: 634 instances found
    '@typescript-eslint/no-explicit-any': [
      'warn', // Start with warn, upgrade to error after fixing existing issues
      {
        fixToUnknown: true, // Suggest 'unknown' instead of 'any'
        ignoreRestArgs: false, // Don't ignore rest args
      },
    ],
    // Prevent usage of @ts-ignore
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      },
    ],
    // Require explicit return types on exported functions (warn level for now)
    '@typescript-eslint/explicit-function-return-type': 'off', // Disabled for now - too many violations
  },
  overrides: [
    {
      // Allow console statements only in logger implementation and instrumentation
      files: [
        '**/lib/logger.ts',
        '**/instrumentation.ts',
        '**/scripts/**/*.ts',
        '**/scripts/**/*.js',
      ],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Stricter rules for API routes
      files: ['**/app/api/**/*.ts', '**/app/api/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
