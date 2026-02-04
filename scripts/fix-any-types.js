#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Common type replacements
const replacements = [
  // Supabase specific
  { pattern: /: any; \/\/ supabase/gi, replacement: ': Database' },
  { pattern: /queryBuilder: any/g, replacement: 'queryBuilder: SupabaseQueryBuilder<any>' },

  // React/Event types
  { pattern: /event: any\)/g, replacement: 'event: React.ChangeEvent<HTMLInputElement>)' },
  { pattern: /children: any/g, replacement: 'children: React.ReactNode' },
  { pattern: /props: any/g, replacement: 'props: Record<string, unknown>' },
  { pattern: /style: any/g, replacement: 'style: React.CSSProperties' },

  // Common data types
  { pattern: /data: any/g, replacement: 'data: unknown' },
  { pattern: /error: any/g, replacement: 'error: Error | unknown' },
  { pattern: /response: any/g, replacement: 'response: unknown' },
  { pattern: /result: any/g, replacement: 'result: unknown' },
  { pattern: /value: any/g, replacement: 'value: unknown' },
  { pattern: /item: any/g, replacement: 'item: unknown' },
  { pattern: /params: any/g, replacement: 'params: Record<string, unknown>' },
  { pattern: /options: any/g, replacement: 'options: Record<string, unknown>' },
  { pattern: /config: any/g, replacement: 'config: Record<string, unknown>' },
  { pattern: /body: any/g, replacement: 'body: unknown' },
  { pattern: /payload: any/g, replacement: 'payload: unknown' },
  { pattern: /details: any/g, replacement: 'details: unknown' },

  // Arrays and collections
  { pattern: /: any\[\]/g, replacement: ': unknown[]' },
  { pattern: /Array<any>/g, replacement: 'Array<unknown>' },
  { pattern: /Promise<any>/g, replacement: 'Promise<unknown>' },
  { pattern: /Map<string, any>/g, replacement: 'Map<string, unknown>' },
  { pattern: /Record<string, any>/g, replacement: 'Record<string, unknown>' },

  // Function types
  { pattern: /\(([^)]*): any\) =>/g, replacement: '($1: unknown) =>' },
  { pattern: /callback: any/g, replacement: 'callback: (...args: unknown[]) => unknown' },
  { pattern: /handler: any/g, replacement: 'handler: (...args: unknown[]) => void' },

  // Auth specific
  { pattern: /user: any/g, replacement: 'user: User | null' },
  { pattern: /session: any/g, replacement: 'session: Session | null' },
  { pattern: /token: any/g, replacement: 'token: string' },

  // Blockchain/Web3
  { pattern: /walletProvider: any/g, replacement: 'walletProvider: unknown' },
  { pattern: /contract: any/g, replacement: 'contract: unknown' },
  { pattern: /transaction: any/g, replacement: 'transaction: unknown' },

  // Type assertions
  { pattern: /as any/g, replacement: 'as unknown' },
  { pattern: /<any>/g, replacement: '<unknown>' },
];

async function findFiles(dir, pattern) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (!entry.name.includes('test') &&
          !entry.name.includes('__tests__') &&
          !entry.name.includes('node_modules') &&
          !entry.name.includes('.next') &&
          !entry.name.includes('dist') &&
          !entry.name.includes('coverage')) {
        files.push(...await findFiles(fullPath, pattern));
      }
    } else if (entry.isFile() && pattern.test(fullPath)) {
      // Skip test files
      if (!fullPath.includes('.test.') &&
          !fullPath.includes('.spec.') &&
          !fullPath.includes('mock')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    let changeCount = 0;

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changeCount += matches.length;
      }
    }

    // Special handling for specific patterns

    // Fix cache types
    content = content.replace(
      /searchCache = new Map<string, { data: any; timestamp: number }>/g,
      'searchCache = new Map<string, { data: unknown; timestamp: number }>'
    );

    // Fix return types
    content = content.replace(
      /: Promise<any>/g,
      ': Promise<unknown>'
    );

    // Fix generic any types
    content = content.replace(
      /: any(?=[,;)\s}])/g,
      ': unknown'
    );

    // Fix function parameters
    content = content.replace(
      /\(([^:)]*): any([,)])/g,
      '($1: unknown$2'
    );

    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${changeCount} any types in: ${path.relative(process.cwd(), filePath)}`);
      return changeCount;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔍 Searching for TypeScript files with any types...\n');

  const directories = [
    'apps/mobile/src/services',
    'apps/mobile/src/hooks',
    'apps/mobile/src/utils',
    'apps/mobile/src/contexts',
    'apps/mobile/src/screens',
    'apps/web/app',
    'apps/web/lib',
    'packages/shared/src',
  ];

  let totalFiles = 0;
  let totalFixes = 0;

  for (const dir of directories) {
    if (!await fs.access(dir).then(() => true).catch(() => false)) {
      console.log(`⚠️  Directory not found: ${dir}`);
      continue;
    }

    console.log(`\n📂 Processing ${dir}...`);
    const files = await findFiles(dir, /\.(ts|tsx)$/);

    for (const file of files) {
      const fixes = await fixFile(file);
      if (fixes > 0) {
        totalFiles++;
        totalFixes += fixes;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Fixed ${totalFixes} any types across ${totalFiles} files`);
  console.log('='.repeat(50));

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    filesProcessed: totalFiles,
    anyTypesFixed: totalFixes,
    directories: directories,
  };

  await fs.writeFile(
    'any-types-fix-report.json',
    JSON.stringify(report, null, 2),
    'utf8'
  );

  console.log('\n📊 Report saved to any-types-fix-report.json');
}

main().catch(console.error);