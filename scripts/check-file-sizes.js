#!/usr/bin/env node

/**
 * Check File Sizes
 * 
 * This script identifies files that exceed the 500-line limit
 * as specified in the project rules.
 * 
 * Usage: node scripts/check-file-sizes.js
 */

const fs = require('fs');
const path = require('path');

const WEB_APP_DIR = path.join(__dirname, '../apps/web');
const MOBILE_APP_DIR = path.join(__dirname, '../apps/mobile');
const MAX_LINES = 500;
const WARNING_LINES = 400;

const LARGE_FILES = [];
const WARNING_FILES = [];

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist, etc.
      if (
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== '.next' &&
        file !== 'dist' &&
        file !== 'coverage' &&
        file !== 'build'
      ) {
        findFiles(filePath, fileList);
      }
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.endsWith('.d.ts') &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function analyzeFiles(baseDir, appName) {
  const files = findFiles(baseDir);
  console.log(`\n📁 Analyzing ${appName} (${files.length} files)...\n`);

  files.forEach((filePath) => {
    const lineCount = countLines(filePath);
    const relativePath = path.relative(baseDir, filePath);

    if (lineCount > MAX_LINES) {
      LARGE_FILES.push({
        file: relativePath,
        fullPath: filePath,
        lines: lineCount,
        app: appName,
        exceedsBy: lineCount - MAX_LINES,
      });
    } else if (lineCount > WARNING_LINES) {
      WARNING_FILES.push({
        file: relativePath,
        fullPath: filePath,
        lines: lineCount,
        app: appName,
      });
    }
  });
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 File Size Audit Report\n');

  if (LARGE_FILES.length === 0) {
    console.log('✅ No files exceed the 500-line limit!\n');
  } else {
    console.log(`❌ Files exceeding 500-line limit (${LARGE_FILES.length}):\n`);
    LARGE_FILES.sort((a, b) => b.lines - a.lines).forEach((item) => {
      console.log(`   ${item.file}`);
      console.log(`   Lines: ${item.lines} (exceeds by ${item.exceedsBy})`);
      console.log(`   App: ${item.app}`);
      console.log('');
    });
  }

  if (WARNING_FILES.length > 0) {
    console.log(`\n⚠️  Files approaching limit (${WARNING_FILES.length} files > ${WARNING_LINES} lines):\n`);
    WARNING_FILES.sort((a, b) => b.lines - a.lines).slice(0, 10).forEach((item) => {
      console.log(`   ${item.file} (${item.lines} lines)`);
    });
    if (WARNING_FILES.length > 10) {
      console.log(`   ... and ${WARNING_FILES.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Recommendations:\n');
  console.log('1. Split large files into smaller, focused modules');
  console.log('2. Extract business logic into separate service files');
  console.log('3. Move validation schemas to separate files');
  console.log('4. Extract helper functions to utility files');
  console.log('5. Consider breaking components into smaller sub-components\n');

  // Save report
  const reportPath = path.join(__dirname, '../file-size-audit-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          largeFiles: LARGE_FILES.length,
          warningFiles: WARNING_FILES.length,
        },
        largeFiles: LARGE_FILES,
        warningFiles: WARNING_FILES,
      },
      null,
      2
    )
  );
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Main execution
try {
  console.log('🔍 Scanning for large files...\n');
  
  analyzeFiles(WEB_APP_DIR, 'Web App');
  analyzeFiles(MOBILE_APP_DIR, 'Mobile App');

  generateReport();

  // Exit with error code if large files found
  if (LARGE_FILES.length > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('Error running file size check:', error);
  process.exit(1);
}
