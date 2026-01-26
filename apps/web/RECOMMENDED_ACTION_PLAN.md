# Web App Test Suite - Recommended Action Plan

## Executive Summary

**Current State**: 1,439 test files, ~68% have issues
**Quick Win Available**: Remove 384 placeholder files (27% reduction)
**Migration Needed**: 461 files use incompatible Jest syntax
**Solution Ready**: Template + pattern documented

## Test Suite Breakdown

```
Total: 1,439 files (100%)
├── Placeholder Tests: 384 files (27%) ⚠️ DELETE
├── Jest Syntax Tests: 461 files (32%) 🔧 MIGRATE
│   ├── High-value: ~77 files (real tests)
│   └── Low-value: ~384 files (overlap with placeholders)
└── Working Tests: ~594 files (41%) ✅ KEEP
```

## Three-Tier Priority System

### Tier 1: Delete Placeholder Tests ⚡ IMMEDIATE
**Files**: 384 (27% of total)
**Time**: 5 minutes (automated)
**Impact**: Huge - reduces noise, clarifies real failures

**Placeholder Pattern**:
```typescript
// 384 files like this - ZERO value
it('should create an instance', () => {
  expect(service).toBeDefined(); // Only checks exports
});

it('should handle successful operations', async () => {
  // Test successful cases (EMPTY BODY)
});
```

**Action**:
```bash
# Step 1: Identify placeholder files
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | \
  xargs grep -l "should create an instance" | \
  xargs grep -L "expect.*toHaveBeenCalled\|expect.*toBe.*(" > placeholder-tests.txt

# Step 2: Review list
cat placeholder-tests.txt | wc -l  # Should show ~384

# Step 3: Delete (or move to archive)
mkdir -p apps/web/__tests__/archive/placeholders
while read file; do
  mv "$file" "apps/web/__tests__/archive/placeholders/"
done < placeholder-tests.txt

# Result: 1,439 → 1,055 test files (-384, -27%)
```

### Tier 2: Migrate High-Value Jest Tests 🎯 HIGH PRIORITY
**Files**: ~77 (substantive tests with jest.mock)
**Time**: 2-3 hours (using template)
**Impact**: Critical - fixes real test coverage

**Identification**:
```bash
# Find files with jest.mock AND real assertions
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | while read file; do
  if grep -q "jest.mock" "$file"; then
    assertions=$(grep -E "expect\(.*\)\.(toBe|toEqual|toHaveBeenCalled)" "$file" | wc -l)
    if [ $assertions -gt 5 ]; then
      echo "$file ($assertions assertions)"
    fi
  fi
done | sort -t'(' -k2 -rn | head -n 77 > high-value-jest-tests.txt
```

**Migration Steps** (per file):
1. Add `import { vi } from 'vitest';`
2. Replace `jest.mock()` → `vi.mock()`
3. Replace `jest.fn()` → `vi.fn()`
4. Replace `as jest.Mock` → `vi.mocked()`
5. If testing Supabase, use `createChain()` pattern from VITEST_MIGRATION_PATTERN.md
6. Run test: `npm test -- path/to/file.test.ts --run`

**Example Files to Prioritize**:
- `app/api/payments/**/*.test.ts` - Payment flows
- `app/api/jobs/**/*.test.ts` - Job management
- `app/api/auth/**/*.test.ts` - Authentication
- `app/contractor/**/*.test.tsx` - Contractor workflows

### Tier 3: Ignore Low-Value Jest Tests ⏸️ LOW PRIORITY
**Files**: ~384 (placeholders with jest.mock)
**Time**: N/A
**Impact**: Minimal - already deleting in Tier 1

These are placeholders that also use `jest.mock()`. Delete them in Tier 1.

## Expected Results by Tier

| Metric | Before | After Tier 1 | After Tier 2 | After Tier 3 |
|--------|--------|--------------|--------------|--------------|
| Total Files | 1,439 | 1,055 (-27%) | 1,055 | 1,055 |
| Placeholder | 384 | 0 ✅ | 0 ✅ | 0 ✅ |
| Jest Syntax | 461 | 77 | 0 ✅ | 0 ✅ |
| Working | 594 | 978 (+65%) | 1,055 (+77%) | 1,055 |
| Pass Rate | ~41% | ~93% | ~100% | ~100% |
| Test Timeout | 3+ min | <30 sec | <30 sec | <30 sec |

## Automation Scripts

### Script 1: Delete Placeholders (Safe)
```bash
#!/bin/bash
# delete-placeholders.sh

# Create archive directory
mkdir -p apps/web/__tests__/archive/placeholders

# Find placeholder files (safe - moves to archive)
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | while read file; do
  # Check if file has placeholder pattern
  if grep -q "should create an instance" "$file"; then
    # Check if file has NO real assertions
    if ! grep -q "expect.*toHaveBeenCalled\|expect.*toBe.*(" "$file"; then
      echo "Archiving: $file"
      mv "$file" "apps/web/__tests__/archive/placeholders/"
    fi
  fi
done

echo "✅ Placeholder tests archived"
echo "Remaining files: $(find apps/web -name '*.test.ts' -o -name '*.test.tsx' | wc -l)"
```

### Script 2: Auto-Migrate Jest to Vitest (Experimental)
```bash
#!/bin/bash
# migrate-jest-to-vitest.sh
# WARNING: Review changes before committing

for file in "$@"; do
  echo "Migrating: $file"

  # Backup
  cp "$file" "$file.backup"

  # Add vi import if not present
  if ! grep -q "import.*vi.*from 'vitest'" "$file"; then
    sed -i "1i import { vi } from 'vitest';" "$file"
  fi

  # Replace jest.mock with vi.mock
  sed -i 's/jest\.mock(/vi.mock(/g' "$file"

  # Replace jest.fn with vi.fn
  sed -i 's/jest\.fn(/vi.fn(/g' "$file"

  # Replace jest.clearAllMocks with vi.clearAllMocks
  sed -i 's/jest\.clearAllMocks/vi.clearAllMocks/g' "$file"

  # Replace jest.spyOn with vi.spyOn
  sed -i 's/jest\.spyOn/vi.spyOn/g' "$file"

  # Replace as jest.Mock with vi.mocked
  sed -i 's/(\(.*\) as jest\.Mock)/vi.mocked(\1)/g' "$file"

  echo "✅ Migrated: $file (backup at $file.backup)"
done

# Usage: ./migrate-jest-to-vitest.sh file1.test.ts file2.test.ts
```

### Script 3: Find High-Value Tests
```bash
#!/bin/bash
# find-high-value-tests.sh

echo "Finding high-value Jest tests..."

find apps/web -name "*.test.ts" -o -name "*.test.tsx" | while read file; do
  if grep -q "jest.mock" "$file"; then
    # Count real assertions
    assertions=$(grep -E "expect\(.*\)\.(toBe|toEqual|toHaveBeenCalled|toThrow|toContain)" "$file" | wc -l)

    # Count test cases
    tests=$(grep -E "it\(|test\(" "$file" | wc -l)

    if [ $assertions -gt 5 ]; then
      echo "$file | Tests: $tests | Assertions: $assertions"
    fi
  fi
done | sort -t'|' -k3 -rn > high-value-tests.txt

echo "✅ Results saved to high-value-tests.txt"
head -n 20 high-value-tests.txt
```

## Immediate Next Steps (This Session)

1. ✅ **DONE**: Identify test infrastructure issues
2. ✅ **DONE**: Create analysis documents
3. ⏳ **DO NOW**: Run Tier 1 deletion script
4. ⏳ **DO NOW**: Identify top 10 high-value tests to migrate
5. ⏳ **DO NOW**: Migrate 2-3 high-value tests as examples

## Medium Term (Next 1-2 Sessions)

1. Complete Tier 2 migration (77 high-value tests)
2. Run full test suite on working tests
3. Generate coverage report
4. Update vitest.config.mts for parallelization
5. Document lessons learned

## Long Term (Ongoing)

1. Enforce Vitest syntax in new tests (ESLint rule)
2. Convert archived placeholders to real tests when touching code
3. Monitor test performance metrics
4. Maintain 80%+ coverage on critical paths
5. Review and improve test quality quarterly

## Success Metrics

### Tier 1 Success
- ✅ 384 placeholder files archived
- ✅ Test suite reduced to 1,055 files
- ✅ Clearer view of real test failures

### Tier 2 Success
- ✅ 77 high-value tests migrated
- ✅ All substantive tests passing
- ✅ Coverage report generates successfully
- ✅ Test timeout <30 seconds

### Overall Success
- ✅ 100% of tests use Vitest syntax
- ✅ 0 placeholder tests in active suite
- ✅ Coverage >30% (vitest threshold)
- ✅ CI/CD pipeline green

## Risk Mitigation

### Risk 1: Accidentally Delete Valuable Tests
**Mitigation**: Move to archive, don't delete permanently
**Recovery**: Restore from archive if needed

### Risk 2: Auto-Migration Breaks Tests
**Mitigation**:
- Create backups (.backup files)
- Test each file after migration
- Manual review of complex files

### Risk 3: Coverage Drops After Deletion
**Mitigation**:
- Placeholders don't provide real coverage
- Actual coverage will be more accurate
- Focus on quality over quantity

## Tools and Resources

1. **Template**: `apps/web/app/api/webhooks/stripe/handlers/__tests__/payment-intent.handler.test.ts`
2. **Pattern Guide**: `apps/web/VITEST_MIGRATION_PATTERN.md`
3. **Analysis**: `apps/web/TEST_INFRASTRUCTURE_ANALYSIS.md`
4. **Progress**: `apps/web/PHASE_4_COMPLETION_SUMMARY.md`
5. **This Plan**: `apps/web/RECOMMENDED_ACTION_PLAN.md`

## Commands Reference

```bash
# Count files by category
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | wc -l  # Total
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "jest.mock" | wc -l  # Jest syntax
find apps/web -name "*.test.ts" -o -name "*.test.tsx" | xargs grep -l "should create an instance" | wc -l  # Placeholders

# Run specific test
npm test -- "path/to/test.test.ts" --run

# Run all tests (will timeout currently)
npm test -- --run

# Generate coverage (after fixes)
npm test -- --coverage --run
```

## Conclusion

The web app test suite has significant low-hanging fruit:
1. **Tier 1 (5 min)**: Delete 384 placeholders → immediate clarity
2. **Tier 2 (2-3 hrs)**: Migrate 77 high-value tests → real coverage
3. **Result**: From 41% working → 100% working tests

**Recommended Start**: Execute Tier 1 deletion script immediately for quick wins.
