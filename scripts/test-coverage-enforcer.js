#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 Test Coverage Enforcer');
console.log('========================\n');

// Configuration
const COVERAGE_THRESHOLDS = {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/services/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  './src/utils/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
};

function runTestsWithCoverage() {
  console.log('🧪 Running tests with coverage...\n');

  try {
    const result = execSync(
      'npm test -- --coverage --watchAll=false --verbose',
      {
        stdio: 'pipe',
        encoding: 'utf8',
      }
    );

    console.log(result);
    return true;
  } catch (error) {
    console.error('❌ Tests failed:');
    console.error(error.stdout || error.stderr);
    return false;
  }
}

function parseCoverageReport() {
  const coveragePath = './coverage/coverage-summary.json';

  if (!fs.existsSync(coveragePath)) {
    console.error(
      '❌ Coverage report not found. Make sure tests run with --coverage flag.'
    );
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse coverage report:', error.message);
    return null;
  }
}

function checkCoverageThresholds(coverage) {
  console.log('🎯 Checking coverage thresholds...\n');

  let allPassed = true;

  // Check global coverage
  const global = coverage.total;
  console.log('📈 Global Coverage:');

  Object.entries(COVERAGE_THRESHOLDS.global).forEach(([metric, threshold]) => {
    const actual = global[metric].pct;
    const passed = actual >= threshold;

    console.log(
      `   ${metric}: ${actual}% ${passed ? '✅' : '❌'} (threshold: ${threshold}%)`
    );

    if (!passed) {
      allPassed = false;
    }
  });

  console.log();

  // Check specific path thresholds
  Object.entries(COVERAGE_THRESHOLDS).forEach(([pathPattern, thresholds]) => {
    if (pathPattern === 'global') return;

    console.log(`📁 Coverage for ${pathPattern}:`);

    const matchingFiles = Object.keys(coverage).filter((file) =>
      file.startsWith(pathPattern.replace('./', ''))
    );

    if (matchingFiles.length === 0) {
      console.log('   ⚠️  No matching files found\n');
      return;
    }

    // Calculate average coverage for matching files
    const avgCoverage = matchingFiles.reduce((acc, file) => {
      const fileCoverage = coverage[file];
      Object.keys(thresholds).forEach((metric) => {
        acc[metric] = (acc[metric] || 0) + fileCoverage[metric].pct;
      });
      return acc;
    }, {});

    Object.keys(avgCoverage).forEach((metric) => {
      avgCoverage[metric] = avgCoverage[metric] / matchingFiles.length;
    });

    // Check thresholds
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const actual = avgCoverage[metric] || 0;
      const passed = actual >= threshold;

      console.log(
        `   ${metric}: ${actual.toFixed(1)}% ${passed ? '✅' : '❌'} (threshold: ${threshold}%)`
      );

      if (!passed) {
        allPassed = false;
      }
    });

    console.log();
  });

  return allPassed;
}

function generateCoverageReport(coverage) {
  console.log('📄 Generating coverage report...\n');

  const report = {
    timestamp: new Date().toISOString(),
    overall: coverage.total,
    summary: {
      totalFiles: Object.keys(coverage).filter((key) => key !== 'total').length,
      passedThresholds: false,
      recommendations: [],
    },
  };

  // Add recommendations based on low coverage areas
  const global = coverage.total;
  Object.entries(COVERAGE_THRESHOLDS.global).forEach(([metric, threshold]) => {
    if (global[metric].pct < threshold) {
      report.summary.recommendations.push(
        `Improve ${metric} coverage: currently ${global[metric].pct}%, target ${threshold}%`
      );
    }
  });

  // Find files with lowest coverage
  const filesByLines = Object.entries(coverage)
    .filter(([key]) => key !== 'total')
    .sort(([, a], [, b]) => a.lines.pct - b.lines.pct)
    .slice(0, 5);

  if (filesByLines.length > 0) {
    report.summary.recommendations.push(
      'Focus testing efforts on these low-coverage files:'
    );

    filesByLines.forEach(([file, cov]) => {
      report.summary.recommendations.push(
        `  - ${file}: ${cov.lines.pct}% line coverage`
      );
    });
  }

  // Write report
  fs.writeFileSync(
    './coverage/coverage-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('💡 Recommendations:');
  report.summary.recommendations.forEach((rec) => {
    console.log(`   ${rec}`);
  });

  return report;
}

function createMissingTestFiles() {
  console.log('\n🔍 Finding files without tests...\n');

  const srcFiles = findFiles('./src', /\.(ts|tsx)$/).filter(
    (file) =>
      !file.includes('__tests__') &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
  );

  const testFiles = findFiles('./src', /\.(test|spec)\.(ts|tsx)$/);
  const testedFiles = new Set(
    testFiles.map((testFile) => {
      return testFile
        .replace(/\/__tests__\//, '/')
        .replace(/\.(test|spec)\./, '.')
        .replace(/\.tsx?$/, '');
    })
  );

  const untestedFiles = srcFiles.filter((srcFile) => {
    const normalizedSrc = srcFile.replace(/\.tsx?$/, '');
    return !testedFiles.has(normalizedSrc);
  });

  if (untestedFiles.length === 0) {
    console.log('✅ All source files have corresponding test files!');
    return;
  }

  console.log(`📋 ${untestedFiles.length} files without tests:`);
  untestedFiles.forEach((file) => {
    console.log(`   ${file}`);
  });

  // Create basic test templates for missing files
  console.log('\n📝 Creating test templates...\n');

  untestedFiles.slice(0, 5).forEach((srcFile) => {
    const testFile = srcFile.replace(/\.(ts|tsx)$/, '.test.$1');
    const testDir = path.dirname(testFile);

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const isReactComponent = srcFile.endsWith('.tsx');
    const componentName = path.basename(srcFile, path.extname(srcFile));

    const testTemplate = isReactComponent
      ? generateReactTestTemplate(componentName, srcFile)
      : generateServiceTestTemplate(componentName, srcFile);

    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, testTemplate);
      console.log(`✅ Created test template: ${testFile}`);
    }
  });
}

function generateReactTestTemplate(componentName, srcFile) {
  return `import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ${componentName} from '${srcFile.replace(/\.tsx?$/, '')}';

// Mock dependencies as needed
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('${componentName}', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<${componentName} />);
    // Add your assertions here
    expect(getByTestId('${componentName.toLowerCase()}')).toBeTruthy();
  });

  it('handles user interactions', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(<${componentName} onPress={mockOnPress} />);
    
    // Example interaction test
    // fireEvent.press(getByTestId('button'));
    // expect(mockOnPress).toHaveBeenCalled();
  });

  // TODO: Add more comprehensive tests
  // - Test different props
  // - Test error states
  // - Test loading states
  // - Test accessibility
});
`;
}

function generateServiceTestTemplate(serviceName, srcFile) {
  return `import { ${serviceName} } from '${srcFile.replace(/\.tsx?$/, '')}';

// Mock external dependencies
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

describe('${serviceName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(${serviceName}).toBeDefined();
    });

    // TODO: Add specific method tests
    // it('should handle successful operations', async () => {
    //   // Test happy path
    // });

    // it('should handle errors gracefully', async () => {
    //   // Test error scenarios
    // });
  });

  // TODO: Add more comprehensive tests
  // - Test all public methods
  // - Test error handling
  // - Test edge cases
  // - Test integration scenarios
});
`;
}

function findFiles(dir, pattern) {
  let results = [];

  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'coverage') {
        results = results.concat(findFiles(filePath, pattern));
      }
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }

  return results;
}

async function main() {
  try {
    // Run tests with coverage
    const testsPass = runTestsWithCoverage();

    if (!testsPass) {
      console.log('❌ Tests must pass before checking coverage.');
      process.exit(1);
    }

    // Parse coverage report
    const coverage = parseCoverageReport();

    if (!coverage) {
      process.exit(1);
    }

    // Check thresholds
    const thresholdsPassed = checkCoverageThresholds(coverage);

    // Generate detailed report
    generateCoverageReport(coverage);

    // Create missing test files
    createMissingTestFiles();

    if (thresholdsPassed) {
      console.log('\n🎉 All coverage thresholds met!');
      process.exit(0);
    } else {
      console.log('\n❌ Coverage thresholds not met. Please add more tests.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking test coverage:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runTestsWithCoverage,
  parseCoverageReport,
  checkCoverageThresholds,
  createMissingTestFiles,
};
