#!/bin/bash

# Clear Next.js cache and restart dev server
# This fixes hydration mismatches caused by stale cached code

echo "🧹 Clearing Next.js cache..."

# Kill any running dev servers
echo "Stopping dev servers..."
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Clear Next.js build cache
echo "Removing .next directory..."
rm -rf apps/web/.next

# Clear module cache (optional but recommended)
echo "Clearing node_modules cache..."
find . -name ".next" -type d -prune -exec rm -rf {} + 2>/dev/null || true

echo "✅ Cache cleared!"
echo ""
echo "To restart the dev server, run:"
echo "  npm run dev"
echo ""
echo "This should fix the hydration mismatch error."
