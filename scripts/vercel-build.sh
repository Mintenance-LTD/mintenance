#!/bin/bash
set -e
echo "=== Mintenance Build ==="
echo "=== Building shared packages ==="
npm run build --workspace=packages/shared --if-present
npm run build --workspace=packages/types --if-present
npm run build --workspace=packages/auth --if-present
npm run build --workspace=packages/design-tokens --if-present
npm run build --workspace=packages/security --if-present
npm run build --workspace=packages/shared-ui --if-present
echo "=== Copying public assets for Vercel ==="
cp -r apps/web/public ./public 2>/dev/null || true
echo "=== Type-checking web app ==="
cd apps/web && npx tsc --noEmit
cd ../..
echo "=== Linting web app ==="
cd apps/web && npx eslint . --max-warnings 5000
cd ../..
echo "=== Building Next.js app ==="
cd apps/web && npx next build
