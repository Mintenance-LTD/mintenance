module.exports = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  
  // Line length
  printWidth: 80,
  
  // JSX specific
  jsxSingleQuote: true,
  bracketSameLine: false,
  
  // Other formatting
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  
  // File type overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
};
