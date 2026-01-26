#!/usr/bin/env node

/**
 * Script to remove unused variables and imports from TypeScript/JavaScript files
 * Handles TS6133 errors systematically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get unused variable errors
function getUnusedErrors() {
  try {
    const output = execSync('cd apps/web && npx tsc --noEmit 2>&1 || true', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const errors = [];
    const lines = output.split('\n');

    lines.forEach(line => {
      // TS6133: 'x' is declared but its value is never read
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          identifier: match[4]
        });
      }
    });

    return errors;
  } catch (error) {
    console.error('Error getting TypeScript errors:', error.message);
    return [];
  }
}

// Group errors by file
function groupByFile(errors) {
  const grouped = {};
  errors.forEach(error => {
    const filePath = path.join('apps/web', error.file);
    if (!grouped[filePath]) {
      grouped[filePath] = [];
    }
    grouped[filePath].push(error);
  });
  return grouped;
}

// Fix unused variables in a file
function fixUnusedInFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fixed = 0;

  // Group errors by line for efficient processing
  const errorsByLine = {};
  errors.forEach(error => {
    if (!errorsByLine[error.line]) {
      errorsByLine[error.line] = [];
    }
    errorsByLine[error.line].push(error.identifier);
  });

  // Process lines in reverse order to maintain line numbers
  const sortedLines = Object.keys(errorsByLine)
    .map(l => parseInt(l))
    .sort((a, b) => b - a);

  sortedLines.forEach(lineNum => {
    const lineIndex = lineNum - 1;
    if (lineIndex >= lines.length) return;

    const unusedVars = errorsByLine[lineNum];
    let line = lines[lineIndex];
    const originalLine = line;

    unusedVars.forEach(varName => {
      // Handle function parameters that are unused - prefix with underscore
      if (line.includes('(') && line.includes(')')) {
        // Function parameters - prefix with underscore
        const paramRegex = new RegExp(`\\b${varName}\\b(?=[^:]*:)`, 'g');
        if (paramRegex.test(line)) {
          line = line.replace(paramRegex, `_${varName}`);
          fixed++;
          return;
        }
      }

      // Handle imports
      if (line.includes('import ')) {
        // Named imports
        if (line.includes('{') && line.includes('}')) {
          // Remove the specific import
          line = line.replace(new RegExp(`\\b${varName}\\s*,?\\s*`, 'g'), '');
          // Clean up formatting
          line = line.replace(/,\s*,/g, ',');
          line = line.replace(/,\s*}/g, '}');
          line = line.replace(/{,\s*/g, '{');
          line = line.replace(/{\s*}/g, '{}');

          // If the import is now empty, mark the entire line for removal
          if (line.includes('{}')) {
            line = '';
          }
          fixed++;
        }
        // Default imports
        else if (line.match(new RegExp(`^\\s*import\\s+${varName}\\s+from`))) {
          line = '';
          fixed++;
        }
        // Namespace imports
        else if (line.match(new RegExp(`import\\s+\\*\\s+as\\s+${varName}\\s+from`))) {
          line = '';
          fixed++;
        }
      }
      // Handle variable declarations (const, let, var)
      else if (line.match(new RegExp(`^\\s*(const|let|var)\\s+${varName}\\b`))) {
        // If it's a destructuring assignment, just prefix with underscore
        if (line.includes('{') || line.includes('[')) {
          line = line.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`);
        } else {
          // Otherwise comment out the line
          line = `// Unused: ${line.trim()}`;
        }
        fixed++;
      }
    });

    if (line !== originalLine) {
      lines[lineIndex] = line;
    }
  });

  // Remove empty lines created by removing imports
  const cleanedLines = lines.filter((line, index) => {
    // Keep non-empty lines
    if (line.trim()) return true;
    // Keep empty lines that aren't from removed imports
    if (index > 0 && !lines[index - 1].includes('import ')) return true;
    if (index < lines.length - 1 && !lines[index + 1].includes('import ')) return true;
    return false;
  });

  if (fixed > 0) {
    fs.writeFileSync(filePath, cleanedLines.join('\n'));
    console.log(`Fixed ${fixed} unused variables in ${path.basename(filePath)}`);
  }

  return fixed;
}

// Main function
function main() {
  console.log('Analyzing unused variables...');
  const errors = getUnusedErrors();
  console.log(`Found ${errors.length} unused variable errors`);

  if (errors.length === 0) {
    console.log('No unused variables found!');
    return;
  }

  const grouped = groupByFile(errors);
  const fileCount = Object.keys(grouped).length;
  console.log(`Processing ${fileCount} files...`);

  let totalFixed = 0;
  let processedFiles = 0;

  // Process files in batches to avoid overwhelming changes
  const maxFilesToProcess = 100;
  const filesToProcess = Object.entries(grouped).slice(0, maxFilesToProcess);

  for (const [filePath, fileErrors] of filesToProcess) {
    const fixed = fixUnusedInFile(filePath, fileErrors);
    totalFixed += fixed;
    processedFiles++;

    // Show progress
    if (processedFiles % 10 === 0) {
      console.log(`Progress: ${processedFiles}/${filesToProcess.length} files...`);
    }
  }

  console.log(`\nFixed ${totalFixed} unused variables in ${processedFiles} files`);

  if (fileCount > maxFilesToProcess) {
    console.log(`Note: Only processed first ${maxFilesToProcess} files. Run again to process more.`);
  }

  console.log('Run npm run type-check to verify results');
}

// Run the script
main();