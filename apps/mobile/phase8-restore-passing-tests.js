import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

logger.info('🔧 Phase 8: Restoring and fixing high-value tests...\n');

// List of test files that were previously passing and should be restored
const criticalTests = [
  'src/__tests__/services/OfflineManager.test.ts',
  'src/__tests__/services/JobService.simple.test.ts',
  'src/__tests__/hooks/useJobs.test.ts',
  'src/hooks/__tests__/useJobs.test.ts',
  'src/__tests__/utils/RateLimiter.test.ts',
  'src/__tests__/utils/circuitBreaker.test.ts',
  'src/__tests__/utils/cache.test.ts',
  'src/__tests__/utils/cache.simple.test.ts',
];

// First, let's identify which specific tests are failing
logger.info('📊 Checking specific test failures...\n');

let fixedCount = 0;

// Run each critical test individually to see status
criticalTests.forEach(testPath => {
  const fullPath = path.join(__dirname, testPath);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  try {
    // Try to run the test
    logger.info(`Testing: ${path.basename(testPath)}`);
    execSync(`npm test -- ${testPath} --silent`, {
      cwd: __dirname,
      stdio: 'pipe'
    });
    logger.info(`  ✅ Passing`);
  } catch (error) {
    logger.info(`  ❌ Failing - attempting fix...`);

    // Read the test file
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;
    let modified = false;

    // Remove problematic mocks that might have been added
    if (content.includes("jest.mock('react-native'") && !testPath.includes('.tsx')) {
      // Remove React Native mock from non-component tests
      content = content.replace(/jest\.mock\('react-native'[^;]+;\n/g, '');
      modified = true;
    }

    // Fix duplicate mock declarations
    const mockPattern = /jest\.mock\('([^']+)'[^}]+\}\)\);\n/g;
    const mocks = new Set();
    const matches = [...content.matchAll(mockPattern)];

    matches.forEach(match => {
      const moduleName = match[1];
      if (mocks.has(moduleName)) {
        // Remove duplicate
        content = content.replace(match[0], '');
        modified = true;
      } else {
        mocks.add(moduleName);
      }
    });

    // Ensure proper imports for utility tests
    if (testPath.includes('__tests__/utils/')) {
      // Fix import paths for utils
      content = content.replace(/from '\.\.\/\.\.\/\.\.\/utils\//g, "from '../../utils/");
      content = content.replace(/from '\.\.\/utils\//g, "from '../../utils/");
      modified = true;
    }

    // Ensure proper imports for service tests
    if (testPath.includes('__tests__/services/')) {
      // Fix import paths for services
      content = content.replace(/from '\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/");
      content = content.replace(/from '\.\.\/services\//g, "from '../../services/");
      modified = true;
    }

    // Save if modified
    if (modified && content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      fixedCount++;
      logger.info(`    Fixed and saved`);
    }
  }
});

logger.info(`\n📊 Summary: Fixed ${fixedCount} test files\n`);

// Now let's create a simple working test to ensure infrastructure is ok
logger.info('🔧 Creating validation test...\n');

const validationTest = `describe('Test Infrastructure Validation', () => {
  it('should run basic JavaScript tests', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });

  it('should handle arrays', () => {
    expect([1, 2, 3]).toHaveLength(3);
    expect([1, 2, 3]).toContain(2);
  });

  it('should handle objects', () => {
    expect({ a: 1 }).toHaveProperty('a');
    expect({ a: 1, b: 2 }).toMatchObject({ a: 1 });
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve(42);
    await expect(promise).resolves.toBe(42);
  });
});`;

const validationPath = path.join(__dirname, 'src/__tests__/utils/validation-infrastructure.test.ts');
fs.writeFileSync(validationPath, validationTest);
logger.info('  Created validation-infrastructure.test.ts');

// Remove broken React imports from TS files
logger.info('\n🔧 Cleaning up React imports from .ts files...\n');

const tsTestFiles = require('glob').sync('src/**/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

let cleanedCount = 0;

tsTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Remove React import from .ts files (not .tsx)
  if (content.includes("import React from 'react'")) {
    content = content.replace(/import React from 'react';\n/g, '');
    content = content.replace(/import \* as React from 'react';\n/g, '');
  }

  // Remove React Native mocks from non-component tests
  if (content.includes("jest.mock('react-native'")) {
    content = content.replace(/jest\.mock\('react-native'[^}]*\}\)\);\n/g, '');
  }

  // Remove safe area context mock from non-component tests
  if (content.includes("jest.mock('react-native-safe-area-context'")) {
    content = content.replace(/jest\.mock\('react-native-safe-area-context'[^}]*\}\)\);\n/g, '');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    cleanedCount++;
  }
});

logger.info(`  Cleaned ${cleanedCount} .ts test files`);

logger.info('\n✨ Phase 8 test restoration complete!');