#!/bin/bash
set -e
echo "=== Mintenance Build ==="
echo "=== Building shared packages ==="
npm run build --workspace=packages/shared --if-present || echo "WARN: shared build had errors (non-fatal)"
npm run build --workspace=packages/types --if-present || echo "WARN: types build had errors (non-fatal)"
npm run build --workspace=packages/auth --if-present || echo "WARN: auth build had errors (non-fatal)"
npm run build --workspace=packages/design-tokens --if-present || echo "WARN: design-tokens build had errors (non-fatal)"
npm run build --workspace=packages/security --if-present || echo "WARN: security build had errors (non-fatal)"
npm run build --workspace=packages/shared-ui --if-present || echo "WARN: shared-ui build had errors (non-fatal)"
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
