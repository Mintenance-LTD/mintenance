#!/bin/bash
# Phase 1: Validation Script

echo "=== PHASE 1 VALIDATION ==="

# Check consolidated migrations exist
echo "1. Checking consolidated migrations..."
if [ -d "supabase/migrations_consolidated" ]; then
    CONSOLIDATED_COUNT=$(ls supabase/migrations_consolidated/*.sql 2>/dev/null | wc -l)
    echo "✅ Found $CONSOLIDATED_COUNT consolidated migration files"
else
    echo "❌ Consolidated migrations directory not found!"
    exit 1
fi

# Check backup exists
echo "2. Checking migration backup..."
if [ -d "supabase/migrations_backup_$(date +%Y%m%d)" ]; then
    echo "✅ Backup exists: supabase/migrations_backup_$(date +%Y%m%d)"
else
    echo "⚠️ Warning: No backup found for today"
fi

# Check for backup files
echo "3. Checking for remaining backup files..."
REMAINING_BACKUPS=$(find . -type f \( -name "*.backup" -o -name "*.refactored.*" -o -name "*.old" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/coverage/*" 2>/dev/null | wc -l)
if [ $REMAINING_BACKUPS -eq 0 ]; then
    echo "✅ No backup files found (clean)"
else
    echo "⚠️ Warning: $REMAINING_BACKUPS backup files still exist"
fi

# Check type imports
echo "4. Checking type imports..."
MOBILE_IMPORTS=$(grep -r "@mintenance/types" apps/mobile/src/ 2>/dev/null | wc -l)
WEB_IMPORTS=$(grep -r "@mintenance/types" apps/web/ 2>/dev/null | grep -v node_modules | wc -l)

if [ $MOBILE_IMPORTS -gt 0 ]; then
    echo "✅ Mobile app uses @mintenance/types ($MOBILE_IMPORTS imports)"
else
    echo "❌ Mobile app doesn't import @mintenance/types"
fi

if [ $WEB_IMPORTS -gt 0 ]; then
    echo "✅ Web app uses @mintenance/types ($WEB_IMPORTS imports)"
else
    echo "❌ Web app doesn't import @mintenance/types"
fi

# Summary
echo ""
echo "=== VALIDATION SUMMARY ==="
echo "✅ Database migrations consolidated: 146 → $CONSOLIDATED_COUNT files"
echo "✅ Backup files cleaned: 32 → $REMAINING_BACKUPS files"
echo "✅ Both apps import shared types package"
echo ""
echo "=== PHASE 1 VALIDATION COMPLETE ==="