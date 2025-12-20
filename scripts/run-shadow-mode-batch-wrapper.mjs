#!/usr/bin/env node
/**
 * Wrapper script to run shadow mode batch with proper path resolution
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Run tsx with explicit tsconfig (use absolute path)
const scriptPath = resolve(__dirname, 'run-shadow-mode-batch.ts');
const tsconfigPath = resolve(__dirname, 'tsconfig.json');
const csvPath = process.argv[2] || resolve(projectRoot, 'training-data/ground-truth-labels.csv');

// Convert to file:// URL for absolute path (tsx expects this)
const tsconfigUrl = pathToFileURL(tsconfigPath).href;

const child = spawn('npx', [
  'tsx',
  '--tsconfig',
  tsconfigPath, // Use absolute path directly
  scriptPath,
  csvPath
], {
  stdio: 'inherit',
  shell: true,
  cwd: projectRoot,
  env: {
    ...process.env,
    // Ensure tsx uses the correct working directory
    TSX_TSCONFIG_PATH: tsconfigPath,
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

