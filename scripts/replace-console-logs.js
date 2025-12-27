#!/usr/bin/env node

/**
 * Console.log Replacement Script
 *
 * Automatically replaces console.log/error/warn/debug statements with proper logger calls
 * Handles various console patterns and edge cases safely
 *
 * Usage: node scripts/replace-console-logs.js [options]
 * Options:
 *   --dry-run    Show what would be changed without modifying files
 *   --verbose    Show detailed progress
 *   --analyze    Only analyze files, don't replace
 *   --path       Specific path to process
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  analyze: args.includes('--analyze'),
  specificPath: args.find(arg => arg.startsWith('--path='))?.split('=')[1]
};

// Directories to scan
const SCAN_DIRS = [
  'apps/mobile/src',
  'apps/web',
  'packages',
  'supabase/functions',
  'scripts'
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.expo',
  '__tests__',
  '.test.',
  '.spec.',
  'coverage',
  'replace-console-logs.js' // Don't modify this script itself
];

// Logger import statements for different contexts
const LOGGER_IMPORTS = {
  web: `import { logger } from '@/lib/logger';`,
  mobile: `import { logger } from '@/utils/logger';`,
  shared: `import { logger } from '@mintenance/shared/logger';`,
  packages: `import { logger } from '../logger';`,
  scripts: `const { logger } = require('@mintenance/shared/src/logger');`,
  supabase: `import { logger } from '@mintenance/shared/logger';`
};

// Map console methods to logger methods
const CONSOLE_TO_LOGGER_MAP = {
  'log': 'info',
  'info': 'info',
  'warn': 'warn',
  'error': 'error',
  'debug': 'debug',
  'trace': 'debug',
  'dir': 'debug',
  'table': 'debug'
};

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fsSync.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);

    if (shouldExclude(fullPath)) {
      continue;
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      arrayOfFiles = await getAllFiles(fullPath, arrayOfFiles);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

// Determine the appropriate logger import based on file path
function getLoggerImport(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (normalizedPath.includes('/apps/web/')) {
    return LOGGER_IMPORTS.web;
  }
  if (normalizedPath.includes('/apps/mobile/')) {
    return LOGGER_IMPORTS.mobile;
  }
  if (normalizedPath.includes('/packages/shared/')) {
    // Already has logger, may need different import
    return null;
  }
  if (normalizedPath.includes('/packages/')) {
    return LOGGER_IMPORTS.packages;
  }
  if (normalizedPath.includes('/scripts/')) {
    return LOGGER_IMPORTS.scripts;
  }
  if (normalizedPath.includes('/supabase/functions/')) {
    return LOGGER_IMPORTS.supabase;
  }

  // Default to shared logger
  return LOGGER_IMPORTS.shared;
}

// Simple regex-based analysis for quick scanning
async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    const consoleMatch = line.match(/console\.(log|error|warn|info|debug|trace|dir|table)/);

    if (consoleMatch) {
      issues.push({
        file: filePath,
        line: index + 1,
        type: consoleMatch[1],
        code: line.trim()
      });
    }
  });

  return issues;
}

// AST-based replacement for accurate transformations
async function replaceInFile(filePath) {
  const loggerImport = getLoggerImport(filePath);

  // Skip files that already have logger or shouldn't be modified
  if (loggerImport === null && !filePath.includes('/packages/shared/src/logger')) {
    if (options.verbose) {
      console.log(`  Skipping: ${path.relative(process.cwd(), filePath)}`);
    }
    return { skipped: true };
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Parse the file
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator'
      ],
      errorRecovery: true
    });

    let modified = false;
    let hasLoggerImport = false;
    let needsLoggerImport = false;
    const replacements = [];

    // Check for existing logger import
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (source.includes('logger')) {
          hasLoggerImport = true;
        }
      },
      VariableDeclaration(path) {
        // Check for require statements
        const init = path.node.declarations[0]?.init;
        if (t.isCallExpression(init) &&
            t.isIdentifier(init.callee, { name: 'require' }) &&
            init.arguments[0]?.value?.includes('logger')) {
          hasLoggerImport = true;
        }
      }
    });

    // Replace console calls
    traverse(ast, {
      CallExpression(path) {
        if (!t.isMemberExpression(path.node.callee)) return;
        if (!t.isIdentifier(path.node.callee.object, { name: 'console' })) return;

        const method = path.node.callee.property.name;
        const loggerMethod = CONSOLE_TO_LOGGER_MAP[method];

        if (!loggerMethod) return;

        const args = path.node.arguments;
        let newArgs = [];

        // Handle different argument patterns
        if (method === 'error' && args.length >= 2) {
          // console.error('message', error) -> logger.error('message', error)
          newArgs = args;
        } else if (args.length === 1) {
          // Single argument
          newArgs = args;
        } else if (args.length > 1) {
          // Multiple arguments - combine into context
          const firstArg = args[0];

          if (t.isStringLiteral(firstArg) || t.isTemplateLiteral(firstArg)) {
            // First is string, rest as context
            if (args.length === 2) {
              newArgs = args; // Keep as is
            } else {
              // Combine rest into object
              const props = args.slice(1).map((arg, i) =>
                t.objectProperty(t.identifier(`arg${i + 1}`), arg)
              );
              newArgs = [firstArg, t.objectExpression(props)];
            }
          } else {
            // No string message - create one
            const props = args.map((arg, i) =>
              t.objectProperty(t.identifier(`arg${i + 1}`), arg)
            );
            newArgs = [
              t.stringLiteral(`${method} output`),
              t.objectExpression(props)
            ];
          }
        }

        // Create logger call
        const loggerCall = t.callExpression(
          t.memberExpression(
            t.identifier('logger'),
            t.identifier(loggerMethod)
          ),
          newArgs
        );

        const oldCode = generate(path.node, { compact: true }).code;
        path.replaceWith(loggerCall);
        const newCode = generate(loggerCall, { compact: true }).code;

        replacements.push({
          old: oldCode,
          new: newCode,
          line: path.node.loc?.start?.line
        });

        modified = true;
        needsLoggerImport = true;
      }
    });

    // Add logger import if needed
    if (needsLoggerImport && !hasLoggerImport && loggerImport) {
      const importAst = parse(loggerImport, {
        sourceType: 'module',
        plugins: ['typescript']
      });

      // Find the last import statement
      let lastImportIndex = -1;
      ast.program.body.forEach((node, index) => {
        if (t.isImportDeclaration(node)) {
          lastImportIndex = index;
        }
      });

      // Insert after last import or at beginning
      const insertIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
      ast.program.body.splice(insertIndex, 0, importAst.program.body[0]);
      modified = true;
    }

    if (modified) {
      const output = generate(ast, {
        retainLines: false,
        retainFunctionParens: true,
        compact: false
      });

      if (!options.dryRun && !options.analyze) {
        await fs.writeFile(filePath, output.code);
      }

      return {
        modified: true,
        replacements,
        addedImport: needsLoggerImport && !hasLoggerImport
      };
    }

    return { modified: false };

  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  console.log('🔄 Console.log Replacement Script');
  console.log('==================================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  if (options.analyze) {
    console.log('📊 ANALYZE MODE - Only showing analysis\n');
  }

  // Collect all files
  let allFiles = [];

  if (options.specificPath) {
    const stat = await fs.stat(options.specificPath);
    if (stat.isDirectory()) {
      allFiles = await getAllFiles(options.specificPath);
    } else {
      allFiles = [options.specificPath];
    }
  } else {
    for (const dir of SCAN_DIRS) {
      const files = await getAllFiles(dir);
      allFiles = allFiles.concat(files);
    }
  }

  console.log(`Found ${allFiles.length} files to process\n`);

  // Analysis phase
  let allIssues = [];
  for (const file of allFiles) {
    const issues = await analyzeFile(file);
    allIssues = allIssues.concat(issues);
  }

  // Show analysis results
  const byType = allIssues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Console Statement Summary:');
  console.log(`  Total: ${allIssues.length} statements in ${allFiles.length} files`);
  console.log('  By type:', JSON.stringify(byType, null, 2));

  if (options.analyze) {
    // Show top files with most console statements
    const byFile = {};
    allIssues.forEach(issue => {
      const relPath = path.relative(process.cwd(), issue.file);
      byFile[relPath] = (byFile[relPath] || 0) + 1;
    });

    const sorted = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n📁 Top 10 files with console statements:');
    sorted.forEach(([file, count]) => {
      console.log(`  ${count.toString().padStart(4)} - ${file}`);
    });

    console.log('\n💡 Run without --analyze to perform replacements');
    return;
  }

  // Replacement phase
  if (allIssues.length > 0 && !options.analyze) {
    console.log('\n🔧 Replacing console statements...\n');

    const results = {
      modified: 0,
      skipped: 0,
      errors: 0,
      totalReplacements: 0
    };

    const modifiedFiles = [];
    const errorFiles = [];

    // Process each file with issues
    const filesWithIssues = [...new Set(allIssues.map(i => i.file))];

    for (const file of filesWithIssues) {
      if (options.verbose) {
        console.log(`Processing: ${path.relative(process.cwd(), file)}`);
      }

      const result = await replaceInFile(file);

      if (result.skipped) {
        results.skipped++;
      } else if (result.error) {
        results.errors++;
        errorFiles.push({ file, error: result.error });
        if (options.verbose) {
          console.log(`  ❌ Error: ${result.error}`);
        }
      } else if (result.modified) {
        results.modified++;
        results.totalReplacements += result.replacements.length;
        modifiedFiles.push({
          file,
          replacements: result.replacements.length,
          addedImport: result.addedImport
        });

        if (options.verbose) {
          console.log(`  ✅ Modified (${result.replacements.length} replacements)`);
          if (result.addedImport) {
            console.log(`     Added logger import`);
          }
        }
      }
    }

    // Final summary
    console.log('\n📋 Results Summary:');
    console.log(`  Files modified: ${results.modified}`);
    console.log(`  Files skipped: ${results.skipped}`);
    console.log(`  Files with errors: ${results.errors}`);
    console.log(`  Total replacements: ${results.totalReplacements}`);

    if (modifiedFiles.length > 0 && !options.verbose) {
      console.log('\n✅ Modified files:');
      modifiedFiles.slice(0, 20).forEach(f => {
        const relPath = path.relative(process.cwd(), f.file);
        console.log(`  - ${relPath} (${f.replacements} replacements)`);
      });
      if (modifiedFiles.length > 20) {
        console.log(`  ... and ${modifiedFiles.length - 20} more`);
      }
    }

    if (errorFiles.length > 0) {
      console.log('\n❌ Files with errors:');
      errorFiles.forEach(f => {
        const relPath = path.relative(process.cwd(), f.file);
        console.log(`  - ${relPath}: ${f.error}`);
      });
    }

    if (options.dryRun) {
      console.log('\nℹ️  This was a dry run. No files were modified.');
      console.log('   Remove --dry-run to apply changes.');
    }
  } else if (allIssues.length === 0) {
    console.log('\n✨ No console statements found! Your code is clean.');
  }

  console.log('\n📖 Logger Usage Guide:');
  console.log('  logger.debug(message, context?)   - Development only logs');
  console.log('  logger.info(message, context?)    - Informational messages');
  console.log('  logger.warn(message, context?)    - Warning messages');
  console.log('  logger.error(message, error?, context?) - Error messages');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeFile, getAllFiles, replaceInFile };