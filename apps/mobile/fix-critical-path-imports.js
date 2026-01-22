import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Fixing critical path test imports...\n');

// Find all critical path test files
const testFiles = glob.sync('src/__tests__/critical-paths/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let totalFixes = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Fix 1: test-utils import path
  // From src/__tests__/critical-paths/auth/LoginFlow.test.tsx
  // test-utils is at src/__tests__/test-utils.tsx
  // So we need to go up 2 levels: ../../test-utils
  content = content.replace(
    /from ['"].*test-utils['"]/g,
    `from '../../test-utils'`
  );
  if (content !== original) modified = true;

  // Fix 2: Fix AuthService mock path
  content = content.replace(
    `jest.mock('../../../services/AuthService');`,
    `jest.mock('../../../../services/AuthService');`
  );

  // Fix 3: Fix other service imports
  content = content.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/services\//g,
    `from '../../../../services/`
  );

  // Fix 4: Fix screen imports
  content = content.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/screens\//g,
    `from '../../../../screens/`
  );

  // Fix 5: Fix component imports
  content = content.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/components\//g,
    `from '../../../../components/`
  );

  // Fix 6: Fix utils imports
  content = content.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/utils\//g,
    `from '../../../utils/`
  );

  // Fix 7: Fix hooks imports
  content = content.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/hooks\//g,
    `from '../../../hooks/`
  );

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalFixes++;
    logger.info(`  Fixed ${fileName}`);
  }
});

// Also fix the comprehensive tests
const comprehensiveFiles = glob.sync('src/__tests__/{utils,hooks,screens,services,components}/**/*.comprehensive.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

comprehensiveFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // For files in src/__tests__/utils/comprehensive/
  // test-utils is at src/__tests__/test-utils.tsx
  // So we need ../../test-utils
  if (file.includes('/utils/comprehensive/') ||
      file.includes('/hooks/comprehensive/') ||
      file.includes('/screens/integration/') ||
      file.includes('/services/comprehensive/') ||
      file.includes('/components/snapshot/')) {
    content = content.replace(
      /from ['"].*test-utils['"]/g,
      `from '../../test-utils'`
    );
    if (content !== original) modified = true;
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalFixes++;
    logger.info(`  Fixed ${fileName}`);
  }
});

logger.info(`\n📊 Summary:`);
logger.info(`  Total files fixed: ${totalFixes}`);
logger.info('\n✨ Import fixes complete!');