#!/usr/bin/env node

/**
 * Script to find remaining console statements in production code
 * Excludes test files and node_modules
 */

const fs = require('fs');
const path = require('path');

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /__tests__/,
  /__mocks__/,
  /coverage/,
  /test-results/,
  /playwright-report/,
  /jest\.setup\.js/,
  /jest\.config\.js/,
  /\.next/,          // Next.js build output
  /dist/,            // Build output
  /build/,           // Build output
  /\.turbo/,         // Turbo cache
  /\.expo/,          // Expo cache
  /scripts/,         // CLI scripts legitimately use console
  /logger\.ts$/,     // Logger implementation uses console internally
  /setup\.ts$/,      // Test setup mocks console
  /migration-runner\.ts$/, // CLI migration tool
  /redis-validator\.ts$/,  // CLI validation tool
];

const INCLUDE_PATTERNS = [
  /\.ts$/,
  /\.tsx$/,
  /\.js$/,
  /\.jsx$/,
];

const CONSOLE_PATTERNS = [
  /console\.log/,
  /console\.error/,
  /console\.warn/,
  /console\.info/,
  /console\.debug/,
  /console\.trace/,
  /console\.table/,
  /console\.dir/,
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldInclude(filePath) {
  return INCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function findConsoleStatements(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.includes('/*')) {
      return;
    }

    CONSOLE_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        matches.push({
          line: index + 1,
          content: line.trim(),
          statement: line.match(pattern)?.[0] || 'console.*',
        });
      }
    });
  });

  return matches;
}

function scanDirectory(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExclude(fullPath)) {
        scanDirectory(fullPath, results);
      }
    } else if (entry.isFile() && shouldInclude(fullPath) && !shouldExclude(fullPath)) {
      const matches = findConsoleStatements(fullPath);
      if (matches.length > 0) {
        results.push({
          file: fullPath,
          matches,
        });
      }
    }
  }

  return results;
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const webAppPath = path.join(projectRoot, 'apps', 'web');
  const packagesPath = path.join(projectRoot, 'packages');

  console.log('Scanning for console statements in production code...\n');

  const results = [];

  // Scan web app
  if (fs.existsSync(webAppPath)) {
    console.log(`Scanning ${webAppPath}...`);
    const webResults = scanDirectory(webAppPath);
    results.push(...webResults);
  }

  // Scan packages
  if (fs.existsSync(packagesPath)) {
    console.log(`Scanning ${packagesPath}...`);
    const packageResults = scanDirectory(packagesPath);
    results.push(...packageResults);
  }

  // Report results
  if (results.length === 0) {
    console.log('✅ No console statements found in production code!');
    process.exit(0);
  }

  console.log(`\n❌ Found ${results.length} files with console statements:\n`);

  let totalConsoleCount = 0;
  results.forEach(({ file, matches }) => {
    console.log(`📄 ${file}`);
    matches.forEach(({ line, content, statement }) => {
      console.log(`   Line ${line}: ${statement}`);
      console.log(`   ${content.substring(0, 100)}`);
      totalConsoleCount++;
    });
    console.log('');
  });

  console.log(`\nTotal console statement occurrences: ${totalConsoleCount}`);
  console.log('\n💡 Tip: Replace console statements with logger from @mintenance/shared');

  // Write results to file
  const outputPath = path.join(projectRoot, 'console-statements-report.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(results, null, 2)
  );
  console.log(`\n📊 Report saved to: ${outputPath}`);

  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { findConsoleStatements, scanDirectory };

