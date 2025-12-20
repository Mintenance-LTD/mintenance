#!/bin/bash

echo "🔧 COMPREHENSIVE FIX: All Contractor Pages"
echo "==========================================="
echo ""

# Files with UnifiedSidebar imports (CRITICAL - causes white gap)
UNIFIED_SIDEBAR_FILES=(
  "apps/web/app/contractor/bid/page.tsx"
  "apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx"
  "apps/web/app/contractor/connections/page.tsx"
  "apps/web/app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx"
  "apps/web/app/contractor/discover/page.tsx"
  "apps/web/app/contractor/jobs/page.tsx"
  "apps/web/app/contractor/profile/components/ContractorProfileClient2025.tsx"
  "apps/web/app/contractor/reporting/components/ReportingDashboard2025Client.tsx"
  "apps/web/app/contractor/resources/page.tsx"
  "apps/web/app/contractor/social/page.tsx"
  "apps/web/app/contractor/subscription/page.tsx"
  "apps/web/app/contractor/verification/page.tsx"
)

# Files with min-h-screen (layout issues)
MIN_HEIGHT_FILES=(
  "apps/web/app/contractor/bid/page.tsx"
  "apps/web/app/contractor/bid/[jobId]/components/BidSubmissionClient2025.tsx"
  "apps/web/app/contractor/calendar/page.tsx"
  "apps/web/app/contractor/certifications/page.tsx"
  "apps/web/app/contractor/connections/page.tsx"
  "apps/web/app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx"
  "apps/web/app/contractor/discover/page.tsx"
  "apps/web/app/contractor/documents/page.tsx"
  "apps/web/app/contractor/expenses/page.tsx"
  "apps/web/app/contractor/finance/page.tsx"
  "apps/web/app/contractor/insurance/page.tsx"
  "apps/web/app/contractor/jobs/page.tsx"
  "apps/web/app/contractor/marketing/page.tsx"
  "apps/web/app/contractor/portfolio/page.tsx"
  "apps/web/app/contractor/profile/components/ContractorProfileClient2025.tsx"
  "apps/web/app/contractor/quotes/page.tsx"
  "apps/web/app/contractor/reporting/components/ReportingDashboard2025Client.tsx"
  "apps/web/app/contractor/resources/page.tsx"
  "apps/web/app/contractor/reviews/page.tsx"
  "apps/web/app/contractor/settings/page.tsx"
)

echo "📊 Summary:"
echo "  - Files with UnifiedSidebar: ${#UNIFIED_SIDEBAR_FILES[@]}"
echo "  - Files with min-h-screen: ${#MIN_HEIGHT_FILES[@]}"
echo ""

# Step 1: Comment out UnifiedSidebar imports
echo "Step 1: Removing UnifiedSidebar imports..."
for file in "${UNIFIED_SIDEBAR_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    # Comment out the import line
    sed -i "s/^import { UnifiedSidebar }/\/\/ REMOVED: import { UnifiedSidebar }/g" "$file"
    sed -i "s/^import.*UnifiedSidebar.*$/\/\/ REMOVED: &/g" "$file"
    echo "    ✅ Removed UnifiedSidebar import"
  fi
done
echo ""

# Step 2: Replace min-h-screen with proper wrapper
echo "Step 2: Fixing min-h-screen layouts..."
for file in "${MIN_HEIGHT_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    # Replace min-h-screen classes
    sed -i 's/min-h-screen/min-h-0/g' "$file"
    sed -i 's/className="flex min-h-0/className="flex/g' "$file"
    echo "    ✅ Fixed min-h-screen classes"
  fi
done
echo ""

# Step 3: Replace DollarSign with PoundSterling (again, comprehensive)
echo "Step 3: Ensuring all currency icons are PoundSterling..."
ALL_TSX_FILES=$(find apps/web/app/contractor -name "*.tsx" -type f)

for file in $ALL_TSX_FILES; do
  if grep -q "DollarSign" "$file" 2>/dev/null; then
    echo "  Processing: $file"
    sed -i 's/DollarSign/PoundSterling/g' "$file"
    echo "    ✅ Fixed DollarSign → PoundSterling"
  fi
done
echo ""

# Step 4: Add ContractorPageWrapper import where needed
echo "Step 4: Adding ContractorPageWrapper imports..."
for file in "${UNIFIED_SIDEBAR_FILES[@]}"; do
  if [ -f "$file" ] && ! grep -q "ContractorPageWrapper" "$file"; then
    echo "  Adding to: $file"
    # Add import after 'use client' or first import
    sed -i "/^'use client';/a import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';" "$file"
    echo "    ✅ Added ContractorPageWrapper import"
  fi
done
echo ""

echo "✨ Phase 1 Complete! Fixed:"
echo "  ✅ Removed ${#UNIFIED_SIDEBAR_FILES[@]} UnifiedSidebar imports"
echo "  ✅ Fixed ${#MIN_HEIGHT_FILES[@]} min-h-screen layouts"
echo "  ✅ Ensured all DollarSign → PoundSterling"
echo "  ✅ Added ContractorPageWrapper imports"
echo ""
echo "⚠️  NEXT STEP: Each page needs manual wrapping with <ContractorPageWrapper>"
echo "   This cannot be automated safely without breaking JSX structure."
echo ""
echo "📝 Files that MUST be manually updated:"
for file in "${UNIFIED_SIDEBAR_FILES[@]}"; do
  echo "   - $file"
done
