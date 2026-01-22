import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Adding PixelRatio mock to all critical path tests...\n');

// Find all critical path test files
const testFiles = glob.sync('src/__tests__/critical-paths/**/*.test.tsx', {
  cwd: __dirname,
  absolute: true,
});

let totalFixes = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Check if PixelRatio is missing in the react-native mock
  if (content.includes("jest.mock('react-native'") && !content.includes('PixelRatio')) {
    // Replace the Dimensions line to add PixelRatio after it
    content = content.replace(
      /Dimensions: { get: \(\) => \({ width: 375, height: 812 }\) },\n}\)\);/,
      `Dimensions: { get: () => ({ width: 375, height: 812 }) },
  PixelRatio: {
    getFontScale: () => 1,
    get: () => 2,
    roundToNearestPixel: (size) => Math.round(size * 2) / 2,
  },
}));`
    );

    if (content !== original) {
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    totalFixes++;
    logger.info(`  Fixed ${fileName}`);
  }
});

logger.info(`\n📊 Summary:`);
logger.info(`  Total files fixed: ${totalFixes}`);
logger.info('\n✨ PixelRatio mock addition complete!');