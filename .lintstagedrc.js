module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write',
  ],

  // JSON files
  '*.json': [
    'prettier --write',
  ],

  // Markdown files
  '*.md': [
    'prettier --write',
  ],

  // CSS/SCSS files
  '*.{css,scss}': [
    'prettier --write',
  ],

  // Test files - run related tests in the correct workspace
  'apps/web/**/__tests__/**/*.{ts,tsx}': (filenames) =>
    `npm run test -w @mintenance/web -- --bail 1 ${filenames.join(' ')}`,
  'apps/mobile/**/__tests__/**/*.{ts,tsx}': (filenames) =>
    `npm run test -w @mintenance/mobile -- --passWithNoTests ${filenames.join(' ')}`,

  // Package files - verify dependencies
  // Use a function to prevent lint-staged from appending file paths to the command,
  // which would break 'tsc -p tsconfig.json' with TS5042 when files are passed as args.
  'package.json': () => 'npm run build:packages',
};
