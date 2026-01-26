# Web App Test Infrastructure - Deep Analysis

## Overview
**Date**: 2026-01-22
**Total Test Files**: 1,439
**Analysis Scope**: Identify quick wins and migration priorities

## Test File Breakdown

### By Type
| Category | Count | Percentage | Status |
|----------|-------|------------|--------|
| **Total Test Files** | 1,439 | 100% | - |
| Files using `jest.mock()` | 461 | 32.0% | ❌ Need migration |
| Placeholder tests ("should create an instance") | 384 | 26.7% | ⚠️ Low value |
| Substantive tests | ~594 | 41.3% | ✅ Likely working |

### Key Findings

1. **Placeholder Test Epidemic**: 384 files (27%) are placeholders with empty test bodies
   - Pattern: `it('should create an instance', () => { expect(service).toBeDefined(); })`
   - Value: Minimal - only checks exports
   - Impact: Inflates file count without testing behavior

2. **Jest/Vitest Incompatibility**: 461 files (32%) use `jest.mock()`
   - Root cause: Module-level mocking incompatible with Vitest
   - Solution: Apply VITEST_MIGRATION_PATTERN.md
   - Status: Template created, 460 files remaining

3. **Working Tests**: ~594 files (41%) likely working
   - Using Vitest syntax or no mocking
   - Focus area for coverage improvements

## Test Quality Assessment

### Low-Value Tests (Placeholders)
```typescript
// Common pattern in 384 files
describe('ComponentName', () => {
  it('should create an instance', () => {
    expect(component).toBeDefined();
  });

  it('should handle successful operations', async () => {
    // Test successful cases (EMPTY)
  });

  it('should handle errors gracefully', async () => {
    // Test error cases (EMPTY)
  });
});
```

**Impact**: These tests pass but provide no value
**Recommendation**: Delete or replace with real tests

### High-Value Tests (Substantive)
Examples:
- `payment-intent.handler.test.ts` - 6 comprehensive tests ✅
- Component tests with user interactions
- Integration tests with real workflows

## Migration Priority Matrix

### Priority 1: High-Value Jest Tests (Estimate: ~77 files)
Files using `jest.mock()` AND have substantive tests
- **Impact**: Highest - fixes real test failures
- **Effort**: Medium - apply pattern from template
- **Files**: Stripe handlers, API routes, complex services

### Priority 2: Placeholder Jest Tests (Estimate: ~384 files)
Files using `jest.mock()` OR placeholders
- **Impact**: Low - tests don't test anything
- **Effort**: Low - bulk delete or ignore
- **Recommendation**: Delete placeholder files entirely

### Priority 3: Working Tests
Files already using Vitest syntax
- **Impact**: N/A - already working
- **Effort**: None
- **Action**: Leave as-is

## Quick Wins Identified

### Win 1: Delete Placeholder Files
**Files Affected**: 384
**Time**: Minutes (automated deletion)
**Impact**: Reduces test suite noise by 27%

```bash
# Find and optionally delete placeholder tests
find . -name "*.test.ts" -o -name "*.test.tsx" | \
  xargs grep -l "should create an instance" | \
  xargs grep -L "expect.*toBe\|expect.*toHaveBeenCalled" > placeholder-tests.txt

# Review and delete
# rm $(cat placeholder-tests.txt)
```

### Win 2: Fix High-Value Jest Tests
**Files Affected**: ~77 (substantive tests with jest.mock)
**Time**: 1-2 hours (using template)
**Impact**: Major improvement in actual test coverage

### Win 3: Run Vitest-Compatible Tests Only
**Files Affected**: ~594
**Time**: Immediate
**Impact**: Get baseline metrics

```bash
# Run tests excluding jest.mock files
npm test -- --run --exclude="**/*jest.mock*"
```

## Test Suite Performance Analysis

### Current State
- **Timeout**: 3+ minutes
- **Cause**: Cascading failures from Jest/Vitest incompatibility
- **Affected**: 461 files with jest.mock()

### After Quick Wins
- **Remove 384 placeholders**: -27% files
- **Fix 77 high-value**: +real coverage
- **Expected timeout**: <1 minute for working tests

## Recommendations

### Short Term (This Session)
1. ✅ **DONE**: Create template (payment-intent.handler.test.ts)
2. ✅ **DONE**: Document pattern (VITEST_MIGRATION_PATTERN.md)
3. ⏳ **TODO**: Identify 5-10 highest value tests to migrate
4. ⏳ **TODO**: Create automated migration script (optional)

### Medium Term (Next Sessions)
1. Delete or ignore 384 placeholder files
2. Migrate 77 high-value Jest tests using template
3. Run test suite on working tests only
4. Generate coverage report

### Long Term (Ongoing)
1. Convert placeholders to real tests when touching code
2. Enforce Vitest syntax in new tests (ESLint rule)
3. Monitor test performance
4. Maintain 80%+ coverage on critical paths

## Automation Opportunities

### Script 1: Find High-Value Jest Tests
```bash
#!/bin/bash
# Find files with jest.mock AND substantive tests
find . -name "*.test.ts" -o -name "*.test.tsx" | while read file; do
  if grep -q "jest.mock" "$file"; then
    # Count non-placeholder test lines
    lines=$(grep -E "expect\(.*\)\.(toBe|toEqual|toHaveBeenCalled)" "$file" | wc -l)
    if [ $lines -gt 5 ]; then
      echo "$file ($lines assertions)"
    fi
  fi
done
```

### Script 2: Auto-Migrate Jest to Vitest
```bash
#!/bin/bash
# Automated migration (use with caution)
for file in $(find . -name "*.test.ts" -o -name "*.test.tsx"); do
  if grep -q "jest.mock" "$file"; then
    # Add vi import
    sed -i "1i import { vi } from 'vitest';" "$file"

    # Replace jest.mock with vi.mock
    sed -i 's/jest\.mock/vi.mock/g' "$file"

    # Replace jest.fn with vi.fn
    sed -i 's/jest\.fn/vi.fn/g' "$file"

    # Replace as jest.Mock with vi.mocked
    sed -i 's/as jest\.Mock/vi.mocked/g' "$file"
  fi
done
```

## Coverage Goals

### Current (Estimated)
- **Line Coverage**: Unknown (can't generate report)
- **Test Files**: 1,439
- **Passing Tests**: ~41% (working Vitest tests)
- **Failing Tests**: ~32% (Jest syntax)
- **Placeholder Tests**: ~27% (no value)

### Target After Migration
- **Line Coverage**: 30%+ (Vitest threshold)
- **Test Files**: 1,055 (after deleting 384 placeholders)
- **Passing Tests**: 70%+ (after fixing Jest tests)
- **Failing Tests**: <10%
- **Real Tests**: 90%+ (no placeholders)

## Files to Prioritize for Migration

Based on critical paths from codebase (payment, jobs, auth):

1. `app/api/payments/**/*.test.ts` - Payment flows
2. `app/api/jobs/**/*.test.ts` - Job management
3. `app/api/auth/**/*.test.ts` - Authentication
4. `app/jobs/create/**/*.test.tsx` - Job creation UI
5. `app/contractor/**/*.test.tsx` - Contractor workflows

## Conclusion

The web app test infrastructure has three distinct groups:
1. **27% placeholder tests** - Delete or ignore
2. **32% Jest syntax tests** - Need migration (template ready)
3. **41% working tests** - Leave as-is

**Biggest Quick Win**: Delete 384 placeholder files to reduce noise and identify real test failures.

**Next Priority**: Migrate ~77 high-value Jest tests using the documented pattern.
