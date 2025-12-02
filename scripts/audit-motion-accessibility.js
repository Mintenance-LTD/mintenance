#!/usr/bin/env node

/**
 * Motion Accessibility Audit Script
 * Identifies files using direct motion.* components instead of accessible MotionDiv wrappers
 * 
 * Run with: node scripts/audit-motion-accessibility.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_APP_DIR = path.join(__dirname, '../apps/web');

// Files that are exempt (they define the wrapper components)
const EXEMPT_FILES = [
  'components/ui/MotionDiv.tsx',
  'hooks/useReducedMotion.ts',
  'lib/animations/variants.ts',
];

/**
 * Get all files that import from framer-motion
 */
function getFramerMotionFiles() {
  try {
    const result = execSync(
      `grep -r "from 'framer-motion'" --include="*.tsx" --include="*.ts" -l "${WEB_APP_DIR}"`,
      { encoding: 'utf-8' }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    // grep returns exit code 1 if no matches
    return [];
  }
}

/**
 * Check if a file uses direct motion.* components
 */
function checkFileForDirectMotion(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip exempt files
  const relativePath = path.relative(WEB_APP_DIR, filePath);
  if (EXEMPT_FILES.some(exempt => relativePath.includes(exempt))) {
    return { needsFix: false, reason: 'exempt' };
  }
  
  // Check for direct motion.* usage
  const directMotionRegex = /motion\.(div|span|button|section|article|li|p|h[1-6]|ul|nav|aside|header|footer|main|form|input|textarea|a|img|svg|path|g|circle|rect|line)/g;
  const matches = content.match(directMotionRegex);
  
  if (!matches) {
    return { needsFix: false, reason: 'no-direct-motion' };
  }
  
  // Check if MotionDiv is imported
  const hasMotionDivImport = content.includes("from '@/components/ui/MotionDiv'");
  
  // Count occurrences
  const motionTypes = {};
  matches.forEach(match => {
    const type = match.replace('motion.', '');
    motionTypes[type] = (motionTypes[type] || 0) + 1;
  });
  
  return {
    needsFix: true,
    hasMotionDivImport,
    motionTypes,
    count: matches.length,
  };
}

/**
 * Run the audit
 */
function runAudit() {
  console.log('🔍 Motion Accessibility Audit\n');
  console.log('Checking for direct motion.* usage that should use accessible wrappers...\n');
  
  const files = getFramerMotionFiles();
  const results = {
    needsFix: [],
    alreadyCompliant: [],
    exempt: [],
  };
  
  files.forEach(filePath => {
    const check = checkFileForDirectMotion(filePath);
    const relativePath = path.relative(WEB_APP_DIR, filePath);
    
    if (check.reason === 'exempt') {
      results.exempt.push(relativePath);
    } else if (check.needsFix) {
      results.needsFix.push({
        file: relativePath,
        ...check,
      });
    } else {
      results.alreadyCompliant.push(relativePath);
    }
  });
  
  // Output results
  console.log('📊 Summary:\n');
  console.log(`✅ Already compliant: ${results.alreadyCompliant.length} files`);
  console.log(`⏭️  Exempt: ${results.exempt.length} files`);
  console.log(`⚠️  Need fixing: ${results.needsFix.length} files\n`);
  
  if (results.needsFix.length > 0) {
    console.log('📝 Files needing accessibility updates:\n');
    
    results.needsFix.forEach(({ file, motionTypes, count, hasMotionDivImport }) => {
      console.log(`  ${file}`);
      console.log(`    Direct motion.* usage: ${count}`);
      console.log(`    Types used: ${Object.keys(motionTypes).join(', ')}`);
      console.log(`    Has MotionDiv import: ${hasMotionDivImport ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });
    
    console.log('\n🔧 To fix these files:');
    console.log('   1. Replace motion.div → MotionDiv');
    console.log('   2. Replace motion.button → MotionButton');
    console.log('   3. Replace motion.span → MotionSpan');
    console.log('   4. Import from @/components/ui/MotionDiv');
    console.log('\n   Or use the useReducedMotion hook for inline motion props.');
  } else {
    console.log('🎉 All files are compliant with accessibility standards!');
  }
  
  // Write results to JSON
  const outputPath = path.join(__dirname, '../motion-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results written to: motion-audit-results.json`);
  
  return results.needsFix.length;
}

// Run audit
const issueCount = runAudit();
process.exit(issueCount > 0 ? 1 : 0);

