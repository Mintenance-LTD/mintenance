import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  ...tseslint.configs.recommended,
  prettier,

  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // CLI scripts — console output is intentional, CommonJS required is fine
  {
    files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^[_e]' }],
    },
  },

  {
    ignores: [
      'apps/**',
      'packages/**',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'supabase/**',
      '*.d.ts',
    ],
  },
);
