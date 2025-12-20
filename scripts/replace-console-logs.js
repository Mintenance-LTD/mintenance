#!/usr/bin/env node

/**
 * Replace console.log with proper logger
 * 
 * This script helps identify and optionally replace console.log
 * statements with the production-safe logger.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const SCAN_DIRS = [
  'apps/mobile/src',
  'apps/web',
  'packages'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.expo',
  '__tests__',
  '.test.',
  '.spec.',
  'coverage'
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (shouldExclude(fullPath)) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    // Match console.log, console.error, console.warn, console.info
    const consoleMatch = line.match(/console\.(log|error|warn|info|debug)/);
    
    if (consoleMatch) {
      issues.push({
        file: filePath,
        line: index + 1,
        type: consoleMatch[1],
        code: line.trim()
      });
    }
  });

  return issues;
}

function generateReport() {
  console.log('🔍 Scanning for console.* statements...\n');

  let allIssues = [];

  SCAN_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      files.forEach(file => {
        const issues = analyzeFile(file);
        allIssues = allIssues.concat(issues);
      });
    }
  });

  // Group by type
  const byType = allIssues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});

  // Group by file
  const byFile = allIssues.reduce((acc, issue) => {
    const fileName = path.basename(issue.file);
    if (!acc[fileName]) {
      acc[fileName] = [];
    }
    acc[fileName].push(issue);
    return acc;
  }, {});

  console.log('📊 Summary:');
  console.log('  Total console statements:', allIssues.length);
  console.log('  By type:', JSON.stringify(byType, null, 2));
  console.log('\n📁 Files with most console statements:');
  
  const sortedFiles = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  sortedFiles.forEach(([fileName, issues]) => {
    console.log(`  ${fileName}: ${issues.length} statement(s)`);
  });

  console.log('\n📝 Sample issues (first 10):');
  allIssues.slice(0, 10).forEach(issue => {
    console.log(`  ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
    console.log(`    ${issue.code}`);
  });

  // Generate replacement guide
  console.log('\n📖 Replacement Guide:');
  console.log('  console.log(msg, data)   →  logger.info(msg, { ...data })');
  console.log('  console.error(msg, err)  →  logger.error(msg, err, { context })');
  console.log('  console.warn(msg)        →  logger.warn(msg)');
  console.log('  console.debug(msg)       →  logger.debug(msg)');

  console.log('\n💡 Next Steps:');
  console.log('  1. Import logger: import { logger } from \'@mintenance/shared\';');
  console.log('  2. Replace console statements systematically');
  console.log('  3. Add context objects for better debugging');
  console.log('  4. Test in both development and production modes');

  return allIssues;
}

// Run the analysis
if (require.main === module) {
  generateReport();
}

module.exports = { analyzeFile, getAllFiles };
