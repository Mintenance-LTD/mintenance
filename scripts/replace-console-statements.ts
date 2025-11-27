#!/usr/bin/env tsx

/**
 * Console Statement Replacement Script
 * 
 * Finds and replaces console.log/error/warn/info/debug with logger from @mintenance/shared
 * 
 * Usage:
 *   npx tsx scripts/replace-console-statements.ts [--dry-run] [--path <path>]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface Replacement {
  file: string;
  line: number;
  original: string;
  replacement: string;
  method: 'log' | 'error' | 'warn' | 'info' | 'debug';
}

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PATH = process.argv.includes('--path') 
  ? process.argv[process.argv.indexOf('--path') + 1]
  : 'apps/web';

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  'coverage',
  'dist',
  'build',
  'logger.ts', // Don't replace in logger itself
  'scripts/', // Scripts can use console
];

const replacements: Replacement[] = [];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldExclude(filePath)) {
        findFiles(filePath, fileList);
      }
    } else if (stat.isFile()) {
      if (!shouldExclude(filePath)) {
        const ext = file.split('.').pop();
        if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
          fileList.push(filePath);
        }
      }
    }
  }

  return fileList;
}

function replaceConsoleStatements(content: string, filePath: string): { content: string; replacements: Replacement[] } {
  const lines = content.split('\n');
  const fileReplacements: Replacement[] = [];
  let hasLoggerImport = content.includes("from '@mintenance/shared'") || content.includes('from "@mintenance/shared"');
  let loggerImportLine = -1;

  // Check if logger is already imported
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import") && lines[i].includes("logger") && (lines[i].includes("@mintenance/shared") || lines[i].includes('@mintenance/shared'))) {
      hasLoggerImport = true;
      loggerImportLine = i;
      break;
    }
  }

  const newLines: string[] = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip if it's already using logger or in a comment
    if (trimmed.includes('logger.') || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      newLines.push(line);
      continue;
    }

    // Match console.log/error/warn/info/debug patterns
    const consoleMatch = trimmed.match(/console\.(log|error|warn|info|debug)\s*\(/);
    if (consoleMatch) {
      const method = consoleMatch[1] as 'log' | 'error' | 'warn' | 'info' | 'debug';
      
      // Extract the arguments
      let args = '';
      let depth = 0;
      let startIdx = trimmed.indexOf('(');
      let j = startIdx;
      
      for (; j < trimmed.length; j++) {
        if (trimmed[j] === '(') depth++;
        if (trimmed[j] === ')') depth--;
        if (depth === 0 && trimmed[j] === ')') {
          args = trimmed.substring(startIdx + 1, j);
          break;
        }
      }

      // If we didn't find the closing paren on this line, look ahead
      if (depth > 0) {
        let multiLine = line;
        let lineIdx = i + 1;
        while (lineIdx < lines.length && depth > 0) {
          multiLine += '\n' + lines[lineIdx];
          for (const char of lines[lineIdx]) {
            if (char === '(') depth++;
            if (char === ')') depth--;
          }
          lineIdx++;
        }
        // For multiline, we'll handle it more carefully
        args = multiLine.substring(multiLine.indexOf('(') + 1, multiLine.lastIndexOf(')'));
      }

      // Determine logger method based on console method
      let loggerMethod = method;
      if (method === 'log') {
        loggerMethod = 'info'; // console.log -> logger.info
      }

      // Create replacement
      const indent = line.substring(0, line.indexOf('console'));
      let replacement = '';

      // Parse arguments to determine if it's a message + context pattern
      const argsTrimmed = args.trim();
      
      if (argsTrimmed.length === 0) {
        // Empty call - just remove it or log a generic message
        replacement = `${indent}logger.${loggerMethod}('Log statement');`;
      } else {
        // Try to parse arguments
        // Simple case: single string argument
        if (argsTrimmed.startsWith('"') || argsTrimmed.startsWith("'") || argsTrimmed.startsWith('`')) {
          replacement = `${indent}logger.${loggerMethod}(${args});`;
        } else {
          // Multiple arguments - treat first as message, rest as context
          // This is a simplified approach - may need manual review for complex cases
          const argParts = args.split(',').map(a => a.trim());
          if (argParts.length === 1) {
            replacement = `${indent}logger.${loggerMethod}(${args});`;
          } else {
            // Multiple args: first is message, rest is context
            const message = argParts[0];
            const context = argParts.slice(1).join(', ');
            replacement = `${indent}logger.${loggerMethod}(${message}, { ${context} });`;
          }
        }
      }

      // Handle multiline replacements
      if (depth > 0) {
        // Skip the additional lines we consumed
        const skipLines = lineIdx - i - 1;
        for (let k = 0; k < skipLines; k++) {
          i++;
        }
      }

      fileReplacements.push({
        file: filePath,
        line: i + 1,
        original: line,
        replacement: replacement,
        method,
      });

      newLines.push(replacement);
      modified = true;

      // Add logger import if needed
      if (!hasLoggerImport) {
        // Find the best place to add import (after other imports)
        let importInsertIndex = 0;
        for (let k = 0; k < newLines.length; k++) {
          if (newLines[k].trim().startsWith('import ')) {
            importInsertIndex = k + 1;
          } else if (newLines[k].trim() && !newLines[k].trim().startsWith('import ')) {
            break;
          }
        }
        if (importInsertIndex > 0 && !newLines.some(l => l.includes("import { logger }"))) {
          newLines.splice(importInsertIndex, 0, "import { logger } from '@mintenance/shared';");
          hasLoggerImport = true;
        }
      }
    } else {
      newLines.push(line);
    }
  }

  return {
    content: modified ? newLines.join('\n') : content,
    replacements: fileReplacements,
  };
}

function processFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { content: newContent, replacements: fileReplacements } = replaceConsoleStatements(content, filePath);

    if (fileReplacements.length > 0) {
      replacements.push(...fileReplacements);

      if (!DRY_RUN) {
        writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Updated: ${relative(process.cwd(), filePath)} (${fileReplacements.length} replacements)`);
      } else {
        console.log(`🔍 Would update: ${relative(process.cwd(), filePath)} (${fileReplacements.length} replacements)`);
        fileReplacements.forEach(r => {
          console.log(`   Line ${r.line}: ${r.method} -> logger.${r.method === 'log' ? 'info' : r.method}`);
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

function main() {
  console.log(`\n${DRY_RUN ? '🔍 DRY RUN MODE' : '🚀 REPLACEMENT MODE'}\n`);
  console.log(`Scanning: ${TARGET_PATH}\n`);

  const files = findFiles(TARGET_PATH);
  console.log(`Found ${files.length} files to scan\n`);

  // Process files in priority order
  const priorityFiles = files.filter(f => 
    f.includes('/app/api/') || 
    f.includes('/lib/services/') || 
    f.includes('/lib/')
  );
  const otherFiles = files.filter(f => !priorityFiles.includes(f));

  // Process priority files first
  console.log('Processing priority files (API routes, services, lib)...\n');
  priorityFiles.forEach(processFile);

  // Then process other files
  console.log('\nProcessing other files...\n');
  otherFiles.forEach(processFile);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Summary\n');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Total replacements: ${replacements.length}`);
  
  const byMethod = replacements.reduce((acc, r) => {
    acc[r.method] = (acc[r.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\nReplacements by method:');
  Object.entries(byMethod).forEach(([method, count]) => {
    console.log(`  console.${method}: ${count}`);
  });

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Use without --dry-run to apply changes.\n');
  } else {
    console.log('\n✅ Replacement complete!\n');
  }
}

main();

