#!/usr/bin/env node

/**
 * Script to fix syntax errors introduced by automated fixes
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
      // TS1005: ',' expected - usually from wrong arrow function syntax
      let match = line.match(/^(.+?)\((\d+),(\d+)\): error TS1005: ',' expected/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: 'comma_expected'
        });
        return;
      }

      // TS1128: Declaration or statement expected - usually from bad commenting
      match = line.match(/^(.+?)\((\d+),(\d+)\): error TS1128: Declaration or statement expected/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: 'declaration_expected'
        });
        return;
      }

      // TS1003: Identifier expected
      match = line.match(/^(.+?)\((\d+),(\d+)\): error TS1003: Identifier expected/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: 'identifier_expected'
        });
        return;
      }
    });

    return errors;
  } catch (error) {
    console.error('Error getting TypeScript errors:', error.message);
    return [];
  }
}

// Fix syntax errors in a file
function fixSyntaxErrors(filePath, errors) {
  if (!fs.existsSync(filePath)) return 0;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fixed = 0;

  // Sort errors by line number in descending order
  const sortedErrors = errors.sort((a, b) => b.line - a.line);

  sortedErrors.forEach(error => {
    const lineIndex = error.line - 1;
    if (lineIndex >= lines.length) return;

    let line = lines[lineIndex];
    const originalLine = line;

    if (error.type === 'comma_expected') {
      // Fix arrow function parameter syntax
      // Pattern: filter(l: any => should be filter((l: any) =>
      line = line.replace(/\(([^:)]+): any\s*=>/g, '(($1: any) =>');
      line = line.replace(/\(([^:)]+): any\s*,/g, '(($1: any),');
    } else if (error.type === 'declaration_expected') {
      // Fix incomplete commenting
      // Check if previous line has incomplete comment
      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1];
        if (prevLine.includes('// Unused variable') && !prevLine.trim().startsWith('//')) {
          // Fix the incomplete comment
          if (line.trim().startsWith('?') || line.trim().startsWith(':')) {
            // This is a ternary operator continuation
            lines[lineIndex - 1] = '  // ' + prevLine.replace('//', '').trim();
            line = '  // ' + line.trim();
          }
        }
      }
    } else if (error.type === 'identifier_expected') {
      // Fix import statements with bad formatting
      if (line.includes('import ') && line.includes('// Removed unused')) {
        // Remove the comment from the import line
        line = line.replace(/\/\/ Removed unused.*$/, '').trim();
        if (line.includes('{}')) {
          // Empty import, comment it out entirely
          line = '// ' + line;
        }
      }
    }

    if (line !== originalLine) {
      lines[lineIndex] = line;
      fixed++;
    }
  });

  if (fixed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  return fixed;
}

// Main function
function main() {
  console.log('🔍 Analyzing syntax errors...');
  const errors = getSyntaxErrors();
  console.log(`Found ${errors.length} syntax errors`);

  if (errors.length === 0) {
    console.log('✅ No syntax errors found!');
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
  console.log(`📁 Processing ${fileCount} files...`);

  let totalFixed = 0;

  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    const fixed = fixSyntaxErrors(filePath, fileErrors);
    if (fixed > 0) {
      console.log(`  ✅ Fixed ${fixed} syntax errors in ${path.basename(filePath)}`);
      totalFixed += fixed;
    }
  }

  console.log(`\n✨ Fixed ${totalFixed} syntax errors`);
  console.log('🔄 Run npm run type-check to verify results');
}

// Run the script
main();