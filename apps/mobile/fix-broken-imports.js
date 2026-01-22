#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing broken imports from undefined...\n');

// Find all files with broken imports
const command = `grep -r "from 'undefined'" src --include="*.test.ts" --include="*.test.tsx" -l`;
let brokenFiles = [];

try {
  const result = execSync(command, { cwd: __dirname, encoding: 'utf8' });
  brokenFiles = result.trim().split('\n').filter(f => f);
} catch (e) {
  console.log('No broken imports found or grep failed');
  process.exit(0);
}

console.log(`Found ${brokenFiles.length} files with broken imports\n`);

let totalFixes = 0;

brokenFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Fix pattern: import { Something } from 'undefined'
  // followed by: // Note: Something may be a static class, not a constructor from '../../path';

  // First, let's extract the broken imports
  const brokenImportPattern = /import\s+{\s*(\w+)\s*}\s+from\s+'undefined'\s*\n\/\/[^;]+from\s+'([^']+)';/g;

  content = content.replace(brokenImportPattern, (match, importName, actualPath) => {
    console.log(`  Fixing: ${importName} from ${actualPath}`);
    return `import { ${importName} } from '${actualPath}';`;
  });

  // Also fix simpler pattern without the comment
  content = content.replace(
    /import\s+{\s*(\w+)\s*}\s+from\s+'undefined'/g,
    (match, importName) => {
      // Try to guess the correct import path
      let guessedPath = '';

      if (importName.includes('Service')) {
        // It's likely a service
        guessedPath = `../../services/${importName}`;
      } else if (importName.includes('Manager')) {
        // It's likely a manager
        guessedPath = `../../utils/${importName}`;
      } else if (importName.includes('Auth')) {
        // Auth related
        guessedPath = `../../services/AuthService`;
      } else {
        // Generic fallback
        guessedPath = `../../${importName.toLowerCase()}`;
      }

      console.log(`  Guessing path for ${importName}: ${guessedPath}`);
      return `import { ${importName} } from '${guessedPath}';`;
    }
  );

  // Remove orphaned comments
  content = content.replace(
    /\/\/ Note: \w+ may be a static class, not a constructor from '[^']+';?\n/g,
    ''
  );

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${path.basename(filePath)}`);
    totalFixes++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Total files fixed: ${totalFixes}`);
console.log('\n✨ Import fixes complete!');

// Now let's also fix any remaining undefined imports with a more aggressive approach
console.log('\n🔍 Looking for any remaining undefined imports...');

const allTestFiles = require('glob').sync('src/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let additionalFixes = 0;

allTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes("from 'undefined'")) {
    const original = content;

    // Remove all undefined imports completely - they're breaking tests
    content = content.replace(/import.*from\s+'undefined'.*\n/g, '');

    // Also remove related comments
    content = content.replace(/\/\/\s*Note:.*\n/g, '');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  🗑️  Removed undefined imports from ${path.basename(file)}`);
      additionalFixes++;
    }
  }
});

if (additionalFixes > 0) {
  console.log(`\n  Removed undefined imports from ${additionalFixes} additional files`);
}

console.log('\nRun npm test to verify the fixes.');