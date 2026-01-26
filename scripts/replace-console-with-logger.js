#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  directories: ['apps/web', 'apps/mobile', 'packages'],
  fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  excludeDirs: ['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__', '__mocks__'],
  // Files that should keep console (like scripts, migrations, etc)
  keepConsolePatterns: [
    '**/scripts/**',
    '**/migrations/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/redis-validator.ts',
    '**/migration-runner.ts',
  ],
};

// Track statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleLogReplaced: 0,
  consoleErrorReplaced: 0,
  consoleWarnReplaced: 0,
  consoleInfoReplaced: 0,
  consoleDebugReplaced: 0,
  loggerImportsAdded: 0,
  errors: [],
};

// Regular expressions for matching console statements
const consolePatterns = {
  log: /console\.log\s*\(/g,
  error: /console\.error\s*\(/g,
  warn: /console\.warn\s*\(/g,
  info: /console\.info\s*\(/g,
  debug: /console\.debug\s*\(/g,
};

// Check if file should keep console statements
function shouldKeepConsole(filePath) {
  return config.keepConsolePatterns.some(pattern => {
    const normalizedPattern = pattern.replace(/\*\*/g, '**').replace(/\\/g, '/');
    const normalizedPath = filePath.replace(/\\/g, '/');
    return normalizedPath.includes(normalizedPattern.replace(/\*/g, ''));
  });
}

// Check if file already imports logger
function hasLoggerImport(content) {
  return content.includes("from '@mintenance/shared'") && content.includes('logger');
}

// Add logger import to file
function addLoggerImport(content) {
  // Check if there's already an import from @mintenance/shared
  const sharedImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]@mintenance\/shared['"]/);

  if (sharedImportMatch) {
    const imports = sharedImportMatch[1];
    if (!imports.includes('logger')) {
      // Add logger to existing import
      const newImports = imports.trim() + ', logger';
      return content.replace(sharedImportMatch[0], `import { ${newImports} } from '@mintenance/shared'`);
    }
    return content;
  }

  // Add new import after other imports
  const importMatch = content.match(/^(import[\s\S]*?(?:from\s*['"][^'"]+['"];?\s*\n)+)/m);
  if (importMatch) {
    const lastImportEnd = importMatch.index + importMatch[0].length;
    return content.slice(0, lastImportEnd) +
           `import { logger } from '@mintenance/shared';\n` +
           content.slice(lastImportEnd);
  }

  // Add at the beginning if no imports found
  return `import { logger } from '@mintenance/shared';\n\n` + content;
}

// Replace console statements with logger
function replaceConsoleStatements(content, filePath) {
  let modifiedContent = content;
  let modified = false;
  let needsLoggerImport = false;

  // Replace console.log with logger.info
  if (modifiedContent.match(consolePatterns.log)) {
    modifiedContent = modifiedContent.replace(consolePatterns.log, 'logger.info(');
    stats.consoleLogReplaced += (content.match(consolePatterns.log) || []).length;
    modified = true;
    needsLoggerImport = true;
  }

  // Replace console.error with logger.error
  if (modifiedContent.match(consolePatterns.error)) {
    modifiedContent = modifiedContent.replace(consolePatterns.error, 'logger.error(');
    stats.consoleErrorReplaced += (content.match(consolePatterns.error) || []).length;
    modified = true;
    needsLoggerImport = true;
  }

  // Replace console.warn with logger.warn
  if (modifiedContent.match(consolePatterns.warn)) {
    modifiedContent = modifiedContent.replace(consolePatterns.warn, 'logger.warn(');
    stats.consoleWarnReplaced += (content.match(consolePatterns.warn) || []).length;
    modified = true;
    needsLoggerImport = true;
  }

  // Replace console.info with logger.info
  if (modifiedContent.match(consolePatterns.info)) {
    modifiedContent = modifiedContent.replace(consolePatterns.info, 'logger.info(');
    stats.consoleInfoReplaced += (content.match(consolePatterns.info) || []).length;
    modified = true;
    needsLoggerImport = true;
  }

  // Replace console.debug with logger.debug
  if (modifiedContent.match(consolePatterns.debug)) {
    modifiedContent = modifiedContent.replace(consolePatterns.debug, 'logger.debug(');
    stats.consoleDebugReplaced += (content.match(consolePatterns.debug) || []).length;
    modified = true;
    needsLoggerImport = true;
  }

  // Add logger import if needed
  if (needsLoggerImport && !hasLoggerImport(modifiedContent)) {
    modifiedContent = addLoggerImport(modifiedContent);
    stats.loggerImportsAdded++;
  }

  return { content: modifiedContent, modified };
}

// Process a single file
function processFile(filePath) {
  try {
    stats.filesProcessed++;

    // Skip if should keep console
    if (shouldKeepConsole(filePath)) {
      console.log(`⏭️  Skipping (allowed): ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, modified } = replaceConsoleStatements(content, filePath);

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.filesModified++;
      console.log(`✅ Modified: ${filePath}`);
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🔄 Starting console.log replacement with logger...\n');

  // Build glob patterns
  const patterns = config.directories.map(dir =>
    `${dir}/**/*.{${config.fileExtensions.join(',')}}`
  );

  // Find all files
  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, {
      ignore: config.excludeDirs.map(dir => `**/${dir}/**`),
    });
    allFiles = allFiles.concat(files);
  });

  console.log(`📁 Found ${allFiles.length} files to process\n`);

  // Process each file
  allFiles.forEach(file => {
    processFile(path.resolve(file));
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPLACEMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`\nReplacements:`);
  console.log(`  console.log → logger.info: ${stats.consoleLogReplaced}`);
  console.log(`  console.error → logger.error: ${stats.consoleErrorReplaced}`);
  console.log(`  console.warn → logger.warn: ${stats.consoleWarnReplaced}`);
  console.log(`  console.info → logger.info: ${stats.consoleInfoReplaced}`);
  console.log(`  console.debug → logger.debug: ${stats.consoleDebugReplaced}`);
  console.log(`  Logger imports added: ${stats.loggerImportsAdded}`);

  const totalReplacements = stats.consoleLogReplaced + stats.consoleErrorReplaced +
                           stats.consoleWarnReplaced + stats.consoleInfoReplaced +
                           stats.consoleDebugReplaced;
  console.log(`\n📈 Total replacements: ${totalReplacements}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n✨ Console replacement complete!');
}

// Run the script
main();