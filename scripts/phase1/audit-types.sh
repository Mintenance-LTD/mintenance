#!/bin/bash
# Phase 1: Type System Audit Script

echo "=== TYPE SYSTEM AUDIT ==="

# Find all type definition files
echo "1. Finding all type definition files..."
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -path "*/types/*" ! -path "*/node_modules/*" ! -path "*/.next/*" > type_files.txt

echo "Found $(wc -l < type_files.txt) type files"
echo ""
echo "Type files locations:"
cat type_files.txt | sed 's|^\./||' | head -20

# Check if mobile uses shared types
echo ""
echo "2. Checking mobile's use of @mintenance/types..."
if grep -r "@mintenance/types" apps/mobile/src/ 2>/dev/null | head -1; then
    echo "✓ Mobile app imports @mintenance/types"
else
    echo "✗ WARNING: Mobile app doesn't import @mintenance/types!"
fi

# Check if web uses shared types
echo ""
echo "3. Checking web's use of @mintenance/types..."
if grep -r "@mintenance/types" apps/web/src/ 2>/dev/null | head -1; then
    echo "✓ Web app imports @mintenance/types"
else
    echo "✗ WARNING: Web app doesn't import @mintenance/types!"
fi

# Find duplicate User type definitions
echo ""
echo "4. Finding User type definitions..."
grep -l "interface User\|type User = " $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next) 2>/dev/null | head -10

# Find duplicate Job type definitions
echo ""
echo "5. Finding Job type definitions..."
grep -l "interface Job\|type Job = " $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next) 2>/dev/null | head -10

echo ""
echo "=== TYPE AUDIT COMPLETE ==="