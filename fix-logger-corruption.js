#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Pattern to find corrupted logger calls
const corruptedPattern = /(logger\.(info|warn|error|debug))\([^)]*'\s*,\s*\[object Object\][^)]*\)/g;

// Fix corrupted logger calls
function fixLoggerCalls(content) {
  let fixed = content;
  let count = 0;

  // Fix patterns like: logger.error('message:', error', [object Object], { service: 'app' });
  // Should be: logger.error('message:', error, { service: 'app' });
  fixed = fixed.replace(
    /(logger\.(info|warn|error|debug))\(([^,)]+),\s*([^',)]+)'\s*,\s*\[object Object\],\s*(\{[^}]+\})\s*\)/g,
    (match, loggerMethod, level, message, variable, context) => {
      count++;
      return `${loggerMethod}(${message}, ${variable}, ${context})`;
    }
  );

  // Fix patterns like: logger.info('message', [object Object], { service: 'general' });
  // Should be: logger.info('message', { service: 'general' });
  fixed = fixed.replace(
    /(logger\.(info|warn|error|debug))\(([^,)]+),\s*\[object Object\],\s*(\{[^}]+\})\s*\)/g,
    (match, loggerMethod, level, message, context) => {
      count++;
      return `${loggerMethod}(${message}, ${context})`;
    }
  );

  // Fix patterns like: logger.info('message %s', [object Object], { service: 'general' });
  // Should be: logger.info('message', { service: 'general' });
  fixed = fixed.replace(
    /(logger\.(info|warn|error|debug))\('([^']+)%s'\s*,\s*\[object Object\],\s*(\{[^}]+\})\s*\)/g,
    (match, loggerMethod, level, message, context) => {
      count++;
      return `${loggerMethod}('${message}', ${context})`;
    }
  );

  // Fix patterns like: logger.info('message', value', [object Object], { service: 'app' });
  // Should be: logger.info('message', value, { service: 'app' });
  fixed = fixed.replace(
    /(logger\.(info|warn|error|debug))\(([^,)]+),\s*([^',)]+)'\s*,\s*\[object Object\],\s*(\{[^}]+\})\s*\)/g,
    (match, loggerMethod, level, message, variable, context) => {
      count++;
      return `${loggerMethod}(${message}, ${variable}, ${context})`;
    }
  );

  // Fix patterns like: }', [object Object], { service: 'ui' });
  // This is a broken multi-line logger call
  fixed = fixed.replace(
    /\}'\s*,\s*\[object Object\],\s*(\{[^}]+\})\s*\);/g,
    (match, context) => {
      count++;
      return `}, ${context});`;
    }
  );

  // Fix patterns like: logger.info('text', param', [object Object], { service: 'lib' });
  fixed = fixed.replace(
    /(logger\.(info|warn|error|debug))\('([^']+)',\s*([^',)]+)'\s*,\s*\[object Object\],\s*(\{[^}]+\})\s*\)/g,
    (match, loggerMethod, level, text, param, context) => {
      count++;
      return `${loggerMethod}('${text}', ${param}, ${context})`;
    }
  );

  // Fix patterns in comments too (for examples)
  fixed = fixed.replace(
    /\/\/\s*(logger\.(info|warn|error|debug))\([^)]*'\s*,\s*\[object Object\][^)]*\)/g,
    (match, loggerMethod, level) => {
      const fixedMatch = match.replace(/', \[object Object\]/g, '');
      count++;
      return fixedMatch;
    }
  );

  return { fixed, count };
}

// Process all TypeScript/JavaScript files
async function processFiles() {
  const patterns = [
    'apps/web/**/*.{ts,tsx,js,jsx}',
    'packages/**/*.{ts,tsx,js,jsx}',
    'apps/mobile/**/*.{ts,tsx,js,jsx}'
  ];

  let totalFiles = 0;
  let fixedFiles = 0;
  let totalFixes = 0;

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**']
    });

    for (const file of files) {
      totalFiles++;
      const content = fs.readFileSync(file, 'utf8');

      if (content.includes('[object Object]')) {
        const { fixed, count } = fixLoggerCalls(content);

        if (count > 0) {
          fs.writeFileSync(file, fixed, 'utf8');
          console.log(`✅ Fixed ${count} corrupted logger calls in: ${file}`);
          fixedFiles++;
          totalFixes += count;
        }
      }
    }
  }

  console.log('\n=================================');
  console.log(`CORRUPTION FIX COMPLETE`);
  console.log('=================================');
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files fixed: ${fixedFiles}`);
  console.log(`Total fixes applied: ${totalFixes}`);
  console.log('=================================\n');
}

// Run the fix
processFiles().catch(console.error);