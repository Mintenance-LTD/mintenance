module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    // Enforce structured logging - no console.log allowed
    // All console statements should use logger from @mintenance/shared
    'no-console': [
      'error',
      {
        allow: [], // No console statements allowed - use logger instead
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
      // Allow console statements only in scripts and migration runners (CLI tools)
      files: [
        '**/scripts/**/*.ts',
        '**/scripts/**/*.js',
        '**/migration-runner.ts',
        '**/redis-validator.ts',
      ],
      rules: {
        'no-console': 'off', // CLI scripts can use console
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
