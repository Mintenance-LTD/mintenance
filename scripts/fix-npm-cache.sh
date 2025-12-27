#!/bin/bash

# Fix npm Cache and Dependency Issues
# Run this script to clean npm cache and regenerate package-lock.json
# Bash version for Unix/Linux/macOS

set -e

echo "🔧 Fixing npm Cache and Dependencies..."
echo "========================================"
echo ""

# Step 1: Clean npm cache
echo "📦 [1/5] Cleaning npm cache..."
npm cache clean --force
npm cache verify

# Step 2: Remove all node_modules
echo ""
echo "🗑️  [2/5] Removing all node_modules..."
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/mobile/node_modules
find packages -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Step 3: Remove package-lock.json
echo ""
echo "🗑️  [3/5] Removing package-lock.json..."
rm -f package-lock.json

# Step 4: Reinstall dependencies
echo ""
echo "📥 [4/5] Installing dependencies with --legacy-peer-deps..."
echo "   This may take 5-10 minutes..."
npm install --legacy-peer-deps

# Step 5: Verify installation
echo ""
echo "✅ [5/5] Verifying installation..."

# Check TypeScript
echo "   Checking TypeScript..."
if npx tsc --version > /dev/null 2>&1; then
    TSC_VERSION=$(npx tsc --version)
    echo "   ✅ TypeScript: $TSC_VERSION"
else
    echo "   ❌ TypeScript not found!"
    exit 1
fi

# Check if package-lock.json was created
if [ -f "package-lock.json" ]; then
    echo "   ✅ package-lock.json created"
else
    echo "   ❌ package-lock.json not created!"
    exit 1
fi

echo ""
echo "✅ Done! Next steps:"
echo "   1. Run: npm run type-check"
echo "   2. Run: npm run build:packages"
echo "   3. If successful, commit package-lock.json:"
echo "      git add package-lock.json"
echo "      git commit -m 'fix: regenerate package-lock.json to fix npm ci timeouts'"
echo "      git push"

