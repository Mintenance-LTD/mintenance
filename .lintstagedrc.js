module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': (filenames) => {
    // Root ESLint deliberately ignores apps/**. Run each app from its workspace
    // so the hook actually applies that app's rules to staged source files.
    const groups = { web: [], mobile: [], root: [] };
    for (const filename of filenames) {
      const normalized = filename.replace(/\\/g, '/');
      const group = normalized.includes('/apps/web/') ? 'web'
        : normalized.includes('/apps/mobile/') ? 'mobile' : 'root';
      groups[group].push(JSON.stringify(normalized));
    }
    const commands = [];
    for (const [group, files] of Object.entries(groups)) {
      if (!files.length) continue;
      const prefix = group === 'root' ? '' : `npm exec --workspace @mintenance/${group} -- `;
      commands.push(`${prefix}eslint --fix --max-warnings=0 --no-warn-ignored ${files.join(' ')}`);
    }
    commands.push(`prettier --write ${filenames.map((filename) => JSON.stringify(filename.replace(/\\/g, '/'))).join(' ')}`);
    return commands;
  },

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

  // Test files - run related tests in the correct workspace.
  // --passWithNoTests (parity with the mobile rule below) is required so that
  // staging a file the default vitest config excludes — e.g. the real-DB
  // integration tests in __tests__/integration-real/** (which run via
  // vitest.integration.config.ts, not this one) — doesn't fail the hook with
  // "No test files found".
  'apps/web/**/__tests__/**/*.{ts,tsx}': (filenames) =>
    `npm run test -w @mintenance/web -- --bail 1 --passWithNoTests ${filenames.join(' ')}`,
  'apps/mobile/**/__tests__/**/*.{ts,tsx}': (filenames) =>
    `npm run test -w @mintenance/mobile -- --passWithNoTests ${filenames.join(' ')}`,

  // Package files - verify dependencies
  // Use a function to prevent lint-staged from appending file paths to the command,
  // which would break 'tsc -p tsconfig.json' with TS5042 when files are passed as args.
  'package.json': () => 'npm run build:packages',
};
