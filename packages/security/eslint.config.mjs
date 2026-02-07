import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
);
