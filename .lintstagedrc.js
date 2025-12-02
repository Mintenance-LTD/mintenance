module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix --max-warnings=0',
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

  // Test files - run tests
  '**/__tests__/**/*.{ts,tsx}': [
    'npm test -- --bail --findRelatedTests',
  ],

  // Package files - verify dependencies
  'package.json': [
    'npm run build:packages || true',
  ],
};
