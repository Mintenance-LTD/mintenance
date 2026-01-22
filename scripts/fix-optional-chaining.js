#!/usr/bin/env node

/**
 * Script to fix incorrect optional chaining syntax
 * Fixes patterns like `escrows?[0]` to `escrows?.[0]`
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get syntax errors
function getSyntaxErrors() {
  try {
    const output = execSync('cd apps/web && npx tsc --noEmit 2>&1 || true', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const errors = [];
    const lines = output.split('\n');

    lines.forEach(line => {
      // TS1005: ':' expected (often indicates incorrect optional chaining)
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS1005: ':' expected/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3])
        });
      }
    });

    return errors;
  } catch (error) {
    console.error('Error getting TypeScript errors:', error.message);
    return [];
  }
}

// Fix optional chaining in a file
function fixOptionalChaining(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fixed = 0;

  // Group errors by line
  const errorLines = new Set(errors.map(e => e.line));

  errorLines.forEach(lineNum => {
    const lineIndex = lineNum - 1;
    if (lineIndex >= lines.length) return;

    let line = lines[lineIndex];
    const originalLine = line;

    // Fix incorrect optional chaining patterns
    // Pattern 1: Fix `obj?[index]` to `obj?.[index]`
    line = line.replace(/(\w+)\?\[/g, '$1?.[');

    // Pattern 2: Fix `obj?(` to `obj?.(`
    line = line.replace(/(\w+)\?\(/g, '$1?.(');

    // Pattern 3: Fix double optional chaining `obj??` to `obj?`
    line = line.replace(/(\w+)\?\?\.?/g, '$1?.');

    // Pattern 4: Fix `obj?.property?[` to `obj?.property?.[`
    line = line.replace(/(\w+\?\.\w+)\?\[/g, '$1?.[');

    if (line !== originalLine) {
      lines[lineIndex] = line;
      fixed++;
    }
  });

  if (fixed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed ${fixed} optional chaining errors in ${path.basename(filePath)}`);
  }

  return fixed;
}

// Main function
function main() {
  console.log('Analyzing syntax errors...');
  const errors = getSyntaxErrors();
  console.log(`Found ${errors.length} syntax errors`);

  if (errors.length === 0) {
    console.log('No syntax errors found!');
    return;
  }

  // Group errors by file
  const errorsByFile = {};
  errors.forEach(error => {
    const filePath = path.join('apps/web', error.file);
    if (!errorsByFile[filePath]) {
      errorsByFile[filePath] = [];
    }
    errorsByFile[filePath].push(error);
  });

  const fileCount = Object.keys(errorsByFile).length;
  console.log(`Processing ${fileCount} files...`);

  let totalFixed = 0;

  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    const fixed = fixOptionalChaining(filePath, fileErrors);
    totalFixed += fixed;
  }

  console.log(`\nFixed ${totalFixed} optional chaining syntax errors`);
  console.log('Run npm run type-check to verify results');
}

// Run the script
main();