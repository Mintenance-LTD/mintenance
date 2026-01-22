#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing async test patterns and common issues...\n');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let stats = {
  totalFiles: testFiles.length,
  fixedImports: 0,
  fixedAsync: 0,
  addedWaitFor: 0,
  fixedTimeouts: 0,
  addedMocks: 0,
};

// Fix test-utils import paths based on file location
function getTestUtilsPath(filePath) {
  // Calculate relative path from test file to src/__tests__/test-utils.tsx
  const testDir = path.dirname(filePath);
  const relativePath = path.relative(testDir, path.join(__dirname, 'src/__tests__'));

  // For files in src/__tests__, use relative path
  if (filePath.includes('src/__tests__/')) {
    const depth = filePath.split('__tests__/')[1].split('/').length - 1;
    if (depth === 0) return './test-utils';
    if (depth === 1) return '../test-utils';
    return '../'.repeat(depth) + 'test-utils';
  }

  // For files outside __tests__ directory
  const srcRelative = path.relative(testDir, path.join(__dirname, 'src'));
  const depthFromSrc = srcRelative.split('..').length - 1;

  if (depthFromSrc === 0) return './__tests__/test-utils';
  return '../'.repeat(depthFromSrc) + '__tests__/test-utils';
}

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Fix 1: Correct test-utils import path
  if (content.includes("from '../../test-utils'") ||
      content.includes('from "../test-utils"') ||
      content.includes("from './test-utils'")) {

    const correctPath = getTestUtilsPath(file);

    // Replace all variations of test-utils import
    content = content.replace(/from ['"][\./]*test-utils['"]/g, `from '${correctPath}'`);

    if (content !== original) {
      stats.fixedImports++;
      modified = true;
      console.log(`  Fixed test-utils import in ${fileName} -> ${correctPath}`);
    }
  }

  // Fix 2: Add async/await to test functions that need it
  if (content.includes('Promise') || content.includes('.then(') || content.includes('.resolve')) {
    // Find test functions without async
    content = content.replace(/it\(['"`]([^'"`]*)['"`,]\s*\(\)\s*=>\s*{/g, (match, testName) => {
      const nextContent = content.substring(content.indexOf(match) + match.length,
                                           content.indexOf(match) + match.length + 200);

      if (nextContent.includes('await') || nextContent.includes('Promise') ||
          nextContent.includes('.then') || nextContent.includes('waitFor')) {
        stats.fixedAsync++;
        modified = true;
        return `it('${testName}', async () => {`;
      }
      return match;
    });

    // Also fix test() functions
    content = content.replace(/test\(['"`]([^'"`]*)['"`,]\s*\(\)\s*=>\s*{/g, (match, testName) => {
      const nextContent = content.substring(content.indexOf(match) + match.length,
                                           content.indexOf(match) + match.length + 200);

      if (nextContent.includes('await') || nextContent.includes('Promise')) {
        stats.fixedAsync++;
        modified = true;
        return `test('${testName}', async () => {`;
      }
      return match;
    });
  }

  // Fix 3: Add waitFor wrapper for async operations
  if (content.includes('render(') && !content.includes('waitFor')) {
    // Check if we need to import waitFor
    if (!content.includes('waitFor')) {
      // Add waitFor to existing @testing-library imports
      content = content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@testing-library\/react-native['"]/,
        (match, imports) => {
          if (!imports.includes('waitFor')) {
            return match.replace(imports, `${imports}, waitFor`);
          }
          return match;
        }
      );

      // Or add it to test-utils imports
      content = content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"][^'"]*test-utils['"]/,
        (match, imports) => {
          if (!imports.includes('waitFor')) {
            stats.addedWaitFor++;
            modified = true;
            return match.replace(imports, `${imports}, waitFor`);
          }
          return match;
        }
      );
    }
  }

  // Fix 4: Add proper timeout handling
  if (content.includes('setTimeout') && !content.includes('jest.useFakeTimers')) {
    // Add fake timers setup
    const setupTimers = `
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
`;

    if (!content.includes('jest.useFakeTimers')) {
      // Add after first describe
      content = content.replace(/describe\([^)]+\)\s*{\s*\n/, (match) => {
        stats.fixedTimeouts++;
        modified = true;
        return match + setupTimers;
      });
    }
  }

  // Fix 5: Add missing async mocks
  if (file.includes('/screens/') || file.includes('/integration/')) {
    // Ensure AsyncStorage is mocked
    if (content.includes('AsyncStorage') && !content.includes("jest.mock('@react-native-async-storage/async-storage'")) {
      const asyncStorageMock = `
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));
`;

      // Add after imports
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfImports = content.indexOf('\n', lastImportIndex);

      if (endOfImports > -1) {
        content = content.slice(0, endOfImports + 1) + asyncStorageMock + content.slice(endOfImports + 1);
        stats.addedMocks++;
        modified = true;
      }
    }
  }

  // Fix 6: Fix act() warnings
  if (content.includes('render(') && !content.includes('act(')) {
    // Check if we need act for state updates
    const needsAct = content.includes('setState') || content.includes('dispatch') ||
                    content.includes('fireEvent');

    if (needsAct && !content.includes('import { act }')) {
      // Add act import
      content = content.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@testing-library\/react-native['"]/,
        (match, imports) => {
          if (!imports.includes('act')) {
            return match.replace(imports, `${imports}, act`);
          }
          return match;
        }
      );
    }
  }

  // Fix 7: Wrap fireEvent calls with act
  if (content.includes('fireEvent.')) {
    content = content.replace(/fireEvent\.(press|changeText|scroll)\(/g, (match) => {
      // Check if already wrapped in act
      const lineStart = content.lastIndexOf('\n', content.indexOf(match));
      const lineContent = content.substring(lineStart, content.indexOf(match));

      if (!lineContent.includes('act(')) {
        modified = true;
        return `act(() => ${match}`;
      }
      return match;
    });

    // Close act calls
    content = content.replace(/act\(\(\) => fireEvent\.[^)]+\)/g, (match) => {
      return match + ')';
    });
  }

  // Fix 8: Add proper cleanup
  if (content.includes('render(') && !content.includes('afterEach')) {
    const cleanup = `
  afterEach(() => {
    jest.clearAllMocks();
  });
`;

    if (!content.includes('afterEach')) {
      // Add after beforeEach or after describe
      if (content.includes('beforeEach')) {
        content = content.replace(/beforeEach\([^}]+}\);/, (match) => {
          return match + cleanup;
        });
      } else {
        content = content.replace(/describe\([^)]+\)\s*{\s*\n/, (match) => {
          return match + cleanup;
        });
      }
      modified = true;
    }
  }

  // Fix 9: Fix Promise rejection handling
  if (content.includes('.rejects.') || content.includes('throw')) {
    // Ensure tests that expect errors are properly async
    content = content.replace(/expect\([^)]*\)\.rejects\./g, (match) => {
      return `await ${match}`;
    });
  }

  // Fix 10: Fix common React Native async issues
  if (content.includes('InteractionManager')) {
    if (!content.includes("jest.mock('react-native/Libraries/Interaction/InteractionManager'")) {
      const interactionMock = `
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
}));
`;
      content = interactionMock + content;
      modified = true;
    }
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  ✅ Fixed: ${fileName}`);
  }
});

console.log('\n📊 Async Test Fix Summary:');
console.log(`  Total files checked: ${stats.totalFiles}`);
console.log(`  Fixed import paths: ${stats.fixedImports}`);
console.log(`  Added async/await: ${stats.fixedAsync}`);
console.log(`  Added waitFor: ${stats.addedWaitFor}`);
console.log(`  Fixed timeouts: ${stats.fixedTimeouts}`);
console.log(`  Added async mocks: ${stats.addedMocks}`);
console.log('\n✨ Async test fixes complete!');