import { logger } from '@mintenance/shared';

/**
 * Fix [object Object] syntax errors in logger calls
 * This script fixes malformed logger calls like:
 *   logger.error('message:', error', [object Object], { service: 'app' });
 * To:
 *   logger.error('message', error, { service: 'app' });
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/contractor/discover/components/LocationPromptModal.tsx',
  'app/dashboard/lib/revenue-queries.ts',
  'lib/utils/openai-rate-limit.ts',
  'lib/services/ml-engine/memory/examples/performance-comparison.ts',
  'lib/services/ml-engine/memory/examples/backpropagation-demo.ts',
  'lib/services/MaintenanceDetectionService.ts',
  'lib/onboarding/analytics.ts',
  'lib/middleware/redis-rate-limiter.ts',
  'lib/dynamic-imports.tsx',
  'lib/auth-manager-debug.ts',
  'lib/animations/index.ts',
  'hooks/useRealtime.ts',
  'components/ui/AccessibleButton.tsx',
  'components/onboarding/OnboardingWrapper.tsx',
  'components/examples/FeatureAccessExamples.tsx',
  'app/version-checker.tsx',
  'app/properties/[id]/edit/error.tsx',
  'app/properties/[id]/edit/components/PropertyEditClient.tsx',
  'app/properties/[id]/components/PropertyDetailsClient.tsx',
  'app/messages/components/ChatInterface2025.tsx',
  'app/messages/[jobId]/error.tsx',
  'app/jobs/quick-create/page.tsx',
  'app/jobs/quick-create/error.tsx',
  'app/jobs/create/utils/submitJob.ts',
  'app/jobs/create/error.tsx',
  'app/jobs/[id]/payment/error.tsx',
  'app/jobs/[id]/edit/page.tsx',
  'app/jobs/[id]/components/JobDetailsProfessional.tsx',
  'app/jobs/[id]/components/BidComparisonClient.tsx',
  'app/disputes/[id]/error.tsx',
  'app/contractors/components/ContractorsBrowseAirbnb.tsx',
  'app/contractors/[id]/page.tsx',
  'app/contractors/[id]/error.tsx',
  'app/contractor/subscription/payment-methods/components/PaymentMethodForm.tsx',
  'app/contractor/scheduling/components/SchedulingClient.tsx',
  'app/contractor/quotes/page.tsx',
  'app/contractor/profile/error.tsx',
  'app/contractor/profile/components/ContractorProfileClient2025.tsx',
  'app/contractor/payouts/components/PayoutsPageClient.tsx',
  'app/contractor/notifications/page.tsx',
  'app/contractor/messages/error.tsx',
  'app/contractor/jobs/page.tsx',
  'app/contractor/jobs/[id]/view/page.tsx',
  'app/contractor/jobs/[id]/error.tsx',
  'app/contractor/jobs/[id]/components/JobDetailsClient.tsx',
  'app/contractor/jobs-near-you/error.tsx',
  'app/contractor/invoices/components/InvoiceManagementClient.tsx',
  'app/contractor/contribute-training/page.tsx',
  'app/contractor/certifications/page.tsx',
  'app/contractor/certifications/components/AddCertificationModal.tsx',
  'app/contractor/bid/page.tsx',
  'app/contractor/bid/[jobId]/page.tsx',
  'app/contractor/bid/[jobId]/details/page.tsx',
  'app/contractor/bid/[jobId]/details/error.tsx',
  'app/contractor/bid/[jobId]/components/JobViewTracker.tsx',
  'app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx',
  'app/components/landing/ProductionLandingPage.tsx',
  'app/api/maintenance/health/route.ts',
  'app/api/maintenance/feedback/route.ts',
  'app/api/maintenance/detect/route.ts',
  'app/api/maintenance/assess/route.ts',
  'app/api/feature-flags/[flagName]/route.ts',
  'app/api/contractor/training-contribution/route.ts',
  'app/api/contractor/payout/setup/route.ts',
  'app/api/agents/decision/route.ts',
  'app/api/agents/bid-acceptance/route.ts',
  'app/api/admin/model-learning/route.ts',
  'app/admin/users/error.tsx',
  'app/admin/ai-monitoring/components/AIMonitoringClient.tsx',
  'app/_archive/pre-2025/contractor-jobs-page.tsx',
  'app/(public)/landing/page.tsx',
];

let totalFixed = 0;
let totalFiles = 0;

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    logger.info(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixed = 0;

  // Pattern 1: logger.error('message:', error', [object Object], { service: 'X' });
  // Fix to: logger.error('message', error, { service: 'X' });
  content = content.replace(
    /logger\.(error|warn|info|debug)\(([^,]+):\s*,\s*([^']+)',\s*\[object Object\],\s*\{\s*service:\s*'([^']+)'\s*\}\);/g,
    (match, level, message, errorVar) => {
      fileFixed++;
      return `logger.${level}(${message.trim()}, ${errorVar.trim()}, { service: '${arguments[4]}' });`;
    }
  );

  // Pattern 2: logger.X('message', [object Object], { service: 'X' });
  // Fix to: logger.X('message', { service: 'X' });
  content = content.replace(
    /logger\.(error|warn|info|debug)\(([^)]+),\s*\[object Object\],\s*\{\s*service:\s*'([^']+)'\s*\}\)/g,
    (match, level, message, service) => {
      fileFixed++;
      return `logger.${level}(${message}, { service: '${service}' })`;
    }
  );

  // Pattern 3: Complex nested patterns like in ContractorDiscoverClient
  // logger.info('message:', { data }, [object Object], { service: 'X' })
  content = content.replace(
    /logger\.(error|warn|info|debug)\(([^,]+),\s*\{([^}]+)\},\s*\[object Object\],\s*\{\s*service:\s*'([^']+)'\s*\}\)/g,
    (match, level, message, dataContent, service) => {
      fileFixed++;
      return `logger.${level}(${message}, {${dataContent}}, { service: '${service}' })`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    logger.info(`✅ Fixed ${fileFixed} issues in: ${file}`);
    totalFixed += fileFixed;
    totalFiles++;
  }
});

logger.info(`\n🎉 Total: Fixed ${totalFixed} issues across ${totalFiles} files`);
