#!/usr/bin/env node

/**
 * Remove Console Logs Script
 * Replaces all console.log statements with proper logging service
 * Addresses security vulnerability of information leakage in production
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process (from grep results)
const filesToProcess = [
  'apps/web/lib/auth-manager-debug.ts',
  'apps/web/hooks/useRealtime.ts',
  'apps/web/lib/animations/index.ts',
  'apps/web/components/examples/FeatureAccessExamples.tsx',
  'apps/web/components/profile/ProfileDropdown.tsx',
  'apps/web/components/onboarding/OnboardingWrapper.tsx',
  'apps/web/components/profile/HomeownerProfileDropdown.tsx',
  'apps/web/lib/logger.ts',
  'apps/web/app/(public)/landing/page.tsx',
  'apps/web/app/api/maintenance/detect/route.ts',
  'apps/web/app/api/maintenance/assess/route.ts',
  'apps/web/app/dashboard/lib/revenue-queries.ts',
  'apps/web/app/contractors/components/ContractorsBrowseAirbnb.tsx',
  'apps/web/lib/services/MaintenanceDetectionService.ts',
  'apps/web/app/contractor/subscription/payment-methods/components/PaymentMethodForm.tsx',
  'apps/web/app/contractor/invoices/components/InvoiceManagementClient.tsx',
  'apps/web/app/contractor/bid/[jobId]/page.tsx',
  'apps/web/app/contractor/bid/[jobId]/components/JobViewTracker.tsx',
  'apps/web/app/jobs/create/page.tsx',
  'apps/web/app/jobs/create/utils/submitJob.ts',
  'apps/web/app/jobs/quick-create/page.tsx'
];

let totalReplaced = 0;
let filesModified = 0;

console.log('🔍 Removing console.log statements from production code...\n');

filesToProcess.forEach(filePath => {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  Skipping ${filePath} (file not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Pattern to match console.log statements (including multi-line)
  const patterns = [
    // Simple console.log
    /console\.log\s*\([^)]*\);?/g,
    // Multi-line console.log
    /console\.log\s*\([^)]*\n[^)]*\);?/g,
    // Console.log with template literals
    /console\.log\s*\(`[^`]*`\);?/g,
    // Console.error, console.warn, console.info (in non-error handling contexts)
    /console\.(error|warn|info)\s*\([^)]*\);?/g,
  ];

  let replacements = 0;

  // Check if file already imports logger
  const hasLoggerImport = content.includes("import { logger }") ||
                          content.includes("from '@mintenance/shared'");

  // Replace console.log with logger
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match) => {
      // Preserve console.error in error handlers and catch blocks
      if (match.includes('console.error') &&
          (content.indexOf(match) > content.lastIndexOf('catch', content.indexOf(match)) ||
           content.indexOf(match) > content.lastIndexOf('error', content.indexOf(match) - 50))) {
        return match; // Keep console.error in error contexts
      }

      replacements++;

      // Extract the message from console.log
      const message = match
        .replace(/console\.\w+\s*\(/, '')
        .replace(/\);?$/, '');

      // Determine log level based on original console method
      if (match.includes('console.error')) {
        return `logger.error(${message})`;
      } else if (match.includes('console.warn')) {
        return `logger.warn(${message})`;
      } else if (match.includes('console.info')) {
        return `logger.info(${message})`;
      } else {
        // For development, use debug level
        return `logger.debug(${message})`;
      }
    });
  });

  // Add logger import if needed and replacements were made
  if (replacements > 0 && !hasLoggerImport) {
    // For .tsx/.ts files
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      // Check if file already has imports from @mintenance/shared
      if (content.includes("from '@mintenance/shared'")) {
        // Add logger to existing import
        content = content.replace(
          /from ['"]@mintenance\/shared['"]/,
          (match) => {
            const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]@mintenance\/shared['"]/);
            if (importMatch && !importMatch[1].includes('logger')) {
              return match.replace('{', '{ logger, ');
            }
            return match;
          }
        );
      } else {
        // Add new import at the top of the file
        const importStatement = "import { logger } from '@mintenance/shared';\n";

        // Find the right place to insert (after other imports)
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const lineEnd = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, lineEnd + 1) + importStatement + content.slice(lineEnd + 1);
        } else {
          // No imports, add at the beginning
          content = importStatement + content;
        }
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✅ Fixed ${filePath} (${replacements} replacements)`);
    totalReplaced += replacements;
    filesModified++;
  } else {
    console.log(`  - No changes needed in ${filePath}`);
  }
});

console.log(`\n✅ Removed ${totalReplaced} console.log statements from ${filesModified} files`);
console.log('📝 All console.log statements have been replaced with proper logger calls\n');

// Create ESLint rule to prevent future console.log usage
const eslintConfig = {
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  }
};

console.log('💡 Add this to your .eslintrc.json to prevent future console.log usage:');
console.log(JSON.stringify(eslintConfig, null, 2));