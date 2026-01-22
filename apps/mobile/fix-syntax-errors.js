import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Fixing syntax errors in test files...\n');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let totalFixes = 0;
const fixedFiles = [];

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Fix 1: Duplicate imports (import { X } from '@/types' and import { X } from '@mintenance/types')
  if (content.includes("import type { Job } from '@/types'") &&
      content.includes("import { Job } from '@mintenance/types'")) {
    content = content.replace(/import type { Job } from '@\/types';\s*\nimport { Job } from '@mintenance\/types';/g,
                             "import type { Job } from '@/types';");
    modified = true;
    logger.info(`  Fixed duplicate Job import in ${fileName}`);
  }

  // Fix 2: General duplicate imports pattern
  const importPattern = /import\s+(?:type\s+)?{\s*(\w+)\s*}\s+from\s+['"]([^'"]+)['"];\s*\nimport\s+{\s*\1\s*}\s+from\s+['"]([^'"]+)['"]/g;
  if (importPattern.test(content)) {
    content = content.replace(importPattern, (match, name, path1, path2) => {
      logger.info(`  Fixed duplicate import of ${name} in ${fileName}`);
      // Keep the first import, remove the second
      return `import type { ${name} } from '${path1}'`;
    });
    modified = true;
  }

  // Fix 3: Remove duplicate imports for the same module from different paths
  const lines = content.split('\n');
  const importMap = new Map();
  const newLines = [];

  lines.forEach(line => {
    const importMatch = line.match(/^import\s+(?:type\s+)?{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const [, imports, modulePath] = importMatch;
      const cleanImports = imports.split(',').map(i => i.trim()).filter(Boolean);

      cleanImports.forEach(imp => {
        if (!importMap.has(imp)) {
          importMap.set(imp, { line, path: modulePath });
        } else {
          // Duplicate import found, skip this line
          logger.info(`  Skipping duplicate import of ${imp} in ${fileName}`);
          modified = true;
          return;
        }
      });

      if (cleanImports.every(imp => importMap.get(imp)?.line === line)) {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  });

  if (modified) {
    content = newLines.join('\n');
  }

  // Fix 4: Fix @/types imports that should be relative
  if (content.includes("from '@/types'") && !fs.existsSync(path.join(__dirname, 'src/types/index.ts'))) {
    content = content.replace(/@\/types/g, '../../types');
    modified = true;
    logger.info(`  Fixed @/types import path in ${fileName}`);
  }

  // Fix 5: Fix @mintenance/types imports
  content = content.replace(/@mintenance\/types/g, '../../types');
  if (original.includes('@mintenance/types')) {
    modified = true;
    logger.info(`  Fixed @mintenance/types import in ${fileName}`);
  }

  // Fix 6: Remove completely duplicate lines
  const uniqueLines = new Set();
  const finalLines = [];

  content.split('\n').forEach(line => {
    if (line.startsWith('import ')) {
      if (!uniqueLines.has(line)) {
        uniqueLines.add(line);
        finalLines.push(line);
      } else {
        modified = true;
      }
    } else {
      finalLines.push(line);
    }
  });

  if (modified) {
    content = finalLines.join('\n');
  }

  // Fix 7: Specific useJobs.test.ts fix
  if (fileName === 'useJobs.test.ts') {
    // Remove the duplicate Job import
    content = content.replace(
      `import type { Job } from '@/types';\nimport { Job } from '@mintenance/types';`,
      `import type { Job } from '../../types';`
    );

    // Fix JobService import if needed
    if (!content.includes("jest.mock('../../services/JobService')")) {
      content = content.replace(
        "import { JobService } from '../../services/JobService';",
        "import { JobService } from '../../services/JobService';\n\njest.mock('../../services/JobService');"
      );
    }

    modified = true;
    logger.info(`  Applied specific fixes to ${fileName}`);
  }

  // Fix 8: Fix React import in test files (should be at the top)
  if (content.includes('import React') && !content.startsWith('import React')) {
    const reactImportLine = content.match(/import React.*/)?.[0];
    if (reactImportLine) {
      content = content.replace(reactImportLine, '');
      content = `${reactImportLine}\n${content}`;
      modified = true;
      logger.info(`  Moved React import to top in ${fileName}`);
    }
  }

  // Fix 9: Remove undefined imports
  content = content.replace(/import\s+{\s*}\s+from\s+['"][^'"]*['"]/g, '');

  // Fix 10: Fix service imports in test files
  if (file.includes('hooks/__tests__')) {
    // Fix common service import issues in hook tests
    content = content.replace(
      /import\s+{\s*(\w+Service)\s*}\s+from\s+['"]\.\.\/services\/\1['"]/g,
      "import { $1 } from '../../services/$1'"
    );
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixedFiles.push(fileName);
    totalFixes++;
  }
});

logger.info(`\n📊 Summary:`);
logger.info(`  Total files checked: ${testFiles.length}`);
logger.info(`  Total files fixed: ${totalFixes}`);
if (fixedFiles.length > 0) {
  logger.info(`  Fixed files: ${fixedFiles.slice(0, 10).join(', ')}${fixedFiles.length > 10 ? '...' : ''}`);
}
logger.info('\n✨ Syntax error fixes complete!');