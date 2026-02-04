#!/usr/bin/env node
/**
 * Cleanup Root Directory Script
 * Removes development artifacts that shouldn't be in the repo root
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Files to keep (config files, etc.)
const keepFiles = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'README.md',
  'LICENSE',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.easignore',
  'eas.json',
  'lighthouserc.js',
  'playwright.config.js',
  'playwright-visual.config.ts',
  'jest.payment.config.js',
  '.prettierrc.js',
  '.lintstagedrc.js',
  '.gitleaks.toml',
  'index.html',
  'app.json',
  'class_mapping.json',
  'class_mapping_dataset6.json',
]);

// Directories to keep
const keepDirs = new Set([
  'apps',
  'packages',
  'scripts',
  'supabase',
  'migrations',
  '.github',
  '.cursor',
  '.claude',
  '.eas',
  '.husky',
  'infrastructure',
  'public',
  'assets',
  'e2e',
  'components',
  'tools',
  'monitoring',
  'beta-testing-data',
  'batch_test_results',
  'merged_dataset_test',
  'runs',
  'Screenshots',
  'test_results',
  'test-results',
  'playwright-report',
  'temp-supabase-mock',
]);

// Patterns for files to delete
const deletePatterns = [
  /\.sql$/,           // SQL migration scripts (should be in supabase/migrations)
  /\.py$/,            // Python scripts (should be in scripts/)
  /\.ps1$/,           // PowerShell scripts (should be in scripts/)
  /\.txt$/,           // Debug logs and test outputs
  /\.tmp$/,           // Temporary files
  /\.msi$/,           // Installers
  /\.bat$/,           // Batch files (should be in scripts/)
  /\.sh$/,            // Shell scripts (should be in scripts/, but keep deploy.sh if needed)
  /-errors\.txt$/,
  /-report\.txt$/,
  /test-.*\.txt$/,
  /\.json$/,          // JSON reports (keep class_mapping.json)
];

// Files to delete
const filesToDelete = [];

function shouldDelete(fileName) {
  // Keep config files
  if (keepFiles.has(fileName)) {
    return false;
  }

  // Check patterns
  for (const pattern of deletePatterns) {
    if (pattern.test(fileName)) {
      // Special cases - keep some JSON files
      if (fileName.includes('class_mapping') || fileName.includes('package')) {
        return false;
      }
      return true;
    }
  }

  return false;
}

// Scan root directory
const files = fs.readdirSync(rootDir);

for (const file of files) {
  const filePath = path.join(rootDir, file);
  const stat = fs.statSync(filePath);

  if (stat.isFile()) {
    if (shouldDelete(file)) {
      filesToDelete.push(file);
    }
  } else if (stat.isDirectory() && !keepDirs.has(file) && !file.startsWith('.')) {
    // Check if it's a directory that should be cleaned
    console.log(`⚠️  Directory found in root: ${file} (consider moving to scripts/ or removing)`);
  }
}

console.log(`Found ${filesToDelete.length} files to delete from root directory:`);
filesToDelete.forEach(file => console.log(`  - ${file}`));

if (filesToDelete.length > 0) {
  console.log('\n⚠️  Run with --execute to actually delete these files');
  console.log('   Example: node scripts/cleanup-root-directory.js --execute');
  
  if (process.argv.includes('--execute')) {
    console.log('\n🗑️  Deleting files...');
    let deleted = 0;
    let errors = 0;
    
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(path.join(rootDir, file));
        deleted++;
      } catch (error) {
        console.error(`❌ Failed to delete ${file}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Deleted ${deleted} files`);
    if (errors > 0) {
      console.log(`❌ ${errors} files could not be deleted`);
    }
  }
} else {
  console.log('✅ No files to delete');
}
