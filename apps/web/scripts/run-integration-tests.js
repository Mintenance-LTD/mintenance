#!/usr/bin/env node
/*
 * Cross-platform wrapper for real-DB integration tests.
 * Sets INTEGRATION_TESTS=1 then execs vitest. Avoids adding cross-env as a dep.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, INTEGRATION_TESTS: '1' };
const webDir = path.join(__dirname, '..');

// Resolve the installed CLI without npx downloads or platform-specific shells.
const vitestCli = path.join(
  path.dirname(require.resolve('vitest/package.json')),
  'vitest.mjs'
);
const args = [
  vitestCli,
  'run',
  '--config',
  'vitest.integration.config.ts',
  ...process.argv.slice(2),
];

const child = spawn(process.execPath, args, {
  env,
  stdio: 'inherit',
  cwd: webDir,
});

child.on('error', (error) => {
  console.error('Unable to launch integration tests:', error.message);
  process.exitCode = 1;
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
