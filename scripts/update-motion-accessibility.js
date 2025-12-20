/**
 * Script to update all 2025 pages to use accessible MotionDiv component
 * Replaces `motion.div`, `motion.section`, etc. with `MotionDiv`, `MotionSection`, etc.
 * Updates imports to include MotionDiv components
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to update
const webAppPath = path.join(__dirname, '../apps/web');
const pattern = '**/*2025*.tsx';

// Motion elements to replace
const motionElements = ['div', 'section', 'button', 'article', 'li', 'ul', 'nav', 'aside', 'header', 'footer', 'main', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Track which Motion components are used
  const usedComponents = new Set();

  // Check if file uses Framer Motion
  if (!content.includes('motion.') && !content.includes('from \'framer-motion\'')) {
    return { modified: false, usedComponents: [] };
  }

  // Replace motion.div with MotionDiv, etc.
  motionElements.forEach(element => {
    const capitalizedElement = element.charAt(0).toUpperCase() + element.slice(1);
    const motionComponent = `Motion${capitalizedElement}`;
    const regex = new RegExp(`motion\\.${element}`, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, motionComponent);
      usedComponents.add(motionComponent);
      modified = true;
    }
  });

  if (!modified) {
    return { modified: false, usedComponents: [] };
  }

  // Update imports
  const hasFramerMotionImport = content.includes('from \'framer-motion\'');

  if (hasFramerMotionImport) {
    // Check if import is multiline or single line
    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]framer-motion['"]/);

    if (importMatch) {
      const imports = importMatch[1].split(',').map(i => i.trim()).filter(i => i && !i.startsWith('motion'));

      // Keep non-motion imports (like AnimatePresence, Variants, etc.)
      if (imports.length > 0) {
        const newImport = `import { ${imports.join(', ')} } from 'framer-motion';`;
        content = content.replace(importMatch[0], newImport);
      } else {
        // Remove empty import
        content = content.replace(/import\s+{[^}]*}\s+from\s+['"]framer-motion['"];?\s*\n/, '');
      }
    }
  }

  // Add MotionDiv import
  const motionDivImport = `import { ${Array.from(usedComponents).sort().join(', ')} } from '@/components/ui/MotionDiv';`;

  // Find where to insert the import (after all imports, before first non-import line)
  const lines = content.split('\n');
  let importInsertIndex = 0;
  let inMultilineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we're in a multiline import
    if (line.startsWith('import ') && !line.endsWith(';') && !line.endsWith("';") && !line.endsWith('";')) {
      inMultilineImport = true;
    }
    if (inMultilineImport && (line.endsWith(';') || line.endsWith("';") || line.endsWith('";'))) {
      inMultilineImport = false;
      importInsertIndex = i + 1;
      continue;
    }

    // Single-line import
    if (line.startsWith('import ') && (line.endsWith(';') || line.endsWith("';") || line.endsWith('";'))) {
      importInsertIndex = i + 1;
      continue;
    }

    // Stop at first non-import, non-comment, non-blank line
    if (line && !line.startsWith('import ') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && !inMultilineImport) {
      break;
    }
  }

  lines.splice(importInsertIndex, 0, motionDivImport);
  content = lines.join('\n');

  // Write updated file
  fs.writeFileSync(filePath, content, 'utf-8');

  return { modified: true, usedComponents: Array.from(usedComponents) };
}

// Main execution
console.log('🔍 Finding 2025 files with motion usage...\n');

glob(pattern, { cwd: webAppPath, absolute: true }, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    process.exit(1);
  }

  console.log(`Found ${files.length} files to check\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const updateLog = [];

  files.forEach(filePath => {
    const relativePath = path.relative(webAppPath, filePath);
    const { modified, usedComponents } = updateFile(filePath);

    if (modified) {
      updatedCount++;
      updateLog.push(`✅ ${relativePath}`);
      console.log(`✅ Updated: ${relativePath}`);
      console.log(`   Added: ${usedComponents.join(', ')}\n`);
    } else {
      skippedCount++;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files checked: ${files.length}`);
  console.log(`Files updated: ${updatedCount}`);
  console.log(`Files skipped (no motion usage): ${skippedCount}`);
  console.log('\n✨ All 2025 pages now use accessible MotionDiv components!');
});
