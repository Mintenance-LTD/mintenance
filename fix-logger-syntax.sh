#!/bin/bash

# Fix malformed logger calls in the codebase
# Pattern: logger.error('message', error', [object Object], { service: 'xyz' });
# Should be: logger.error('message', error, { service: 'xyz' });

echo "Fixing malformed logger calls..."

# Find and fix in packages/shared
find packages/shared -name "*.ts" -type f | while read file; do
  if grep -q "error'.*\[object Object\]" "$file"; then
    echo "Fixing: $file"
    sed -i.bak "s/error', \[object Object\]/error/g" "$file"
    sed -i.bak "s/metric', \[object Object\]/metric/g" "$file"
    sed -i.bak "s/logEvent', \[object Object\]/logEvent/g" "$file"
    sed -i.bak "s/formatted', \[object Object\]/formatted/g" "$file"
    rm "${file}.bak"
  fi
done

# Find and fix in apps/web
find apps/web -name "*.ts" -o -name "*.tsx" | while read file; do
  if grep -q "error'.*\[object Object\]" "$file" 2>/dev/null; then
    echo "Fixing: $file"
    sed -i.bak "s/error', \[object Object\]/error/g" "$file"
    sed -i.bak "s/data', \[object Object\]/data/g" "$file"
    sed -i.bak "s/result', \[object Object\]/result/g" "$file"
    sed -i.bak "s/response', \[object Object\]/response/g" "$file"
    sed -i.bak "s/message', \[object Object\]/message/g" "$file"
    rm "${file}.bak"
  fi
done

echo "Done! Fixed all malformed logger calls."