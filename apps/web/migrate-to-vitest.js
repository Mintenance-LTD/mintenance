#!/usr/bin/env node
/**
 * Automated Jest to Vitest Migration Script
 * Applies VITEST_MIGRATION_PATTERN.md transformations
 */

const fs = require('fs');
const path = require('path');

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Step 1: Add Vitest import if not present
  if (!content.includes("from 'vitest'")) {
    if (content.includes('jest.')) {
      content = `import { vi } from 'vitest';\n${content}`;
      modified = true;
    }
  }

  // Step 2: Replace jest.mock() with vi.mock()
  if (content.includes('jest.mock(')) {
    content = content.replace(/jest\.mock\(/g, 'vi.mock(');
    modified = true;
  }

  // Step 3: Replace jest.fn() with vi.fn()
  if (content.includes('jest.fn(')) {
    content = content.replace(/jest\.fn\(/g, 'vi.fn(');
    modified = true;
  }

  // Step 4: Replace jest.spyOn() with vi.spyOn()
  if (content.includes('jest.spyOn(')) {
    content = content.replace(/jest\.spyOn\(/g, 'vi.spyOn(');
    modified = true;
  }

  // Step 5: Replace jest.clearAllMocks() with vi.clearAllMocks()
  if (content.includes('jest.clearAllMocks(')) {
    content = content.replace(/jest\.clearAllMocks\(/g, 'vi.clearAllMocks(');
    modified = true;
  }

  // Step 6: Replace jest.resetAllMocks() with vi.resetAllMocks()
  if (content.includes('jest.resetAllMocks(')) {
    content = content.replace(/jest\.resetAllMocks\(/g, 'vi.resetAllMocks(');
    modified = true;
  }

  // Step 7: Replace jest.restoreAllMocks() with vi.restoreAllMocks()
  if (content.includes('jest.restoreAllMocks(')) {
    content = content.replace(/jest\.restoreAllMocks\(/g, 'vi.restoreAllMocks(');
    modified = true;
  }

  // Step 8: Replace "as jest.Mock" with vi.mocked()
  // Pattern: (someFunc as jest.Mock).mockReturnValue -> vi.mocked(someFunc).mockReturnValue
  const asMockPattern = /\(([^)]+)\s+as\s+jest\.Mock(?:<[^>]*>)?\)/g;
  if (asMockPattern.test(content)) {
    content = content.replace(asMockPattern, 'vi.mocked($1)');
    modified = true;
  }

  // Step 9: Replace Mock<any> with vi.Mock
  if (content.includes('Mock<')) {
    content = content.replace(/Mock</g, 'vi.Mock<');
    modified = true;
  }

  // Step 10: Replace jest.Mocked with vi.Mocked
  if (content.includes('jest.Mocked')) {
    content = content.replace(/jest\.Mocked/g, 'vi.Mocked');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-to-vitest.js <file1> <file2> ...');
  process.exit(1);
}

let migratedCount = 0;
let skippedCount = 0;

args.forEach(filePath => {
  try {
    if (migrateFile(filePath)) {
      console.log(`✅ Migrated: ${filePath}`);
      migratedCount++;
    } else {
      console.log(`⏭️  Skipped (no changes): ${filePath}`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
  }
});

console.log(`\n✅ Migration complete: ${migratedCount} files migrated, ${skippedCount} files skipped`);
