#!/bin/bash
set -e
echo "=== Building Next.js app ==="
cd apps/web && next build --webpack
