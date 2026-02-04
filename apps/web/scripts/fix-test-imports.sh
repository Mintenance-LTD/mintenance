#!/usr/bin/env bash
# Fix default vs named import mismatches in test files

set -e

cd "$(dirname "$0")/.."

echo "Fixing test import mismatches..."

# Find all test files with named imports from error/loading/page files
grep -rl "from '\.\./\(error\|loading\|page\)'" --include="*.test.tsx" app | while read -r file; do
  echo "Processing: $file"

  # Fix error.tsx imports
  sed -i "s/import { \([^}]*Error[^}]*\) } from '\.\.\/error';/import \1 from '..\/error';/g" "$file"

  # Fix loading.tsx imports
  sed -i "s/import { \([^}]*Loading[^}]*\) } from '\.\.\/loading';/import \1 from '..\/loading';/g" "$file"

  # Fix page.tsx imports
  sed -i "s/import { \([^}]*Page[^}]*\) } from '\.\.\/page';/import \1 from '..\/page';/g" "$file"
done

echo "✅ Fixed test imports"
echo "Files processed: $(grep -rl "from '\.\./\(error\|loading\|page\)'" --include="*.test.tsx" app | wc -l)"
