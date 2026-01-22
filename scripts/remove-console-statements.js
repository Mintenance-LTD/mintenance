#!/usr/bin/env node

/**
 * Script to remove console statements from the codebase
 * This is a security measure to prevent sensitive data exposure in production
 */

const fs = require('fs').promises;
const path = require('path');

// Patterns to match console statements
const CONSOLE_PATTERNS = [
  // Direct console method calls with parentheses
  /console\.(log|error|warn|info|debug|trace|time|timeEnd|table|group|groupEnd|assert|count|clear|dir|dirxml|profile|profileEnd)\s*\([^)]*\)/g,
  /console\.(log|error|warn|info|debug|trace|time|timeEnd|table|group|groupEnd|assert|count|clear|dir|dirxml|profile|profileEnd)\s*\([^)]*\)\s*;/g,
  // Multi-line console statements
  /console\.(log|error|warn|info|debug|trace)\s*\([^)]*\n[^)]*\)/gm,
  /console\.(log|error|warn|info|debug|trace)\s*\([^)]*\n[^)]*\)\s*;/gm,
  // Console methods passed as references (e.g., .catch(console.error))
  /\.catch\s*\(\s*console\.(log|error|warn|info|debug)\s*\)/g,
  /\.then\s*\(\s*console\.(log|error|warn|info|debug)\s*\)/g,
  // Console in conditionals
  /\?\s*console\.(log|error|warn|info|debug)/g,
  /:\s*console\.(log|error|warn|info|debug)/g,
];

// Files/folders to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/test/**',
  '**/tests/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/scripts/**',
  '**/logger.ts',
  '**/logger.js',
  '**/logger.tsx',
  '**/errorHandler.ts',
  '**/errorTracking/**',
  '**/sentry*.ts',
  '**/monitoring/**',
];

async function removeConsoleStatements(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let originalContent = content;
    let removedCount = 0;

    // Skip if file contains logger-related code
    if (content.includes('createLogger') ||
        content.includes('winston') ||
        content.includes('pino') ||
        content.includes('bunyan') ||
        content.includes('log4js') ||
        filePath.includes('logger') ||
        filePath.includes('logging')) {
      return { path: filePath, skipped: true, reason: 'logger file' };
    }

    // Remove console statements
    for (let i = 0; i < CONSOLE_PATTERNS.length; i++) {
      const pattern = CONSOLE_PATTERNS[i];
      const matches = content.match(pattern);
      if (matches) {
        removedCount += matches.length;

        // Handle different replacement strategies based on pattern type
        if (i >= 4 && i <= 5) {
          // For .catch(console.error) and .then(console.log), replace with empty function
          content = content.replace(pattern, (match) => {
            if (match.includes('.catch')) {
              return '.catch(() => {})';
            } else if (match.includes('.then')) {
              return '.then(() => {})';
            }
            return '';
          });
        } else if (i >= 6 && i <= 7) {
          // For ternary operators with console, replace with empty string
          content = content.replace(pattern, (match) => {
            if (match.startsWith('?')) {
              return '? ""';
            } else if (match.startsWith(':')) {
              return ': ""';
            }
            return '';
          });
        } else {
          // For regular console statements, just remove them
          content = content.replace(pattern, '');
        }
      }
    }

    // Clean up empty lines left behind
    content = content.replace(/^\s*\n\s*\n/gm, '\n');
    content = content.replace(/{\s*\n\s*}/g, '{}');
    content = content.replace(/\(\s*\n\s*\)/g, '()');

    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      return { path: filePath, removed: removedCount };
    }

    return { path: filePath, removed: 0 };
  } catch (error) {
    return { path: filePath, error: error.message };
  }
}

async function getAllFiles(dir, extensions = ['ts', 'tsx', 'js', 'jsx']) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip excluded patterns
      const shouldSkip = EXCLUDE_PATTERNS.some(pattern => {
        const simplePattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
        return fullPath.includes(simplePattern.replace(/\//g, path.sep));
      });

      if (shouldSkip) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files;
}

async function processDirectory(directory, extensions = ['ts', 'tsx', 'js', 'jsx']) {
  const results = [];
  let totalRemoved = 0;
  let totalFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;

  const files = await getAllFiles(directory, extensions);

  for (const file of files) {
    const result = await removeConsoleStatements(file);

    if (result.error) {
      console.error(`Error processing ${file}: ${result.error}`);
      errorFiles++;
    } else if (result.skipped) {
      skippedFiles++;
    } else if (result.removed > 0) {
      console.log(`✓ Removed ${result.removed} console statements from ${path.relative(process.cwd(), file)}`);
      totalRemoved += result.removed;
      totalFiles++;
    }

    results.push(result);
  }

  return {
    results,
    totalRemoved,
    totalFiles,
    skippedFiles,
    errorFiles,
    totalProcessed: results.length
  };
}

async function main() {
  console.log('🔍 Removing console statements for security...\n');

  const directories = [
    'apps/web',
    'apps/mobile/src',
    'packages'
  ];

  let grandTotal = 0;
  let grandTotalFiles = 0;

  for (const dir of directories) {
    console.log(`\n📁 Processing ${dir}...`);

    try {
      const stats = await fs.stat(dir);
      if (!stats.isDirectory()) {
        console.log(`  ⚠️  ${dir} is not a directory, skipping...`);
        continue;
      }
    } catch (error) {
      console.log(`  ⚠️  ${dir} does not exist, skipping...`);
      continue;
    }

    const { totalRemoved, totalFiles, skippedFiles, errorFiles, totalProcessed } = await processDirectory(dir);

    console.log(`  📊 ${dir} Summary:`);
    console.log(`     - Files processed: ${totalProcessed}`);
    console.log(`     - Files modified: ${totalFiles}`);
    console.log(`     - Files skipped: ${skippedFiles}`);
    console.log(`     - Files with errors: ${errorFiles}`);
    console.log(`     - Console statements removed: ${totalRemoved}`);

    grandTotal += totalRemoved;
    grandTotalFiles += totalFiles;
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ SECURITY HARDENING COMPLETE');
  console.log('='.repeat(50));
  console.log(`🎯 Total console statements removed: ${grandTotal}`);
  console.log(`📝 Total files modified: ${grandTotalFiles}`);
  console.log('\n⚠️  Remember to review the changes and test your application!');
  console.log('💡 Consider using a proper logging library for production.');
}

// Run the script
main().catch(console.error);