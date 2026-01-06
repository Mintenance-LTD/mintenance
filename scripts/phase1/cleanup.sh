#!/bin/bash
# Phase 1: Cleanup Script

echo "=== CLEANUP STARTING ==="

# Count backup files first
echo "1. Counting backup files..."
BACKUP_COUNT=$(find . -type f \( -name "*.backup" -o -name "*.refactored.*" -o -name "*.old" \) ! -path "*/node_modules/*" ! -path "*/.next/*" 2>/dev/null | wc -l)
echo "Found $BACKUP_COUNT backup/refactored files"

# Remove backup files (excluding coverage reports)
echo "2. Removing backup files..."
find . -type f \( -name "*.backup" -o -name "*.old" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/coverage/*" -delete 2>/dev/null

# Remove refactored files (excluding coverage reports)
echo "3. Removing refactored files..."
find . -type f -name "*.refactored.*" ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/coverage/*" -delete 2>/dev/null

# Count remaining
REMAINING=$(find . -type f \( -name "*.backup" -o -name "*.refactored.*" -o -name "*.old" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/coverage/*" 2>/dev/null | wc -l)
echo "Removed $(($BACKUP_COUNT - $REMAINING)) files"

if [ $REMAINING -gt 0 ]; then
    echo "Warning: $REMAINING backup files remain (likely in coverage folders)"
fi

echo "=== CLEANUP COMPLETE ==="