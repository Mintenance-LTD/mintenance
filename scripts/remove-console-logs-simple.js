#!/usr/bin/env node

/**
 * Simpler script to remove console.log statements
 * Direct replacement approach
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all files with console.log
console.log('=== FINDING FILES WITH CONSOLE.LOG ===\n');

// Use grep to find files
const command = process.platform === 'win32'
  ? 'findstr /s /m "console.log" apps\\web\\*.ts apps\\web\\*.tsx apps\\mobile\\*.ts apps\\mobile\\*.tsx 2>NUL'
  : 'grep -r "console\\.log" apps/web apps/mobile --include="*.ts" --include="*.tsx" -l 2>/dev/null || true';

let files = [];
try {
  const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  files = output.trim().split('\n').filter(Boolean);
} catch (error) {
  // Try alternative method
  console.log('Using filesystem walk instead...');

  function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath, fileList);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('console.log')) {
            fileList.push(fullPath);
          }
        }
      } catch (e) {
        // Skip files we can't read
      }
    }
    return fileList;
  }

  files = [
    ...walkDir('apps/web'),
    ...walkDir('apps/mobile'),
    ...walkDir('packages')
  ];
}

console.log(`Found ${files.length} files with console.log statements\n`);

if (files.length === 0) {
  console.log('No files found with console.log statements');
  process.exit(0);
}

// Process each file
let totalRemoved = 0;
let filesModified = 0;

const skipPatterns = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /test-/,
  /__tests__/,
  /scripts\//,
  /\.stories\./
];

for (const file of files) {
  // Skip test files
  if (skipPatterns.some(pattern => pattern.test(file))) {
    console.log(`⏭️  Skipping test file: ${file}`);
    continue;
  }

  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Count console.logs before
    const countBefore = (content.match(/console\.log/g) || []).length;

    // Simple replacement patterns
    const replacements = [
      // console.log('message') -> // Removed console.log
      {
        pattern: /^\s*console\.log\([^)]*\);?\s*$/gm,
        replacement: '// Removed console.log'
      },
      // console.log('message', data) -> // Removed console.log
      {
        pattern: /^\s*console\.log\([^)]*,[^)]*\);?\s*$/gm,
        replacement: '// Removed console.log'
      },
      // Multiline console.log
      {
        pattern: /^\s*console\.log\([^)]*\n[^)]*\);?\s*$/gm,
        replacement: '// Removed console.log'
      },
      // console.log in if statements or other contexts
      {
        pattern: /console\.log\([^)]*\)/g,
        replacement: '/* console.log removed */'
      }
    ];

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      content = content.replace(pattern, replacement);
    }

    // Count console.logs after
    const countAfter = (content.match(/console\.log/g) || []).length;
    const removed = countBefore - countAfter;

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Removed ${removed} console.log from: ${file.replace(process.cwd(), '.')}`);
      totalRemoved += removed;
      filesModified++;
    }

  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`📁 Files modified: ${filesModified}`);
console.log(`📝 console.log statements removed: ${totalRemoved}`);

// Verify remaining
console.log('\n=== VERIFICATION ===');
try {
  const verifyCommand = process.platform === 'win32'
    ? 'findstr /s "console.log" apps\\web\\*.ts apps\\web\\*.tsx 2>NUL | find /c /v ""'
    : 'grep -r "console\\.log" apps/web apps/mobile packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v test | grep -v spec | wc -l';

  const remaining = execSync(verifyCommand, { encoding: 'utf8' }).trim();
  console.log(`Remaining console.log statements (excluding tests): ${remaining}`);
} catch (error) {
  console.log('Could not verify remaining statements');
}

console.log('\n✅ Done!');