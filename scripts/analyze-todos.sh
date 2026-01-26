#!/bin/bash

echo "📋 TODO/FIXME Analysis Report"
echo "=============================="
echo

# Count by type
TODO_COUNT=$(grep -r "TODO" apps --include="*.ts" --include="*.tsx" --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" 2>/dev/null | wc -l)
FIXME_COUNT=$(grep -r "FIXME" apps --include="*.ts" --include="*.tsx" --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" 2>/dev/null | wc -l)

echo "📊 Summary:"
echo "  - TODO comments: $TODO_COUNT"
echo "  - FIXME comments: $FIXME_COUNT"
echo "  - Total: $((TODO_COUNT + FIXME_COUNT))"
echo

echo "📁 Files with most TODOs:"
grep -r "TODO\|FIXME" apps --include="*.ts" --include="*.tsx" --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn | head -10

echo
echo "🔍 Sample TODOs to address:"
echo "----------------------------"
grep -r "TODO\|FIXME" apps --include="*.ts" --include="*.tsx" --exclude-dir=".next" --exclude-dir="node_modules" --exclude-dir="dist" 2>/dev/null | head -10
