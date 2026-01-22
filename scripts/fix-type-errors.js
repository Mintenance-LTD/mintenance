#!/usr/bin/env node

/**
 * Script to fix common TypeScript errors
 * Focuses on possibly undefined values and missing type declarations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get TypeScript errors
function getTypeScriptErrors() {
  try {
    const output = execSync('cd apps/web && npx tsc --noEmit 2>&1 || true', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const errors = [];
    const lines = output.split('\n');

    lines.forEach(line => {
      // TS18048: 'x' is possibly 'undefined'
      let match = line.match(/^(.+?)\((\d+),(\d+)\): error TS18048: '(.+?)' is possibly 'undefined'/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          identifier: match[4],
          type: 'possibly_undefined'
        });
        return;
      }

      // TS2532: Object is possibly 'undefined'
      match = line.match(/^(.+?)\((\d+),(\d+)\): error TS2532: Object is possibly 'undefined'/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: 'object_possibly_undefined'
        });
        return;
      }

      // TS2769: No overload matches this call
      match = line.match(/^(.+?)\((\d+),(\d+)\): error TS2769:/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          type: 'no_overload_match'
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

// Fix possibly undefined errors in a file
function fixPossiblyUndefined(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fixed = 0;

  // Sort errors by line number in descending order to avoid offset issues
  const sortedErrors = errors.sort((a, b) => b.line - a.line);

  sortedErrors.forEach(error => {
    const lineIndex = error.line - 1;
    if (lineIndex >= lines.length) return;

    let line = lines[lineIndex];
    const originalLine = line;

    if (error.type === 'possibly_undefined') {
      // Handle different patterns
      if (error.identifier.includes('.')) {
        // Property access like 'account.requirements'
        const parts = error.identifier.split('.');
        const baseVar = parts[0];

        // Add optional chaining
        const regex = new RegExp(`\\b${error.identifier.replace(/\./g, '\\.')}\\b`, 'g');
        line = line.replace(regex, error.identifier.split('.').join('?.'));
      } else {
        // Single variable
        // Check if it's in a function call or property access
        if (line.includes(`${error.identifier}.`) || line.includes(`${error.identifier}[`)) {
          // Add optional chaining
          line = line.replace(
            new RegExp(`\\b${error.identifier}([.\\[])`, 'g'),
            `${error.identifier}?$1`
          );
        } else if (line.includes(`(${error.identifier})`) || line.includes(`, ${error.identifier}`)) {
          // It's a function parameter - add default or null check
          // For now, we'll add || undefined
          line = line.replace(
            new RegExp(`\\b${error.identifier}\\b`, 'g'),
            `(${error.identifier} || '')`
          );
        }
      }
    } else if (error.type === 'object_possibly_undefined') {
      // Add optional chaining to object access
      // Look for patterns like object.property or object[key]
      line = line.replace(/(\w+)(\.|\[)/g, (match, obj, accessor) => {
        // Don't add optional chaining to already optional accesses
        if (line[line.indexOf(match) - 1] === '?') {
          return match;
        }
        // Don't add to certain keywords
        if (['this', 'super', 'console', 'process', 'window', 'document', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean'].includes(obj)) {
          return match;
        }
        return `${obj}?${accessor}`;
      });
    }

    if (line !== originalLine) {
      lines[lineIndex] = line;
      fixed++;
    }
  });

  if (fixed > 0) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed ${fixed} possibly undefined errors in ${filePath}`);
  }

  return fixed;
}

// Remove unused imports from a file
function removeUnusedImports(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const unusedIdentifiers = errors
    .filter(e => e.type === 'unused')
    .map(e => e.identifier);

  if (unusedIdentifiers.length === 0) {
    return 0;
  }

  let fixed = 0;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.includes('import ')) {
      newLines.push(line);
      continue;
    }

    let modifiedLine = line;
    let shouldRemoveLine = false;

    // Handle named imports
    if (line.includes('{') && line.includes('}')) {
      unusedIdentifiers.forEach(id => {
        const regex = new RegExp(`\\b${id}\\s*,?\\s*`, 'g');
        modifiedLine = modifiedLine.replace(regex, '');
      });

      // Clean up formatting
      modifiedLine = modifiedLine.replace(/,\s*,/g, ',');
      modifiedLine = modifiedLine.replace(/,\s*}/g, '}');
      modifiedLine = modifiedLine.replace(/{,\s*/g, '{');
      modifiedLine = modifiedLine.replace(/{\s*}/g, '{}');

      // If import is now empty, mark for removal
      if (modifiedLine.includes('{}')) {
        shouldRemoveLine = true;
      }
    }

    // Handle default imports
    unusedIdentifiers.forEach(id => {
      if (line.match(new RegExp(`^\\s*import\\s+${id}\\s+from`))) {
        shouldRemoveLine = true;
      }
    });

    if (!shouldRemoveLine) {
      newLines.push(modifiedLine);
      if (modifiedLine !== line) {
        fixed++;
      }
    } else {
      fixed++;
    }
  }

  if (fixed > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`Removed ${fixed} unused imports from ${filePath}`);
  }

  return fixed;
}

// Main function
function main() {
  console.log('Analyzing TypeScript errors...');
  const errors = getTypeScriptErrors();

  // Group errors by file and type
  const errorsByFile = {};
  let undefinedCount = 0;
  let unusedCount = 0;

  errors.forEach(error => {
    const filePath = path.join('apps/web', error.file);
    if (!errorsByFile[filePath]) {
      errorsByFile[filePath] = {
        undefined: [],
        unused: []
      };
    }

    if (error.type === 'possibly_undefined' || error.type === 'object_possibly_undefined') {
      errorsByFile[filePath].undefined.push(error);
      undefinedCount++;
    }
  });

  console.log(`Found ${undefinedCount} possibly undefined errors`);

  // Process undefined errors first
  let totalFixed = 0;
  const filesToProcess = Object.entries(errorsByFile)
    .filter(([_, errors]) => errors.undefined.length > 0)
    .slice(0, 50); // Process first 50 files to avoid overwhelming changes

  console.log(`Processing ${filesToProcess.length} files with undefined errors...`);

  filesToProcess.forEach(([filePath, fileErrors]) => {
    const fixed = fixPossiblyUndefined(filePath, fileErrors.undefined);
    totalFixed += fixed;
  });

  console.log(`\nTotal fixes applied: ${totalFixed}`);
  console.log('Run npm run type-check again to verify');
}

// Run the script
main();