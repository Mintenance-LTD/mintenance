# Test Fixes - Next Steps Guide
**Current Status**: 93.2% pass rate (1,290/1,384 tests passing)
**Remaining**: 94 failing tests across ~38 test suites
**Target**: 95%+ pass rate (33 more tests to fix)

---

## 🎯 Quick Wins (2-3 hours to 95%)

### 1. Fix Remaining Service Mock Chains (Est: 1-2 hours)

**Pattern**: Tests with incomplete Supabase mock chains

**Files to Fix** (based on similar patterns):
```bash
src/__tests__/services/JobService.simple.test.ts
src/__tests__/services/MeetingService.test.ts
src/__tests__/services/OfflineManager.simple.test.ts
src/services/marketing-management/__tests__/*.test.ts (various)
src/services/client-management/__tests__/*.test.ts (various)
```

**Solution**: Add missing methods to mock chains
```typescript
// Example: If test fails with "method is not a function"
const mockChain = {
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  // ADD MISSING METHOD HERE (check service code for what it calls)
  single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
};
```

**Verification Template**:
```bash
cd apps/mobile && npm test -- [ServiceName].test.ts
# Look for "X is not a function" errors
# Add that method to the mock chain
# Re-run test
```

---

### 2. Fix Duplicate Logger Issues (Est: 1 hour)

**Pattern**: Tests with `jest.requireActual` causing duplicate logger import

**Files with This Issue**:
```bash
src/__tests__/services/RealAIAnalysisService.test.ts
src/services-v2/__tests__/index.test.ts
src/services/ml-training/__tests__/MLTrainingPipelineService.test.ts
src/services/ml-training/__tests__/OnlineLearningService.test.ts
src/services/__tests__/IntegrationTestService.test.ts
```

**Solution**: Remove `jest.requireActual` pattern
```typescript
// BEFORE (WRONG):
jest.mock('../../services/MyService', () => ({
  MyService: {
    ...jest.requireActual('../../services/MyService').MyService,
    initialize: jest.fn(),
  }
}));

// AFTER (CORRECT):
// FIXED: Removed service mock - testing real service with mocked dependencies
import { MyService } from '../../services/MyService';
```

**Already Applied Successfully To**:
- RealtimeService (30 tests fixed)
- RealtimeService.simple (9 tests fixed)
- NotificationService.test (21 tests fixed)

---

### 3. Add Mock Data for Null/Undefined Access (Est: 30-45 minutes)

**Pattern**: Tests accessing properties of undefined/null mock responses

**Example Errors**:
```
Cannot read properties of undefined (reading 'mockResolvedValue')
Cannot read properties of null (reading 'id')
```

**Solution**: Ensure all mocks return proper data structures
```typescript
// BEFORE:
const mockChain = {
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// AFTER:
const mockData = {
  id: 'test-id',
  // ... all required fields
};
const mockChain = {
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
};
```

---

## 📋 Systematic Approach

### Step 1: Identify Error Pattern (5 minutes)
```bash
cd apps/mobile
npm test -- [TestFile].test.ts 2>&1 | grep "TypeError\|Error:"
```

### Step 2: Apply Known Fix (5-10 minutes)
- **"is not a function"** → Add method to mock chain
- **"is not a constructor"** → Change to named import
- **"Duplicate declaration"** → Remove jest.requireActual
- **"Cannot read properties"** → Add mock data

### Step 3: Verify Fix (2 minutes)
```bash
npm test -- [TestFile].test.ts 2>&1 | tail -20
# Should see: "Tests: X passed, X total"
```

### Step 4: Commit with Evidence (3 minutes)
```bash
git add [file]
git commit -m "test: fix [TestFile] - [issue] (+X tests)

Issue: [specific error]
Fix: [what was changed]
Verification: npm test -- [TestFile].test.ts
Result: PASS - X/X tests passing
"
```

---

## 🔧 Tools and Commands

### Find Tests with Specific Error
```bash
cd apps/mobile
grep -l "specific error text" coverage-run.txt | head -10
```

### Test Specific File
```bash
cd apps/mobile
npm test -- [TestName].test.ts 2>&1 | tail -30
```

### Count Passing Tests in File
```bash
cd apps/mobile
npm test -- [TestName].test.ts 2>&1 | grep "Tests:"
```

### Find Files with Pattern
```bash
cd apps/mobile
find src -name "*.test.ts" | xargs grep -l "pattern" | head -20
```

---

## 📊 Progress Tracking

### Current Status
- **Tests Passing**: 1,290 / 1,384 (93.2%)
- **Tests Failing**: 94
- **Target**: 1,317+ passing (95%)
- **Need to Fix**: 33 more tests

### Estimated Time to Milestones

| Milestone | Tests Needed | Est. Time | Cumulative |
|-----------|--------------|-----------|------------|
| **94% pass** | +14 tests | 1 hour | 1 hour |
| **95% pass** | +33 tests | 2-3 hours | 3-4 hours |
| **96% pass** | +47 tests | 4-5 hours | 7-9 hours |
| **97% pass** | +61 tests | 6-8 hours | 13-17 hours |

---

## 🎯 Prioritized Task List

### Priority 1: Quick Wins (2-3 hours to 95%)
- [ ] Fix mock chain methods in 10 service tests (1-2 hours)
- [ ] Fix 5 duplicate logger issues (1 hour)
- [ ] Add mock data for 5 null access tests (30-45 min)

### Priority 2: Medium Effort (additional 3-4 hours to 97%)
- [ ] Fix remaining mock antipatterns (15 tests, 2 hours)
- [ ] Fix export mismatches (10 tests, 1 hour)
- [ ] Fix test environment issues (8 tests, 1-2 hours)

### Priority 3: Complex Issues (additional 4-6 hours to 98%+)
- [ ] Deep logger import chain issues (10 tests, 2-3 hours)
- [ ] Service integration test fixes (8 tests, 2-3 hours)
- [ ] Edge cases and timing issues (6 tests, 1-2 hours)

---

## 💡 Pro Tips

### 1. Batch Similar Fixes
If you find one test with "X is not a function", search for all tests with same error:
```bash
grep -l "X is not a function" coverage-run.txt | xargs ls -la
```

### 2. Use Existing Patterns
Look at successfully fixed tests for patterns:
- RealtimeService.test.ts - Mock antipattern removal
- ContractorService.simple.test.ts - Added .or() method
- NotificationService.test.ts - mockNotifications casting
- ClientRepository.test.ts - Named import fix

### 3. Verify Before Claiming Success
Always run the actual test and capture output. No assumptions!

### 4. Document as You Go
Each commit should include:
- What was broken
- What was fixed
- Actual test output showing PASS
- Number of tests fixed

---

## 🚀 Example Workflow

**Fixing JobService.simple.test.ts** (15 failing tests):

```bash
# 1. Run test to see error
cd apps/mobile
npm test -- JobService.simple.test.ts 2>&1 | grep "TypeError"
# Output: "TypeError: supabase.from(...).upsert is not a function"

# 2. Fix: Add upsert to mock chain
# Edit: src/__tests__/services/JobService.simple.test.ts
# Add: upsert: jest.fn().mockReturnThis(),

# 3. Verify
npm test -- JobService.simple.test.ts 2>&1 | tail -10
# Output: "Tests: 15 passed, 15 total"

# 4. Commit with evidence
git add src/__tests__/services/JobService.simple.test.ts
git commit -m "test: fix JobService.simple - add missing upsert method (+15 tests)

Issue: TypeError: supabase.from(...).upsert is not a function
Fix: Added upsert method to mock chain
Verification: npm test -- JobService.simple.test.ts
Result: PASS - 15/15 tests passing

Impact: +15 tests (93.2% → 94.3% pass rate)
"

# 5. Track progress
echo "Progress: 1,305 / 1,384 (94.3%)" >> PROGRESS.txt
```

---

## 📈 Success Metrics

### Definition of Done (95% Pass Rate)
- ✅ 1,317+ tests passing (current: 1,290)
- ✅ <70 tests failing (current: 94)
- ✅ All quick wins completed
- ✅ Comprehensive documentation updated

### Beyond 95% (Stretch Goals)
- 🎯 **96%**: 1,330+ passing (40 more tests)
- 🎯 **97%**: 1,344+ passing (54 more tests)
- 🎯 **98%**: 1,357+ passing (67 more tests)
- 🌟 **99%**: 1,370+ passing (80 more tests)

---

## 🤝 Getting Help

### If Stuck on a Test
1. **Check coverage-run.txt** for original error
2. **Search similar patterns** in already-fixed tests
3. **Use WebSearch** for Jest/testing patterns
4. **Apply specialized agent** (testing-specialist) for complex issues

### If Unsure About Fix
1. **Run test before and after** to see difference
2. **Check service implementation** to understand what's called
3. **Look at similar working tests** for patterns
4. **Commit small** - easy to revert if needed

---

## 📚 Reference Materials

### Key Files Created This Session
1. **[TEST_FIXES_FINAL_SESSION_REPORT.md](./TEST_FIXES_FINAL_SESSION_REPORT.md)** - Complete summary
2. **[TEST_COVERAGE_PLAN.md](./TEST_COVERAGE_PLAN.md)** - Long-term strategy
3. **[apps/mobile/test/mocks/supabaseMockFactory.ts](./apps/mobile/test/mocks/supabaseMockFactory.ts)** - Reusable mocks
4. **[TEST_FIXES_NEXT_STEPS.md](./TEST_FIXES_NEXT_STEPS.md)** - This guide

### Successful Fix Patterns
- **Mock Antipattern**: Remove jest.requireActual → +54 tests
- **Repository Imports**: Named imports → +24 tests
- **Supabase Methods**: Add missing methods → +8 tests
- **Type Casting**: Cast mocked modules → +21 tests

---

## ✅ Quick Checklist

Before starting new fixes:
- [ ] Read this guide completely
- [ ] Check current pass rate baseline
- [ ] Identify error pattern
- [ ] Look for similar fixed tests
- [ ] Prepare verification commands

For each fix:
- [ ] Identify specific error
- [ ] Apply known pattern
- [ ] Run actual test
- [ ] Capture output
- [ ] Commit with evidence
- [ ] Update progress tracking

---

**Last Updated**: January 24, 2026
**Current Pass Rate**: 93.2% (1,290/1,384)
**Next Milestone**: 95% (33 more tests)
**Estimated Time**: 2-3 hours with this guide

**Remember**: Evidence-based approach, no false positives, verify every claim! 🎯
