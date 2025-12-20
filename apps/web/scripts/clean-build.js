#!/usr/bin/env node

/**
 * Clean Build Script
 * Removes all build artifacts and caches to ensure clean builds
 * Run before production builds to prevent 1.6GB bundle issues
 */

const fs = require('fs');
const path = require('path');

const dirsToClean = [
  '.next',
  '.next/cache',
  '.next/dev',
  'dist',
  'build',
  '.turbo'
];

const filesToRemove = [
  'models/*.onnx',
  'models/*.pt',
  'models/*.pth',
  'models/*.h5'
];

console.log('🧹 Cleaning build artifacts...\n');

// Clean directories
dirsToClean.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ Removing ${dir}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    console.log(`  - Skipping ${dir} (not found)`);
  }
});

// Clean specific files
const glob = require('glob');
filesToRemove.forEach(pattern => {
  const files = glob.sync(pattern);
  files.forEach(file => {
    console.log(`  ✓ Removing ${file}`);
    fs.unlinkSync(file);
  });
});

console.log('\n✅ Build artifacts cleaned successfully!');
console.log('📦 Ready for fresh build\n');