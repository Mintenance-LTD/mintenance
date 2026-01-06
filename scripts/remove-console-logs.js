#!/usr/bin/env node

/**
 * Script to remove console.log statements from production code
 * Preserves console.error, console.warn for error handling
 * Replaces console.log with proper logging using @mintenance/shared logger
 */

const fs = require('fs');
const path = require('path');

// Statistics tracking
const stats = {
  filesProcessed: 0,
  consoleLogs: {
    removed: 0,
    replaced: 0,
    skipped: 0
  },
  consoleErrors: 0,
  consoleWarns: 0,
  filesModified: [],
  errors: []
};

// Patterns to match different console methods
const CONSOLE_PATTERNS = {
  log: /console\s*\.\s*log\s*\([^)]*\)/g,
  error: /console\s*\.\s*error\s*\([^)]*\)/g,
  warn: /console\s*\.\s*warn\s*\([^)]*\)/g,
  info: /console\s*\.\s*info\s*\([^)]*\)/g,
  debug: /console\s*\.\s*debug\s*\([^)]*\)/g,
  multilineLog: /console\s*\.\s*log\s*\([^)]*\n[^)]*\)/g
};

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.turbo/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /test-.*\.(ts|tsx|js|jsx)$/,
  /scripts\//,
  /\.md$/,
  /\.json$/
];

// Determine if file should be skipped
function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

// Check if file already imports logger
function hasLoggerImport(content) {
  return content.includes("from '@mintenance/shared'") && content.includes('logger') ||
         content.includes('import { logger }') ||
         content.includes('import {logger}');
}

// Add logger import if needed
function addLoggerImport(content) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Check if there's already an import from @mintenance/shared
  const sharedImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]@mintenance\/shared['"]/);
  if (sharedImportMatch) {
    // Add logger to existing import
    const currentImports = sharedImportMatch[1];
    const newImports = `${currentImports}, logger`;
    return content.replace(sharedImportMatch[0], `import {${newImports}} from '@mintenance/shared'`);
  }

  // Find the right place to add import (after other imports)
  const importRegex = /^import .* from ['"].*['"];?$/m;
  const lastImportMatch = content.match(/^import .* from ['"].*['"];?$/gm);

  if (lastImportMatch && lastImportMatch.length > 0) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    return content.replace(lastImport, lastImport + `\nimport { logger } from '@mintenance/shared';`);
  } else {
    // Add at the beginning if no imports found
    return `import { logger } from '@mintenance/shared';\n` + content;
  }
}

// Extract meaningful context from console.log
function extractLogContext(logStatement) {
  // Extract the content inside console.log()
  const match = logStatement.match(/console\s*\.\s*log\s*\(([^)]+)\)/);
  if (!match) return { message: 'Log statement', context: {} };

  const content = match[1].trim();

  // Handle template literals
  if (content.startsWith('`')) {
    return { message: content.replace(/`/g, '').replace(/\$\{[^}]+\}/g, '%s'), context: {} };
  }

  // Handle string literals
  if (content.startsWith('"') || content.startsWith("'")) {
    const message = content.replace(/^['"]|['"]$/g, '');
    return { message, context: {} };
  }

  // Handle multiple arguments (message, data)
  const parts = content.split(',').map(p => p.trim());
  if (parts.length > 1) {
    const message = parts[0].replace(/^['"`]|['"`]$/g, '');
    return { message, context: parts.slice(1).join(', ') };
  }

  // Default case
  return { message: 'Log output', context: content };
}

// Convert console.log to logger
function convertConsoleToLogger(content, filePath) {
  let modified = content;
  let logsReplaced = 0;

  // Handle multiline console.log first
  const multilineLogs = content.match(CONSOLE_PATTERNS.multilineLog);
  if (multilineLogs) {
    multilineLogs.forEach(log => {
      const { message } = extractLogContext(log);
      const replacement = `logger.info('${message}', {
        service: '${getServiceName(filePath)}'
      })`;
      modified = modified.replace(log, replacement);
      logsReplaced++;
    });
  }

  // Handle single line console.log
  const singleLineLogs = modified.match(CONSOLE_PATTERNS.log);
  if (singleLineLogs) {
    singleLineLogs.forEach(log => {
      const { message, context } = extractLogContext(log);

      // Determine log level based on context
      let logLevel = 'info';
      if (message.toLowerCase().includes('error')) logLevel = 'error';
      else if (message.toLowerCase().includes('warn')) logLevel = 'warn';
      else if (message.toLowerCase().includes('debug')) logLevel = 'debug';

      let replacement;
      if (context && context !== '{}') {
        replacement = `logger.${logLevel}('${message}', ${context}, { service: '${getServiceName(filePath)}' })`;
      } else {
        replacement = `logger.${logLevel}('${message}', { service: '${getServiceName(filePath)}' })`;
      }

      modified = modified.replace(log, replacement);
      logsReplaced++;
    });
  }

  // Handle console.error - convert to logger.error
  const errorLogs = modified.match(CONSOLE_PATTERNS.error);
  if (errorLogs) {
    errorLogs.forEach(log => {
      const { message, context } = extractLogContext(log.replace('console.error', 'console.log'));
      const replacement = context && context !== '{}'
        ? `logger.error('${message}', ${context}, { service: '${getServiceName(filePath)}' })`
        : `logger.error('${message}', { service: '${getServiceName(filePath)}' })`;
      modified = modified.replace(log, replacement);
      stats.consoleErrors++;
    });
  }

  // Handle console.warn - convert to logger.warn
  const warnLogs = modified.match(CONSOLE_PATTERNS.warn);
  if (warnLogs) {
    warnLogs.forEach(log => {
      const { message, context } = extractLogContext(log.replace('console.warn', 'console.log'));
      const replacement = context && context !== '{}'
        ? `logger.warn('${message}', ${context}, { service: '${getServiceName(filePath)}' })`
        : `logger.warn('${message}', { service: '${getServiceName(filePath)}' })`;
      modified = modified.replace(log, replacement);
      stats.consoleWarns++;
    });
  }

  return { modified, logsReplaced };
}

// Get service name from file path
function getServiceName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/api/')) return 'api';
  if (normalized.includes('/lib/')) return 'lib';
  if (normalized.includes('/components/')) return 'ui';
  if (normalized.includes('/app/')) return 'app';
  if (normalized.includes('/mobile/')) return 'mobile';
  return 'general';
}

// Process a single file
function processFile(filePath) {
  try {
    // Skip if should be ignored
    if (shouldSkipFile(filePath)) {
      return { processed: false, reason: 'skipped' };
    }

    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check if file has console statements
    const hasConsoleLogs = CONSOLE_PATTERNS.log.test(content) ||
                          CONSOLE_PATTERNS.multilineLog.test(content);
    const hasConsoleErrors = CONSOLE_PATTERNS.error.test(content);
    const hasConsoleWarns = CONSOLE_PATTERNS.warn.test(content);

    if (!hasConsoleLogs && !hasConsoleErrors && !hasConsoleWarns) {
      return { processed: false, reason: 'no console statements' };
    }

    // Convert console statements to logger
    const { modified, logsReplaced } = convertConsoleToLogger(content, filePath);
    content = modified;

    // Add logger import if we replaced any logs
    if (logsReplaced > 0 || hasConsoleErrors || hasConsoleWarns) {
      content = addLoggerImport(content);
    }

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified.push(filePath);
      stats.consoleLogs.replaced += logsReplaced;
      stats.filesProcessed++;

      console.log(`✅ Processed: ${filePath.replace(process.cwd(), '.')} (${logsReplaced} logs replaced)`);
      return { processed: true, logsReplaced };
    }

    return { processed: false, reason: 'no changes needed' };

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return { processed: false, reason: 'error', error: error.message };
  }
}

// Walk directory recursively
function walkDirectory(dir) {
  const files = [];

  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !shouldSkipFile(fullPath)) {
          walk(fullPath);
        } else if (stat.isFile() && (
          fullPath.endsWith('.ts') ||
          fullPath.endsWith('.tsx') ||
          fullPath.endsWith('.js') ||
          fullPath.endsWith('.jsx')
        )) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}: ${error.message}`);
    }
  }

  walk(dir);
  return files;
}

// Main execution
async function main() {
  console.log('=== REMOVING CONSOLE.LOG STATEMENTS ===\n');
  console.log('This script will:');
  console.log('1. Replace console.log with logger.info');
  console.log('2. Replace console.error with logger.error');
  console.log('3. Replace console.warn with logger.warn');
  console.log('4. Add logger imports where needed');
  console.log('5. Skip test files and scripts\n');

  // Find all TypeScript/JavaScript files
  const webFiles = walkDirectory(path.join(process.cwd(), 'apps', 'web'));
  const mobileFiles = walkDirectory(path.join(process.cwd(), 'apps', 'mobile'));
  const packageFiles = walkDirectory(path.join(process.cwd(), 'packages'));

  const allFiles = [...webFiles, ...mobileFiles, ...packageFiles];
  console.log(`Found ${allFiles.length} files to check\n`);

  // Process each file
  let processedCount = 0;
  for (const file of allFiles) {
    const result = processFile(file);
    if (result.processed) processedCount++;
  }

  // Print summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`📁 Files processed: ${stats.filesProcessed}`);
  console.log(`✅ Files modified: ${stats.filesModified.length}`);
  console.log(`📝 console.log replaced: ${stats.consoleLogs.replaced}`);
  console.log(`⚠️ console.error converted: ${stats.consoleErrors}`);
  console.log(`⚠️ console.warn converted: ${stats.consoleWarns}`);
  console.log(`❌ Errors: ${stats.errors.length}`);

  // List modified files
  if (stats.filesModified.length > 0) {
    console.log('\n=== MODIFIED FILES ===');
    stats.filesModified.forEach(file => {
      console.log(`  - ${file.replace(process.cwd(), '.')}`);
    });
  }

  // List errors if any
  if (stats.errors.length > 0) {
    console.log('\n=== ERRORS ===');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file.replace(process.cwd(), '.')}: ${error}`);
    });
  }

  // Create report
  const report = {
    timestamp: new Date().toISOString(),
    filesProcessed: stats.filesProcessed,
    filesModified: stats.filesModified.length,
    consoleLogs: stats.consoleLogs,
    consoleErrors: stats.consoleErrors,
    consoleWarns: stats.consoleWarns,
    errors: stats.errors,
    modifiedFiles: stats.filesModified.map(f => f.replace(process.cwd(), '.'))
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'console-log-removal-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  console.log('\n📊 Detailed report saved to: console-log-removal-report.json');
  console.log('\n✅ Console.log removal complete!');

  // Verification command
  console.log('\n📝 To verify remaining console statements, run:');
  console.log(`   grep -r "console\\.log" apps/ packages/ --include="*.ts" --include="*.tsx" | wc -l`);
}

// Run the script
main().catch(console.error);