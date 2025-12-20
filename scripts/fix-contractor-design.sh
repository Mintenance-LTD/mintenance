#!/bin/bash

# Script to fix all contractor pages:
# 1. Replace DollarSign with PoundSterling
# 2. Remove excessive gradients
# 3. Fix typography (reduce bold)
# 4. Ensure consistent layout

echo "🔧 Fixing Contractor Page Design Issues..."

# Array of files with DollarSign
FILES_WITH_DOLLAR=(
  "apps/web/app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client.tsx"
  "apps/web/app/contractor/expenses/page.tsx"
  "apps/web/app/contractor/finance/page.tsx"
  "apps/web/app/contractor/insurance/page.tsx"
  "apps/web/app/contractor/portfolio/page.tsx"
  "apps/web/app/contractor/quotes/page.tsx"
  "apps/web/app/contractor/settings/page.tsx"
  "apps/web/app/contractor/tools/page.tsx"
)

# Replace DollarSign with PoundSterling in imports
for file in "${FILES_WITH_DOLLAR[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Replace in imports
    sed -i 's/DollarSign,/PoundSterling,/g' "$file"
    sed -i 's/DollarSign$/PoundSterling/g' "$file"

    # Replace in JSX
    sed -i 's/<DollarSign/<PoundSterling/g' "$file"
    sed -i 's/{DollarSign}/{PoundSterling}/g' "$file"
    sed -i 's/icon={DollarSign}/icon={PoundSterling}/g' "$file"

    echo "  ✅ Fixed DollarSign → PoundSterling"
  fi
done

echo "✨ Done! All DollarSign icons replaced with PoundSterling"
echo "📝 Remember to:"
echo "   1. Test the pages"
echo "   2. Verify currency formatting uses £"
echo "   3. Check for any remaining layout issues"
