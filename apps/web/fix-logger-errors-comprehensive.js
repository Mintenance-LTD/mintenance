import { logger } from '@mintenance/shared';

/**
 * Comprehensive fix for ALL logger syntax errors
 * Patterns to fix:
 * 1. error, { service: 'X' } => error, { service: 'X' }
 * 2. err, { service: 'X' } => err, { service: 'X' }
 * 3. e, { service: 'X' } => e, { service: 'X' }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

logger.info('🔍 Searching for all logger error patterns...\n');

// Find all files with the error', pattern
const findCommand = `cd "${__dirname}" && grep -rl "error',\\s*{\\s*service:" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next`;

let files = [];
try {
  const output = execSync(findCommand, { encoding: 'utf-8' });
  files = output.trim().split('\n').filter(f => f && !f.includes('.md'));
} catch (e) {
  logger.info('No files found with error pattern');
}

// Also find err', and e', patterns
const patterns = [
  "err',\\s*{\\s*service:",
  "e',\\s*{\\s*service:",
  "reason',\\s*{\\s*service:",
];

patterns.forEach(pattern => {
  try {
    const cmd = `cd "${__dirname}" && grep -rl "${pattern}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const newFiles = output.trim().split('\n').filter(f => f && !f.includes('.md'));
    files = [...new Set([...files, ...newFiles])];
  } catch (e) {
    // No matches for this pattern
  }
});

logger.info(`📝 Found ${files.length} files to fix\n`);

let totalFixed = 0;
let totalFiles = 0;

files.forEach(relPath => {
  const filePath = path.join(__dirname, relPath.replace('./', ''));

  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixed = 0;

  // Pattern 1: error, { service: 'X' } => error, { service: 'X' }
  const before1 = (content.match(/error',\s*\{\s*service:/g) || []).length;
  content = content.replace(/error',(\s*\{\s*service:\s*'[^']+'\s*\})/g, 'error,$1');
  fileFixed += before1;

  // Pattern 2: err, { service: 'X' } => err, { service: 'X' }
  const before2 = (content.match(/err',\s*\{\s*service:/g) || []).length;
  content = content.replace(/err',(\s*\{\s*service:\s*'[^']+'\s*\})/g, 'err,$1');
  fileFixed += before2;

  // Pattern 3: e, { service: 'X' } => e, { service: 'X' }
  const before3 = (content.match(/\be',\s*\{\s*service:/g) || []).length;
  content = content.replace(/\be',(\s*\{\s*service:\s*'[^']+'\s*\})/g, 'e,$1');
  fileFixed += before3;

  // Pattern 4: reason, { service: 'X' } => reason, { service: 'X' }
  const before4 = (content.match(/reason',\s*\{\s*service:/g) || []).length;
  content = content.replace(/reason',(\s*\{\s*service:\s*'[^']+'\s*\})/g, 'reason,$1');
  fileFixed += before4;

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    logger.info(`✅ Fixed ${fileFixed} issues in: ${relPath}`);
    totalFixed += fileFixed;
    totalFiles++;
  }
});

logger.info(`\n🎉 Total: Fixed ${totalFixed} logger errors across ${totalFiles} files`);
