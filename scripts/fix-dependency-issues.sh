#!/bin/bash

# Dependency Fix Script
# Fixes critical dependency issues identified in DEPENDENCY_REVIEW_REPORT.md

set -e

echo "🔧 Fixing Mintenance Dependency Issues..."
echo "=========================================="
echo ""

# Issue #1: Align React versions to 19.2.0
echo "📦 [1/4] Aligning React versions to 19.2.0..."
npm install react@^19.2.0 react-dom@^19.2.0 -w @mintenance/web --save-exact

# Issue #2: Fix @types/react in shared-ui
echo "📦 [2/4] Updating @types/react in shared-ui..."
npm install @types/react@^19.0.10 @types/react-dom@^19 -D -w @mintenance/shared-ui

# Issue #4: Align React Query versions
echo "📦 [3/4] Aligning React Query versions..."
npm install @tanstack/react-query@^5.90.5 -w @mintenance/mobile

# Issue #3: Install all dependencies
echo "📦 [4/4] Installing all dependencies..."
npm install

echo ""
echo "✅ All dependency issues fixed!"
echo ""
echo "Manual action required:"
echo "- Remove duplicate 'eslint-config-expo' from apps/mobile/package.json dependencies"
echo "- It should only be in devDependencies"
echo ""
echo "Run 'npm audit' to verify security status"
