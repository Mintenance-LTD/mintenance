import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Fixing ALL Phase 5 test import paths...\n');

// Fix patterns for different test locations
const fixPatterns = [
  {
    pattern: 'src/__tests__/critical-paths/**/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      services: '../../../services/',
      screens: '../../../screens/',
      components: '../../../components/',
      utils: '../../../utils/',
      hooks: '../../../hooks/',
    }
  },
  {
    pattern: 'src/__tests__/utils/comprehensive/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      utils: '../../../utils/',
      services: '../../../services/',
    }
  },
  {
    pattern: 'src/__tests__/hooks/comprehensive/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      hooks: '../../../hooks/',
      services: '../../../services/',
    }
  },
  {
    pattern: 'src/__tests__/screens/integration/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      screens: '../../../screens/',
      services: '../../../services/',
      components: '../../../components/',
      hooks: '../../../hooks/',
      utils: '../../../utils/',
    }
  },
  {
    pattern: 'src/__tests__/services/comprehensive/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      services: '../../../services/',
      utils: '../../../utils/',
    }
  },
  {
    pattern: 'src/__tests__/components/snapshot/*.test.{ts,tsx}',
    fixes: {
      testUtils: '../../test-utils',
      components: '../../../components/',
      utils: '../../../utils/',
    }
  }
];

let totalFixes = 0;

fixPatterns.forEach(({ pattern, fixes }) => {
  const testFiles = glob.sync(pattern, {
    cwd: __dirname,
    absolute: true,
  });

  testFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    const fileName = path.basename(file);
    let modified = false;

    // Fix test-utils imports
    if (fixes.testUtils) {
      content = content.replace(
        /from ['"].*test-utils['"]/g,
        `from '${fixes.testUtils}'`
      );
    }

    // Fix service imports and mocks
    if (fixes.services) {
      // Fix imports
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/services\//g,
        `from '${fixes.services}`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/services\//g,
        `from '${fixes.services}`
      );

      // Fix mocks
      content = content.replace(
        /jest\.mock\(['"]\.\.\/\.\.\/\.\.\/\.\.\/services\//g,
        `jest.mock('${fixes.services}`
      );
      content = content.replace(
        /jest\.mock\(['"]\.\.\/\.\.\/\.\.\/services\//g,
        `jest.mock('${fixes.services}`
      );
    }

    // Fix screen imports
    if (fixes.screens) {
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/screens\//g,
        `from '${fixes.screens}`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/screens\//g,
        `from '${fixes.screens}`
      );
    }

    // Fix component imports
    if (fixes.components) {
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/components\//g,
        `from '${fixes.components}`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/components\//g,
        `from '${fixes.components}`
      );
    }

    // Fix utils imports
    if (fixes.utils) {
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\//g,
        `from '${fixes.utils}`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/utils\//g,
        `from '${fixes.utils}`
      );
    }

    // Fix hooks imports
    if (fixes.hooks) {
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/hooks\//g,
        `from '${fixes.hooks}`
      );
      content = content.replace(
        /from ['"]\.\.\/\.\.\/\.\.\/hooks\//g,
        `from '${fixes.hooks}`
      );
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      totalFixes++;
      logger.info(`  Fixed ${fileName}`);
      modified = true;
    }
  });
});

logger.info(`\n📊 Summary:`);
logger.info(`  Total files fixed: ${totalFixes}`);
logger.info('\n✨ Phase 5 import fixes complete!');