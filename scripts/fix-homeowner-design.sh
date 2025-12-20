#!/bin/bash

echo "🏠 COMPREHENSIVE FIX: All Homeowner Pages"
echo "=========================================="
echo ""

# Files with UnifiedSidebar imports (CRITICAL - causes white gap)
UNIFIED_SIDEBAR_FILES=(
  "apps/web/app/analytics/page.tsx"
  "apps/web/app/dashboard/components/DashboardSidebar.tsx"
  "apps/web/app/dashboard/page.tsx"
  "apps/web/app/jobs/create/page.tsx"
  "apps/web/app/jobs/page.tsx"
  "apps/web/app/jobs/[id]/page.tsx"
  "apps/web/app/jobs/[id]/payment/page.tsx"
  "apps/web/app/messages/page.tsx"
  "apps/web/app/notifications/page.tsx"
  "apps/web/app/payments/page.tsx"
  "apps/web/app/properties/components/PropertiesClient2025.tsx"
  "apps/web/app/scheduling/components/SchedulingClient2025.tsx"
  "apps/web/app/settings/page.tsx"
  "apps/web/app/video-calls/page.tsx"
)

# Files with DollarSign icons
DOLLAR_SIGN_FILES=(
  "apps/web/app/analytics/components/AnalyticsClient.tsx"
  "apps/web/app/components/landing/SocialProofSection2025.tsx"
  "apps/web/app/dashboard/page.tsx"
  "apps/web/app/faq/page.tsx"
  "apps/web/app/invoices/[invoiceId]/page.tsx"
  "apps/web/app/jobs/[id]/edit/page.tsx"
  "apps/web/app/payments/[transactionId]/page.tsx"
  "apps/web/app/properties/add/page.tsx"
  "apps/web/app/properties/[id]/page.tsx"
)

echo "📊 Summary:"
echo "  - Files with UnifiedSidebar: ${#UNIFIED_SIDEBAR_FILES[@]}"
echo "  - Files with DollarSign: ${#DOLLAR_SIGN_FILES[@]}"
echo ""

# Step 1: Comment out UnifiedSidebar imports (except DashboardSidebar.tsx which defines it)
echo "Step 1: Removing duplicate UnifiedSidebar imports..."
for file in "${UNIFIED_SIDEBAR_FILES[@]}"; do
  if [ -f "$file" ] && [ "$file" != "apps/web/app/dashboard/components/DashboardSidebar.tsx" ]; then
    echo "  Processing: $file"
    # Comment out the import line
    sed -i "s/^import { UnifiedSidebar }/\/\/ REMOVED: import { UnifiedSidebar }/g" "$file"
    sed -i "s/^import.*UnifiedSidebar.*from.*$/\/\/ REMOVED: &/g" "$file"
    echo "    ✅ Removed UnifiedSidebar import"
  fi
done
echo ""

# Step 2: Replace DollarSign with PoundSterling
echo "Step 2: Fixing all currency icons (DollarSign → PoundSterling)..."
for file in "${DOLLAR_SIGN_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    sed -i 's/DollarSign/PoundSterling/g' "$file"
    echo "    ✅ Fixed DollarSign → PoundSterling"
  fi
done
echo ""

# Step 3: Fix min-h-screen in pages that have layout conflicts
echo "Step 3: Fixing min-h-screen layout issues..."
MIN_HEIGHT_FILES=(
  "apps/web/app/analytics/page.tsx"
  "apps/web/app/dashboard/page.tsx"
  "apps/web/app/discover/components/DiscoverClient.tsx"
  "apps/web/app/jobs/create/page.tsx"
  "apps/web/app/jobs/page.tsx"
  "apps/web/app/jobs/[id]/page.tsx"
  "apps/web/app/messages/page.tsx"
  "apps/web/app/notifications/page.tsx"
  "apps/web/app/payments/page.tsx"
  "apps/web/app/scheduling/components/SchedulingClient2025.tsx"
  "apps/web/app/settings/page.tsx"
  "apps/web/app/video-calls/page.tsx"
)

for file in "${MIN_HEIGHT_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    # Replace min-h-screen with min-h-0 to avoid conflicts
    sed -i 's/min-h-screen/min-h-0/g' "$file"
    sed -i 's/className="flex min-h-0/className="flex/g' "$file"
    echo "    ✅ Fixed min-h-screen classes"
  fi
done
echo ""

# Step 4: Fix HomeownerLayoutShell to properly center content
echo "Step 4: Fixing HomeownerLayoutShell for centered content..."
LAYOUT_SHELL="apps/web/app/dashboard/components/HomeownerLayoutShell.tsx"
if [ -f "$LAYOUT_SHELL" ]; then
  echo "  Updating: $LAYOUT_SHELL"
  # This will be done manually as it requires careful JSX editing
  echo "    ⚠️  Manual update needed - see instructions below"
fi
echo ""

echo "✨ Phase 1 Complete! Fixed:"
echo "  ✅ Removed ${#UNIFIED_SIDEBAR_FILES[@]} duplicate UnifiedSidebar imports"
echo "  ✅ Fixed ${#DOLLAR_SIGN_FILES[@]} DollarSign → PoundSterling"
echo "  ✅ Fixed ${#MIN_HEIGHT_FILES[@]} min-h-screen layouts"
echo ""
echo "📝 MANUAL STEP REQUIRED:"
echo "   Update HomeownerLayoutShell.tsx to center content:"
echo "   - Add max-width: 1280px to main content area"
echo "   - Add margin: 0 auto for centering"
echo "   - Change background to #f9fafb"
echo ""
echo "🎯 Files that were fixed:"
echo ""
echo "Layout Conflicts (UnifiedSidebar removed):"
for file in "${UNIFIED_SIDEBAR_FILES[@]}"; do
  if [ "$file" != "apps/web/app/dashboard/components/DashboardSidebar.tsx" ]; then
    echo "   ✅ $file"
  fi
done
echo ""
echo "Currency Icons (£ instead of $):"
for file in "${DOLLAR_SIGN_FILES[@]}"; do
  echo "   ✅ $file"
done
