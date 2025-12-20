#!/usr/bin/env node

/**
 * Script to find remaining 'any' types in production code
 * Excludes test files and node_modules
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /__tests__/,
  /__mocks__/,
  /coverage/,
  /\.d\.ts$/,
  /test-results/,
  /playwright-report/,
];

const INCLUDE_PATTERNS = [
  /\.ts$/,
  /\.tsx$/,
];

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldInclude(filePath) {
  return INCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function findAnyTypes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    // Match 'any' type usage (but not in comments or strings)
    const anyPattern = /:\s*any\b|<\s*any\s*>|any\[\]|any\s*\|/g;
    let match;
    
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.includes('/*')) {
      return;
    }

    while ((match = anyPattern.exec(line)) !== null) {
      matches.push({
        line: index + 1,
        content: line.trim(),
        match: match[0],
      });
    }
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
      const matches = findAnyTypes(fullPath);
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

  console.log('Scanning for "any" types in production code...\n');

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
    console.log('✅ No "any" types found in production code!');
    process.exit(0);
  }

  console.log(`\n❌ Found ${results.length} files with "any" types:\n`);

  let totalAnyCount = 0;
  results.forEach(({ file, matches }) => {
    console.log(`📄 ${file}`);
    matches.forEach(({ line, content, match }) => {
      console.log(`   Line ${line}: ${match}`);
      console.log(`   ${content.substring(0, 100)}`);
      totalAnyCount++;
    });
    console.log('');
  });

  console.log(`\nTotal "any" type occurrences: ${totalAnyCount}`);
  console.log('\n💡 Tip: Replace "any" with proper types or "unknown" for better type safety.');

  // Write results to file
  const outputPath = path.join(projectRoot, 'any-types-report.json');
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

module.exports = { findAnyTypes, scanDirectory };

