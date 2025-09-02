const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to replace
const replacements = [
  // Basic console.log replacements
  {
    pattern: /console\.log\s*\(\s*['"`](.*?)['"`]\s*\)/g,
    replacement: `logger.debug('$1')`
  },
  {
    pattern: /console\.log\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*?)\s*\)/g,
    replacement: `logger.debug('$1', { data: $2 })`
  },
  {
    pattern: /console\.log\s*\(\s*(['"`].*?['"`])\s*,\s*(.*?)\s*\)/g,
    replacement: `logger.debug($1, { data: $2 })`
  },
  
  // Console.error replacements
  {
    pattern: /console\.error\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*?)\s*\)/g,
    replacement: `logger.error('$1', $2)`
  },
  {
    pattern: /console\.error\s*\(\s*['"`](.*?)['"`]\s*\)/g,
    replacement: `logger.error('$1')`
  },
  
  // Console.warn replacements
  {
    pattern: /console\.warn\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*?)\s*\)/g,
    replacement: `logger.warn('$1', { data: $2 })`
  },
  {
    pattern: /console\.warn\s*\(\s*['"`](.*?)['"`]\s*\)/g,
    replacement: `logger.warn('$1')`
  },
  
  // Console.info replacements
  {
    pattern: /console\.info\s*\(\s*['"`](.*?)['"`]\s*,\s*(.*?)\s*\)/g,
    replacement: `logger.info('$1', { data: $2 })`
  },
  {
    pattern: /console\.info\s*\(\s*['"`](.*?)['"`]\s*\)/g,
    replacement: `logger.info('$1')`
  }
];

// Files to skip (generated files, node_modules, etc.)
const skipPatterns = [
  /node_modules/,
  /coverage/,
  /\.git/,
  /dist/,
  /build/,
  /\.expo/,
  /prettify\.js/,
  /lcov-report/
];

function shouldSkipFile(filePath) {
  return skipPatterns.some(pattern => pattern.test(filePath));
}

function needsLoggerImport(content) {
  // Check if any logger method is used in the content
  return /logger\.(debug|info|warn|error|performance|network|userAction|navigation|auth)/.test(content);
}

function addLoggerImport(content, filePath) {
  // Determine the correct import path based on file location
  const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '..', 'src', 'utils', 'logger'));
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  
  // Add import at the top of the file
  const importStatement = `import { logger } from '${importPath.replace(/\\/g, '/')}';\n`;
  
  // Find the position to insert the import (after other imports)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('const ') && lines[i].includes('require(')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      // Skip empty lines after imports
      continue;
    } else if (lines[i].trim() && insertIndex > 0) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, importStatement);
  return lines.join('\n');
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;
    
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      const beforeLength = newContent.length;
      newContent = newContent.replace(pattern, replacement);
      if (newContent.length !== beforeLength) {
        hasChanges = true;
      }
    });
    
    // Add logger import if needed and changes were made
    if (hasChanges && needsLoggerImport(newContent) && !newContent.includes("from '../utils/logger'") && !newContent.includes("from './logger'")) {
      newContent = addLoggerImport(newContent, filePath);
    }
    
    // Write back if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
      processFile(fullPath);
    }
  });
}

// Main execution
console.log('🔍 Replacing console.log statements with logger...');
console.log('📁 Processing src/ directory...');

const srcDir = path.join(__dirname, '..', 'src');
processDirectory(srcDir);

console.log('✅ Console.log replacement completed!');
console.log('📝 Note: Please review the changes and adjust import paths if needed.');