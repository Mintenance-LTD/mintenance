#!/bin/bash
# Load Test Script for Mintenance
# Prerequisites: npx autocannon (auto-installed)
# Usage: bash scripts/load-test.sh [URL] [CONNECTIONS] [DURATION]

set -e

URL="${1:-https://mintenance-clean-ten.vercel.app}"
CONNECTIONS="${2:-50}"
DURATION="${3:-30}"

echo "=== Mintenance Load Test ==="
echo "Target: $URL"
echo "Connections: $CONNECTIONS"
echo "Duration: ${DURATION}s"
echo ""

echo "--- Test 1: Homepage (GET /) ---"
npx autocannon -c "$CONNECTIONS" -d "$DURATION" -p 2 "$URL" 2>&1
echo ""

echo "--- Test 2: API Health Check (GET /api/health) ---"
npx autocannon -c "$CONNECTIONS" -d "$DURATION" -p 2 "$URL/api/health" 2>&1
echo ""

echo "--- Test 3: Static Assets (GET /_next/static) ---"
npx autocannon -c "$CONNECTIONS" -d "$DURATION" -p 2 "$URL/_next/static/chunks/webpack.js" 2>&1
echo ""

echo "--- Test 4: High Concurrency Burst (100 connections, 10s) ---"
npx autocannon -c 100 -d 10 -p 2 "$URL" 2>&1
echo ""

echo "=== Load Test Complete ==="
