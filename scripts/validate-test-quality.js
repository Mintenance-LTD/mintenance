#!/usr/bin/env node

/**
 * Test Quality Validator
 *
 * Detects "mock-only" tests that validate mocks but don't test production code.
 *
 * Usage:
 *   node scripts/validate-test-quality.js [file]
 *   node scripts/validate-test-quality.js apps/mobile/src/__tests__/services/PaymentService.test.ts
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate mock-only testing
const MOCK_ONLY_PATTERNS = [
  /expect\([^)]*mock[^)]*\)\.toHaveBeenCalled/,
  /expect\([^)]*mock[^)]*\)\.toHaveBeenCalledWith/,
  /expect\([^)]*mock[^)]*\)\.toHaveBeenCalledTimes/,
];

// Patterns that indicate real behavior testing
const REAL_TEST_PATTERNS = [
  /expect\([^)]*\)\.(toBe|toEqual|toStrictEqual)\(/,
  /expect\([^)]*\)\.toThrow/,
  /expect\([^)]*\)\.(toBeGreaterThan|toBeLessThan)/,
  /expect\([^)]*\)\.(toContain|toMatch)/,
  /expect\([^)]*\)\.(toBeTruthy|toBeFalsy)/,
  /expect\([^)]*\)\.(toHaveProperty|toHaveLength)/,
];

function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const lines = content.split('\n');
  const testBlocks = extractTestBlocks(content);

  const results = {
    file: filePath,
    totalTests: testBlocks.length,
    mockOnlyTests: 0,
    realTests: 0,
    hybridTests: 0,
    issues: [],
  };

  testBlocks.forEach((block, index) => {
    const hasMockAssertions = MOCK_ONLY_PATTERNS.some(pattern => pattern.test(block.content));
    const hasRealAssertions = REAL_TEST_PATTERNS.some(pattern => pattern.test(block.content));

    if (hasMockAssertions && !hasRealAssertions) {
      results.mockOnlyTests++;
      results.issues.push({
        testName: block.name,
        line: block.line,
        issue: 'Mock-only test: Only validates mock calls, no real behavior assertions',
        severity: 'HIGH',
      });
    } else if (hasRealAssertions && !hasMockAssertions) {
      results.realTests++;
    } else if (hasMockAssertions && hasRealAssertions) {
      results.hybridTests++;
    }
  });

  return results;
}

function extractTestBlocks(content) {
  const testBlocks = [];
  const lines = content.split('\n');
  let currentBlock = null;
  let braceDepth = 0;

  lines.forEach((line, index) => {
    // Match test declarations: it('...', () => {
    const testMatch = line.match(/^\s*(it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);

    if (testMatch) {
      currentBlock = {
        name: testMatch[2],
        line: index + 1,
        content: '',
        startLine: index + 1,
      };
      braceDepth = 0;
    }

    if (currentBlock) {
      currentBlock.content += line + '\n';

      // Track brace depth
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // End of test block
      if (braceDepth === 0 && line.includes('}')) {
        testBlocks.push(currentBlock);
        currentBlock = null;
      }
    }
  });

  return testBlocks;
}

function printReport(results) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST QUALITY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`File: ${path.basename(results.file)}`);
  console.log(`Total Tests: ${results.totalTests}\n`);

  console.log('Test Classification:');
  console.log(`  ❌ Mock-Only:  ${results.mockOnlyTests} (${((results.mockOnlyTests / results.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ✅ Real Logic: ${results.realTests} (${((results.realTests / results.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  🔄 Hybrid:     ${results.hybridTests} (${((results.hybridTests / results.totalTests) * 100).toFixed(1)}%)\n`);

  if (results.issues.length > 0) {
    console.log('⚠️  ISSUES FOUND:\n');
    results.issues.forEach(({ testName, line, issue, severity }) => {
      console.log(`  [${severity}] Line ${line}: "${testName}"`);
      console.log(`         ${issue}\n`);
    });
  }

  // Quality score
  const qualityScore = ((results.realTests + results.hybridTests) / results.totalTests) * 100;
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Quality Score: ${qualityScore.toFixed(1)}%`);

  if (qualityScore < 50) {
    console.log('Grade: ❌ FAIL - Most tests are mock-only');
  } else if (qualityScore < 75) {
    console.log('Grade: ⚠️  NEEDS IMPROVEMENT');
  } else if (qualityScore < 90) {
    console.log('Grade: ✅ GOOD');
  } else {
    console.log('Grade: ⭐ EXCELLENT');
  }
  console.log('═══════════════════════════════════════════════════════\n');

  return qualityScore >= 50;
}

function scanDirectory(dirPath) {
  const results = [];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        scan(fullPath);
      } else if (entry.isFile() && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  scan(dirPath);
  return results;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node scripts/validate-test-quality.js <test-file-or-directory>');
  console.log('\nExamples:');
  console.log('  node scripts/validate-test-quality.js apps/mobile/src/__tests__/services/PaymentService.test.ts');
  console.log('  node scripts/validate-test-quality.js apps/mobile/src/__tests__/services');
  process.exit(1);
}

const target = args[0];
const stats = fs.statSync(target);

if (stats.isDirectory()) {
  console.log(`Scanning directory: ${target}\n`);
  const testFiles = scanDirectory(target);

  console.log(`Found ${testFiles.length} test files\n`);

  const allResults = testFiles.map(file => ({
    file: path.basename(file),
    ...analyzeTestFile(file)
  }));

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DIRECTORY SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const totals = allResults.reduce((acc, r) => ({
    totalTests: acc.totalTests + r.totalTests,
    mockOnlyTests: acc.mockOnlyTests + r.mockOnlyTests,
    realTests: acc.realTests + r.realTests,
    hybridTests: acc.hybridTests + r.hybridTests,
  }), { totalTests: 0, mockOnlyTests: 0, realTests: 0, hybridTests: 0 });

  console.log(`Total Test Files: ${allResults.length}`);
  console.log(`Total Tests: ${totals.totalTests}\n`);
  console.log(`Mock-Only Tests: ${totals.mockOnlyTests} (${((totals.mockOnlyTests / totals.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Real Logic Tests: ${totals.realTests} (${((totals.realTests / totals.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Hybrid Tests: ${totals.hybridTests} (${((totals.hybridTests / totals.totalTests) * 100).toFixed(1)}%)\n`);

  // Files with worst quality
  const worstFiles = allResults
    .filter(r => r.totalTests > 0)
    .map(r => ({
      ...r,
      quality: ((r.realTests + r.hybridTests) / r.totalTests) * 100
    }))
    .sort((a, b) => a.quality - b.quality)
    .slice(0, 10);

  console.log('📉 Files Needing Most Improvement:\n');
  worstFiles.forEach(({ file, totalTests, mockOnlyTests, quality }) => {
    console.log(`  ${file}`);
    console.log(`    Quality: ${quality.toFixed(1)}% | Mock-only: ${mockOnlyTests}/${totalTests}\n`);
  });

} else {
  // Single file analysis
  const results = analyzeTestFile(target);
  const passed = printReport(results);
  process.exit(passed ? 0 : 1);
}
