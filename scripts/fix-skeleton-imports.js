#!/usr/bin/env node

/**
 * Fix Skeleton component imports across all loading.tsx files
 * Changes from named imports to default + named imports
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all loading.tsx files
const files = glob.sync('apps/web/app/**/loading.tsx', {
  cwd: path.join(__dirname, '..'),
  absolute: true,
});

console.log(`Found ${files.length} loading.tsx files`);

let fixedCount = 0;
let alreadyCorrect = 0;

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if file has incorrect import pattern
  const incorrectPattern = /import\s+{\s*Skeleton\s*,/;

  if (incorrectPattern.test(content)) {
    // Fix the import statement
    const fixed = content.replace(
      /import\s+{\s*Skeleton\s*,\s*([^}]+)\s*}\s*from\s+'@\/components\/ui\/Skeleton';/g,
      "import Skeleton, { $1 } from '@/components/ui/Skeleton';"
    );

    // Also handle case with only Skeleton
    const fixed2 = fixed.replace(
      /import\s+{\s*Skeleton\s*}\s*from\s+'@\/components\/ui\/Skeleton';/g,
      "import Skeleton from '@/components/ui/Skeleton';"
    );

    if (fixed2 !== content) {
      fs.writeFileSync(filePath, fixed2, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      fixedCount++;
    }
  } else if (content.includes("from '@/components/ui/Skeleton'")) {
    console.log(`✓ Already correct: ${path.relative(process.cwd(), filePath)}`);
    alreadyCorrect++;
  }
});

console.log('\n=== Summary ===');
console.log(`Fixed: ${fixedCount}`);
console.log(`Already correct: ${alreadyCorrect}`);
console.log(`Total: ${files.length}`);
