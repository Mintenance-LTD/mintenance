#!/bin/bash

echo "========================================="
echo "Quick Test Summary for Mintenance Project"
echo "========================================="

# Web Tests
echo ""
echo "📱 WEB APPLICATION TESTS"
echo "-----------------------------------------"
cd apps/web
echo "Running sanitizer tests..."
timeout 10 npm run test -- --run lib/__tests__/sanitizer.test.ts 2>&1 | tail -5
cd ../..

# Mobile Tests
echo ""
echo "📱 MOBILE APPLICATION TESTS"
echo "-----------------------------------------"
cd apps/mobile
echo "Counting test files..."
TEST_COUNT=$(find src/__tests__ -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "Found $TEST_COUNT test files"

echo ""
echo "Running sample tests..."
timeout 10 npx jest --passWithNoTests src/__tests__/utils/cache.test.ts 2>&1 | tail -5
cd ../..

echo ""
echo "========================================="
echo "TEST DIRECTORIES STRUCTURE"
echo "========================================="

echo ""
echo "Web test folders:"
find apps/web -type d -name "__tests__" 2>/dev/null | head -10

echo ""
echo "Mobile test folders:"
find apps/mobile/src -type d -name "__tests__" 2>/dev/null | head -10

echo ""
echo "========================================="
echo "RECOMMENDATIONS"
echo "========================================="
echo "1. Run 'npm test' in each app directory for full test suite"
echo "2. Use 'npm run test:coverage' for coverage reports"
echo "3. Fix failing tests before deployment"
echo "4. Target 80% code coverage minimum"