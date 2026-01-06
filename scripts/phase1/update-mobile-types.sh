#!/bin/bash
# Phase 1: Update Mobile Type Imports Script

echo "=== UPDATING MOBILE TYPE IMPORTS ==="

# Step 1: Create backup of current types
echo "1. Backing up current mobile types..."
cp apps/mobile/src/types/index.ts apps/mobile/src/types/index.ts.pre-migration

# Step 2: Find all files importing from local types
echo "2. Finding all files with local type imports..."
grep -r "from ['\"].*types['\"]" apps/mobile/src --include="*.ts" --include="*.tsx" | \
    grep -v node_modules | \
    grep -v "@mintenance/types" | \
    cut -d: -f1 | sort -u > files_to_update.txt

FILE_COUNT=$(wc -l < files_to_update.txt)
echo "Found $FILE_COUNT files to update"

# Step 3: Update imports in each file
echo "3. Updating imports..."
while IFS= read -r file; do
    echo "Updating: $file"

    # Replace various import patterns
    sed -i.bak \
        -e "s|from '\.\./types'|from '@mintenance/types'|g" \
        -e "s|from '\.\./\.\./types'|from '@mintenance/types'|g" \
        -e "s|from '\.\./\.\./\.\./types'|from '@mintenance/types'|g" \
        -e "s|from '\.\.\/\.\.\/\.\.\/\.\.\/types'|from '@mintenance/types'|g" \
        -e "s|from \"\.\.\/types\"|from '@mintenance/types'|g" \
        -e "s|from \"\.\.\/\.\.\/types\"|from '@mintenance/types'|g" \
        -e "s|from '.*\/types\/index'|from '@mintenance/types'|g" \
        -e "s|from \".*\/types\/index\"|from '@mintenance/types'|g" \
        "$file"
done < files_to_update.txt

# Step 4: Handle specific imports from database types
echo "4. Updating database type imports..."
find apps/mobile/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
    -e "s|from '.*\/types\/database'|from '@mintenance/types'|g" \
    -e "s|from \".*\/types\/database\"|from '@mintenance/types'|g" {} \;

# Step 5: Clean up backup files
echo "5. Cleaning up backup files..."
find apps/mobile/src -name "*.bak" -delete

echo ""
echo "=== UPDATE COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Fix any type errors (especially 'admin' role)"
echo "3. Run type check: npm run type-check"