#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Ensure we're in the root directory
const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

const packages = [
  '@mintenance/types',
  '@mintenance/shared',
  '@mintenance/auth',
  '@mintenance/design-tokens',
  '@mintenance/api-client'
];

console.log('Building packages in order...\n');

for (const pkg of packages) {
  console.log(`Building ${pkg}...`);
  try {
    execSync(`npm run build -w ${pkg}`, { stdio: 'inherit', cwd: rootDir });
    console.log(`✓ ${pkg} built successfully\n`);
  } catch (error) {
    console.error(`✗ Failed to build ${pkg}`);
    process.exit(1);
  }
}

console.log('All packages built successfully!');

