#!/bin/bash

# List of corrupted source files to restore from original commit
FILES=(
  "app/jobs/create/hooks/useImageUpload.ts"
  "app/ai-search/error.tsx"
  "app/analytics/page.tsx"
  "app/contact/page.tsx"
  "lib/queries/airbnb-optimized.ts"
  "app/dashboard/error.tsx"
  "app/help/error.tsx"
  "app/notifications/error.tsx"
  "app/notifications/page.tsx"
  "app/pricing/page.tsx"
  "components/profile/HomeownerProfileDropdown.tsx"
  "app/search/error.tsx"
  "app/settings/page.tsx"
  "components/contractor/ProfileBoostWidget.tsx"
  "app/video-calls/error.tsx"
  "components/admin/ConformalPredictionMonitor.tsx"
  "components/agents/AgentAutomationPanel.tsx"
  "components/profile/ProfileDropdown.tsx"
)

cd "C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean"

for FILE in "${FILES[@]}"; do
  git show b54daa37:apps/web/$FILE > apps/web/$FILE 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "Restored: $FILE"
  else
    echo "Not found in original: $FILE"
  fi
done
