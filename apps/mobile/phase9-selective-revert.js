import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Phase 9: Selective revert of problematic changes...\n');

// Find all test files
const tsTestFiles = glob.sync('src/**/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

const tsxTestFiles = glob.sync('src/**/*.test.tsx', {
  cwd: __dirname,
  absolute: true,
});

let revertCount = 0;
const revertCategories = {
  reactFromTs: 0,
  rnMockFromTs: 0,
  duplicateMocks: 0,
  unnecessaryMocks: 0,
};

logger.info(`Found ${tsTestFiles.length} .ts test files and ${tsxTestFiles.length} .tsx test files\n`);

// Phase 1: Remove React-related imports from .ts files
logger.info('📋 Phase 1: Removing React imports from .ts files...');

tsTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let modified = false;

  // Remove React import from .ts files
  if (content.includes("import React from 'react'")) {
    content = content.replace(/import React from 'react';\n/g, '');
    content = content.replace(/import \* as React from 'react';\n/g, '');
    modified = true;
    revertCategories.reactFromTs++;
  }

  // Remove React Native mock from non-component tests
  if (content.includes("jest.mock('react-native'")) {
    content = content.replace(/jest\.mock\('react-native'[\s\S]*?\}\)\);\n\n?/g, '');
    modified = true;
    revertCategories.rnMockFromTs++;
  }

  // Remove react-native-safe-area-context mock from non-component tests
  if (content.includes("jest.mock('react-native-safe-area-context'")) {
    content = content.replace(/jest\.mock\('react-native-safe-area-context'[\s\S]*?\}\)\);\n\n?/g, '');
    modified = true;
    revertCategories.unnecessaryMocks++;
  }

  // Remove navigation mocks from service/utility tests
  if ((file.includes('__tests__/services/') || file.includes('__tests__/utils/')) &&
      content.includes('mockNavigation')) {
    content = content.replace(/const mockNavigation[\s\S]*?const mockRoute[\s\S]*?\};\n\n?/g, '');
    modified = true;
    revertCategories.unnecessaryMocks++;
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    revertCount++;
  }
});

logger.info(`  Cleaned ${revertCategories.reactFromTs} React imports from .ts files`);
logger.info(`  Removed ${revertCategories.rnMockFromTs} React Native mocks from .ts files\n`);

// Phase 2: Fix duplicate mock declarations
logger.info('📋 Phase 2: Removing duplicate mock declarations...');

[...tsTestFiles, ...tsxTestFiles].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Track mock declarations
  const mockDeclarations = new Map();
  const lines = content.split('\n');
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a jest.mock declaration
    const mockMatch = line.match(/jest\.mock\(['"]([^'"]+)['"]/);
    if (mockMatch) {
      const moduleName = mockMatch[1];

      // Find the end of this mock declaration
      let endIndex = i;
      let braceCount = 0;
      let inMock = false;

      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('{')) {
          braceCount++;
          inMock = true;
        }
        if (lines[j].includes('}')) {
          braceCount--;
        }
        if (inMock && braceCount === 0) {
          endIndex = j;
          break;
        }
        if (lines[j].includes(');') && !inMock) {
          endIndex = j;
          break;
        }
      }

      const mockBlock = lines.slice(i, endIndex + 1).join('\n');

      // Check if we've seen this module before
      if (mockDeclarations.has(moduleName)) {
        // Skip duplicate mock
        i = endIndex;
        revertCategories.duplicateMocks++;
        continue;
      } else {
        mockDeclarations.set(moduleName, mockBlock);
        // Add the mock block
        for (let j = i; j <= endIndex; j++) {
          newLines.push(lines[j]);
        }
        i = endIndex;
      }
    } else {
      newLines.push(line);
    }
  }

  const newContent = newLines.join('\n');
  if (newContent !== original) {
    fs.writeFileSync(file, newContent, 'utf8');
    revertCount++;
  }
});

logger.info(`  Removed ${revertCategories.duplicateMocks} duplicate mock declarations\n`);

// Phase 3: Fix specific broken imports
logger.info('📋 Phase 3: Fixing specific import issues...');

let importFixes = 0;

[...tsTestFiles, ...tsxTestFiles].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let modified = false;

  // Fix test-utils imports based on file location
  if (content.includes('test-utils')) {
    const depth = file.split(path.sep).filter(p => p === '__tests__').length;
    const relativePath = file.split('src')[1];
    const segments = relativePath.split(path.sep).filter(s => s && s !== '__tests__');

    let correctPath = '';
    if (file.includes('src/__tests__/')) {
      if (segments.length === 2) { // src/__tests__/file.test.ts
        correctPath = './test-utils';
      } else if (segments.length === 3) { // src/__tests__/folder/file.test.ts
        correctPath = '../test-utils';
      } else if (segments.length === 4) { // src/__tests__/folder/subfolder/file.test.ts
        correctPath = '../../test-utils';
      } else {
        correctPath = '../'.repeat(Math.max(1, segments.length - 2)) + 'test-utils';
      }
    } else if (file.includes('/hooks/__tests__/') || file.includes('/services/__tests__/')) {
      correctPath = '../../__tests__/test-utils';
    }

    if (correctPath) {
      const currentImport = content.match(/from ['"]([^'"]*test-utils)['"]/);
      if (currentImport && currentImport[1] !== correctPath) {
        content = content.replace(
          new RegExp(`from ['"]${currentImport[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
          `from '${correctPath}'`
        );
        modified = true;
        importFixes++;
      }
    }
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

logger.info(`  Fixed ${importFixes} import paths\n`);

// Phase 4: Ensure critical mocks are present
logger.info('📋 Phase 4: Ensuring critical mocks are present...');

let mockAdditions = 0;

// For service tests, ensure AsyncStorage mock
const serviceTests = glob.sync('src/__tests__/services/**/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

serviceTests.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Add AsyncStorage mock if the test uses it but doesn't mock it
  if (content.includes('AsyncStorage') && !content.includes("jest.mock('@react-native-async-storage/async-storage'")) {
    const asyncMock = `jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

`;
    content = asyncMock + content;
    fs.writeFileSync(file, content, 'utf8');
    mockAdditions++;
  }
});

logger.info(`  Added ${mockAdditions} critical mocks\n`);

// Summary
logger.info('📊 Summary:');
logger.info(`  Total files reverted/fixed: ${revertCount}`);
logger.info(`  React imports removed from .ts: ${revertCategories.reactFromTs}`);
logger.info(`  React Native mocks removed from .ts: ${revertCategories.rnMockFromTs}`);
logger.info(`  Duplicate mocks removed: ${revertCategories.duplicateMocks}`);
logger.info(`  Unnecessary mocks removed: ${revertCategories.unnecessaryMocks}`);
logger.info(`  Import paths fixed: ${importFixes}`);
logger.info(`  Critical mocks added: ${mockAdditions}`);
logger.info('\n✨ Phase 9 selective revert complete!');