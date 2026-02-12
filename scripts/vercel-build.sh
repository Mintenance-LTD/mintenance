#!/bin/bash
set -e
echo "=== Copying public assets for Vercel ==="
cp -r apps/web/public ./public 2>/dev/null || true
echo "=== Building Next.js app ==="
cd apps/web && next build --webpack
