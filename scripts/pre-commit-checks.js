#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Pre-commit hook script
 *
 * Runs file size checks and warns when files exceed 400 lines
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_LINES = 500;
const WARNING_LINES = 400;

// Pre-existing large files tracked for splitting in AUDIT_REPORT.md Phase 3.
// These files were already over 500 lines before the audit and contain critical
// security/business logic that requires careful decomposition. Allowing them
// through the hook prevents blocking security fixes on pre-existing tech debt.
const KNOWN_LARGE_FILES = new Set([
  'apps/web/middleware.ts',
  'apps/web/lib/auth-manager.ts',
  'apps/web/app/contractor/reporting/components/ReportingDashboard2025Client.tsx',
  'apps/web/lib/services/agents/EscrowReleaseAgent.ts',
  'apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts',
  'apps/web/lib/services/building-surveyor/EnhancedBayesianFusionService.ts',
  'apps/web/lib/services/agents/PredictiveAgent.ts',
  'apps/web/lib/services/building-surveyor/AlertingService.ts',
  'apps/web/app/contractor/invoices/components/InvoiceManagementClient.tsx',
  'apps/web/app/jobs/[id]/components/JobDetailsAirbnb.tsx',
  'apps/web/lib/mfa/mfa-service.ts',
  'apps/web/lib/cache.ts',
  'apps/web/app/contractor/finance/page.tsx',
  'apps/web/app/contractor/market-insights/components/MarketInsightsClient.tsx',
  'apps/web/app/coming-soon/page.tsx',
  'apps/mobile/src/services/PushNotificationService.ts',
  'apps/mobile/src/screens/job-details/ContractPreparationScreen.tsx',
  'apps/mobile/src/screens/subscription/SubscriptionScreen.tsx',
  'apps/web/components/examples/FeatureAccessExamples.tsx',
  'apps/web/lib/services/subscription/SubscriptionService.ts',
]);

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (_error) {
    return 0;
  }
}

function checkStagedFiles() {
  try {
    // Get staged files
    const stagedFiles = execSync(
      'git diff --cached --name-only --diff-filter=ACM',
      {
        encoding: 'utf-8',
      }
    )
      .split('\n')
      .filter(Boolean)
      .filter((file) => {
        // Only check TypeScript/JavaScript files
        return (
          /\.(ts|tsx|js|jsx)$/.test(file) &&
          !file.includes('.test.') &&
          !file.includes('.spec.') &&
          !file.includes('__tests__') &&
          !file.includes('__mocks__')
        );
      });

    if (stagedFiles.length === 0) {
      return { hasIssues: false, warnings: [], errors: [] };
    }

    const warnings = [];
    const errors = [];

    stagedFiles.forEach((file) => {
      if (!fs.existsSync(file)) {
        return;
      }

      const lineCount = countLines(file);

      if (lineCount > MAX_LINES) {
        if (KNOWN_LARGE_FILES.has(file)) {
          // Tracked for splitting — warn but don't block
          warnings.push({ file, lines: lineCount });
        } else {
          errors.push({
            file,
            lines: lineCount,
            exceedsBy: lineCount - MAX_LINES,
          });
        }
      } else if (lineCount > WARNING_LINES) {
        warnings.push({
          file,
          lines: lineCount,
        });
      }
    });

    return {
      hasIssues: errors.length > 0 || warnings.length > 0,
      warnings,
      errors,
    };
  } catch (error) {
    console.error('Error checking staged files:', error);
    return { hasIssues: false, warnings: [], errors: [] };
  }
}

function main() {
  console.log('🔍 Running pre-commit checks...\n');

  const result = checkStagedFiles();

  if (result.errors.length > 0) {
    console.log('❌ Files exceeding 500-line limit:\n');
    result.errors.forEach(({ file, lines, exceedsBy }) => {
      console.log(`   ${file}: ${lines} lines (exceeds by ${exceedsBy})`);
    });
    console.log('\n💡 Please split these files before committing.\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Files approaching 500-line limit:\n');
    result.warnings.forEach(({ file, lines }) => {
      console.log(`   ${file}: ${lines} lines`);
    });
    console.log('\n💡 Consider splitting these files soon.\n');
  }

  if (!result.hasIssues) {
    console.log('✅ All staged files are within size limits!\n');
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { checkStagedFiles };
