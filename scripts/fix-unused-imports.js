#!/usr/bin/env node

/**
 * Script to remove unused imports from TypeScript/JavaScript files
 * This helps clean up the codebase and reduce TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get TypeScript errors
function getUnusedImports() {
  try {
    const output = execSync('cd apps/web && npm run type-check 2>&1 || true', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    const errors = output.split('\n')
      .filter(line => line.includes('error TS6133'))
      .map(line => {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\./);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            identifier: match[4]
          };
        }
        return null;
      })
      .filter(Boolean);

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

// Remove unused import from a line
function removeUnusedFromLine(line, identifiers) {
  let modified = line;

  // Handle named imports: import { A, B, C } from 'module'
  if (line.includes('{') && line.includes('}')) {
    identifiers.forEach(id => {
      // Remove the identifier and any trailing comma
      modified = modified.replace(new RegExp(`\\b${id}\\s*,?\\s*`, 'g'), '');
    });

    // Clean up any double commas
    modified = modified.replace(/,\s*,/g, ',');
    // Clean up trailing comma before }
    modified = modified.replace(/,\s*}/g, '}');
    // Clean up leading comma after {
    modified = modified.replace(/{,\s*/g, '{');

    // If the import is now empty, mark for removal
    if (modified.match(/import\s*{\s*}\s*from/)) {
      return null;
    }
  }

  // Handle default imports: import Something from 'module'
  identifiers.forEach(id => {
    const defaultImportRegex = new RegExp(`^\\s*import\\s+${id}\\s+from\\s+['"].*['"]`, 'g');
    if (defaultImportRegex.test(modified)) {
      return null;
    }
  });

  // Handle namespace imports: import * as Something from 'module'
  identifiers.forEach(id => {
    const namespaceRegex = new RegExp(`^\\s*import\\s+\\*\\s+as\\s+${id}\\s+from\\s+['"].*['"]`, 'g');
    if (namespaceRegex.test(modified)) {
      return null;
    }
  });

  return modified;
}

// Fix unused imports in a file
function fixFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Get all unused identifiers for this file
  const unusedIdentifiers = errors.map(e => e.identifier);

  // Process each line
  const newLines = [];
  let skipLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line contains imports
    if (line.includes('import ')) {
      const modifiedLine = removeUnusedFromLine(line, unusedIdentifiers);
      if (modifiedLine === null) {
        // Skip this line entirely
        continue;
      }
      newLines.push(modifiedLine);
    } else {
      newLines.push(line);
    }
  }

  // Write back the file
  const newContent = newLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed: ${filePath} (removed ${errors.length} unused imports)`);
  }
}

// Main function
function main() {
  console.log('Getting unused imports...');
  const errors = getUnusedImports();
  console.log(`Found ${errors.length} unused imports`);

  if (errors.length === 0) {
    console.log('No unused imports found!');
    return;
  }

  const grouped = groupByFile(errors);
  const fileCount = Object.keys(grouped).length;
  console.log(`Processing ${fileCount} files...`);

  let processed = 0;
  for (const [filePath, fileErrors] of Object.entries(grouped)) {
    fixFile(filePath, fileErrors);
    processed++;

    // Show progress
    if (processed % 10 === 0) {
      console.log(`Processed ${processed}/${fileCount} files...`);
    }
  }

  console.log(`\nDone! Processed ${fileCount} files`);
  console.log('Run npm run type-check again to verify');
}

// Run the script
main();