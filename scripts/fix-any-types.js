#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Common type replacements
const COMMON_REPLACEMENTS = {
  'e: any': 'e: React.ChangeEvent<HTMLInputElement>',
  'error: any': 'error: Error | unknown',
  'data: any': 'data: unknown',
  'response: any': 'response: unknown',
  'value: any': 'value: unknown',
  'any[]': 'unknown[]',
  'Array<any>': 'Array<unknown>',
  'Promise<any>': 'Promise<unknown>',
};

async function getAllTypeScriptFiles(dir) {
  const files = [];
  
  async function walk(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (['node_modules', '.next', 'dist', 'build'].some(p => fullPath.includes(p))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await walk(dir);
  return files;
}

async function analyzeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const anyMatches = content.match(/:\s*any\b/g) || [];
    return {
      file: filePath,
      count: anyMatches.length,
    };
  } catch (error) {
    return { file: filePath, count: 0 };
  }
}

async function main() {
  console.log('🔍 Analyzing TypeScript files for "any" types...\n');
  
  const dirs = ['apps/web', 'apps/mobile/src', 'packages'];
  let totalAny = 0;
  let filesWithAny = 0;
  
  for (const dir of dirs) {
    console.log(`📁 Analyzing ${dir}...`);
    const files = await getAllTypeScriptFiles(dir);
    
    for (const file of files) {
      const result = await analyzeFile(file);
      if (result.count > 0) {
        totalAny += result.count;
        filesWithAny++;
        if (result.count > 10) {
          console.log(`  ⚠️  ${path.relative(process.cwd(), file)}: ${result.count} any types`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total 'any' types found: ${totalAny}`);
  console.log(`📝 Files with 'any': ${filesWithAny}`);
}

main().catch(console.error);
