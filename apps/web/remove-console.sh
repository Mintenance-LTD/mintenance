#!/bin/bash

echo "🔍 Removing console.log statements from TypeScript/TSX files..."

# Count initial console.logs
initial_count=$(grep -r "console\.log" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . | wc -l)
echo "Found $initial_count console.log statements"

# Remove console.log statements (comment them out)
find . -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -exec sed -i 's/console\.log/\/\/ console.log/g' {} +

# Count remaining console.logs
final_count=$(grep -r "console\.log" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . | wc -l)
echo "✅ Commented out $(($initial_count - $final_count)) console.log statements"
echo "Remaining: $final_count console.log statements"