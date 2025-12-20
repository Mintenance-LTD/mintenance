#!/usr/bin/env node

/**
 * Audit 'use client' Usage
 * 
 * This script analyzes all files with 'use client' directive to identify
 * which ones might be unnecessary and could be converted to Server Components.
 * 
 * Based on code review finding: 344 files with 'use client' directive
 * 
 * Usage: node scripts/audit-use-client.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_APP_DIR = path.resolve(__dirname, '..', 'apps', 'web');
const RESULTS = {
  total: 0,
  necessary: [],
  potentiallyUnnecessary: [],
  needsReview: [],
};

// Patterns that indicate 'use client' is necessary
const CLIENT_INDICATORS = [
  /useState|useEffect|useCallback|useMemo|useReducer|useContext|useRef/,
  /localStorage|sessionStorage|window\.|document\./,
  /addEventListener|removeEventListener/,
  /onClick|onChange|onSubmit|onFocus|onBlur/,
  /useRouter|usePathname|useSearchParams/,
  /'use client'/,
];

// Patterns that suggest Server Component might be possible
const SERVER_INDICATORS = [
  /async\s+function/,
  /await\s+/,
  /fetch\(/,
  /from\s+['"]@\/lib\/api\/supabaseServer/,
  /serverSupabase/,
];

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist, etc.
      if (
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== '.next' &&
        file !== 'dist' &&
        file !== 'coverage'
      ) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(WEB_APP_DIR, filePath);

  // Check if file has 'use client'
  if (!content.includes("'use client'") && !content.includes('"use client"')) {
    return null;
  }

  RESULTS.total++;

  const hasClientIndicators = CLIENT_INDICATORS.some((pattern) =>
    pattern.test(content)
  );
  const hasServerIndicators = SERVER_INDICATORS.some((pattern) =>
    pattern.test(content)
  );

  // Count hooks usage
  const hookCount = (content.match(/use[A-Z]\w+/g) || []).length;
  const browserApiCount = (
    content.match(/localStorage|sessionStorage|window\.|document\./g) || []
  ).length;
  const eventHandlerCount = (
    content.match(/on\w+\s*=/g) || []
  ).length;

  const analysis = {
    file: relativePath,
    hasClientIndicators,
    hasServerIndicators,
    hookCount,
    browserApiCount,
    eventHandlerCount,
    lineCount: content.split('\n').length,
  };

  // Determine if 'use client' is necessary
  if (hasClientIndicators && hookCount > 0) {
    analysis.status = 'necessary';
    analysis.reason = `Uses ${hookCount} hook(s) and client-side features`;
    RESULTS.necessary.push(analysis);
  } else if (hasServerIndicators && !hasClientIndicators) {
    analysis.status = 'potentially-unnecessary';
    analysis.reason =
      'Has server-side patterns but no clear client-side requirements';
    RESULTS.potentiallyUnnecessary.push(analysis);
  } else {
    analysis.status = 'needs-review';
    analysis.reason = 'Mixed patterns - manual review required';
    RESULTS.needsReview.push(analysis);
  }

  return analysis;
}

function generateReport() {
  console.log('\n📊 "use client" Audit Report\n');
  console.log('='.repeat(80));
  console.log(`\nTotal files with 'use client': ${RESULTS.total}\n`);

  console.log(`✅ Necessary (${RESULTS.necessary.length}):`);
  console.log(
    '   These files clearly need client-side features (hooks, browser APIs, etc.)'
  );
  if (RESULTS.necessary.length > 0) {
    RESULTS.necessary.slice(0, 10).forEach((item) => {
      console.log(`   - ${item.file}`);
      console.log(`     ${item.reason}`);
    });
    if (RESULTS.necessary.length > 10) {
      console.log(`   ... and ${RESULTS.necessary.length - 10} more`);
    }
  }

  console.log(`\n⚠️  Potentially Unnecessary (${RESULTS.potentiallyUnnecessary.length}):`);
  console.log(
    '   These files might be convertible to Server Components'
  );
  if (RESULTS.potentiallyUnnecessary.length > 0) {
    RESULTS.potentiallyUnnecessary.forEach((item) => {
      console.log(`   - ${item.file}`);
      console.log(`     ${item.reason}`);
      console.log(`     Hooks: ${item.hookCount}, Browser APIs: ${item.browserApiCount}`);
    });
  }

  console.log(`\n🔍 Needs Review (${RESULTS.needsReview.length}):`);
  console.log('   These files have mixed patterns and need manual review');
  if (RESULTS.needsReview.length > 0) {
    RESULTS.needsReview.slice(0, 10).forEach((item) => {
      console.log(`   - ${item.file}`);
      console.log(`     ${item.reason}`);
    });
    if (RESULTS.needsReview.length > 10) {
      console.log(`   ... and ${RESULTS.needsReview.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Recommendations:\n');
  console.log('1. Review "Potentially Unnecessary" files first');
  console.log('2. Check if they can be converted to Server Components');
  console.log('3. Move data fetching to Server Components where possible');
  console.log('4. Use "use client" only for interactive UI components');
  console.log('5. Use TanStack Query only for mutations and real-time updates\n');

  // Save detailed report to file
  const reportPath = path.join(__dirname, '../audit-use-client-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          total: RESULTS.total,
          necessary: RESULTS.necessary.length,
          potentiallyUnnecessary: RESULTS.potentiallyUnnecessary.length,
          needsReview: RESULTS.needsReview.length,
        },
        details: {
          necessary: RESULTS.necessary,
          potentiallyUnnecessary: RESULTS.potentiallyUnnecessary,
          needsReview: RESULTS.needsReview,
        },
      },
      null,
      2
    )
  );
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Main execution
try {
  console.log('🔍 Scanning for files with "use client" directive...\n');
  const files = findFiles(WEB_APP_DIR);

  console.log(`Found ${files.length} TypeScript/TSX files to analyze\n`);

  files.forEach((file) => {
    try {
      analyzeFile(file);
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error.message);
    }
  });

  generateReport();
} catch (error) {
  console.error('Error running audit:', error);
  process.exit(1);
}

