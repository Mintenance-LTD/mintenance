module.exports = {
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: [
    '@typescript-eslint',
    'react'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
    // Removed project reference to avoid circular issues
  },
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
  },
  rules: {
    // CRITICAL: MANDATORY RULES - NO EXCEPTIONS

    // ❌ ABSOLUTELY FORBIDDEN - Zero Tolerance
    'no-console': 'error', // NO console.log allowed - use logger
    '@typescript-eslint/no-explicit-any': 'error', // NO any types allowed
    '@typescript-eslint/no-non-null-assertion': 'error', // NO ! operator
    '@typescript-eslint/ban-ts-comment': 'error', // NO @ts-ignore, @ts-nocheck

    // File and Function Size Limits (via external plugin required)
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-nested-callbacks': ['error', 3],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
    'complexity': ['error', 10], // Cyclomatic complexity

    // TypeScript Strict Rules (non-type-aware rules only for now)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true
    }],
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    // Note: Type-aware rules disabled until proper project setup
    // '@typescript-eslint/strict-boolean-expressions': 'error',
    // '@typescript-eslint/no-floating-promises': 'error',
    // '@typescript-eslint/no-misused-promises': 'error',
    // '@typescript-eslint/await-thenable': 'error',
    // '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    // '@typescript-eslint/no-unsafe-assignment': 'error',
    // '@typescript-eslint/no-unsafe-member-access': 'error',
    // '@typescript-eslint/no-unsafe-call': 'error',
    // '@typescript-eslint/no-unsafe-return': 'error',

    // Import restrictions
    'no-restricted-imports': ['error', {
      'patterns': [
        {
          'group': ['apps/web/lib/database', 'apps/web/lib/database.ts', 'apps/web/server/**'],
          'message': 'Do not import server-only modules into client code.'
        }
      ],
      'paths': [
        {
          'name': 'console',
          'message': 'Use logger from @mintenance/shared instead of console'
        }
      ]
    }],

    // React specific
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'error',
    'react/jsx-no-useless-fragment': 'error',

    // General code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'no-duplicate-imports': 'error',
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'no-else-return': 'error',
    'arrow-body-style': ['error', 'as-needed'],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Testing rules removed - jest plugin not installed
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    'coverage/',
    '.eslintrc.js',
    '*.config.js',
    '*.d.ts'
  ],
};

