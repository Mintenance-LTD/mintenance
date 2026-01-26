# Mobile Test Coverage Improvement - Phase 2 Scope of Work

**Date**: 2026-01-23
**Previous Phase**: Mock Antipattern Elimination (11 services completed)
**Current State**: 8.47% line coverage (VERIFIED via actual coverage report)
**Target State**: 15-20% coverage with focus on critical business logic

---

## EXECUTIVE SUMMARY

### ✅ Phase 1 Complete (Mock Antipattern Elimination)
- **Services Fixed**: 11 critical services
- **Commits**: 9 comprehensive commits
- **Test Pass Rate**: ~98% (280+ tests passing)
- **Coverage Improvement**: 0% → 70-100% for fixed services
- **Quality Grade**: F (35/100) → C+ (65/100)

### 📊 VERIFIED CURRENT METRICS (Actual Coverage Report)
```json
{
  "lines": {"total": 30639, "covered": 2596, "pct": 8.47},
  "statements": {"total": 32360, "covered": 2692, "pct": 8.31},
  "functions": {"total": 7929, "covered": 441, "pct": 5.56},
  "branches": {"total": 18828, "covered": 1341, "pct": 7.12}
}
```

**CRITICAL**: Only 441 out of 7,929 functions are covered (5.56%)

---

## VERIFIED ANALYSIS: REMAINING WORK

### Files Analyzed with ACTUAL Evidence (Not Assumptions)

Using codebase-context-analyzer agent, I analyzed the remaining test files and found:

**Total Files Analyzed**: 10
**Files with Mock Antipattern**: 2 (20%)
**Files Already Correct**: 7 (70%)
**File Not Found**: 1 (10%)

### Priority 1: CRITICAL - Fix Mock Antipattern (VERIFIED)

#### 1.1 JobMatchingService.test.ts
**File**: `apps/mobile/src/__tests__/services/JobMatchingService.test.ts`
**Lines**: 595
**Mock Antipattern**: **YES** (VERIFIED at lines 13-74)
**Evidence**:
```typescript
// Lines 13-74: Mocks the ContractorService itself
jest.mock('../../services/ContractorService', () => {
  return {
    ContractorService: {
      findNearbyContractors: jest.fn(),
      findContractorsBySkills: jest.fn(),
      // ... mocking the service being tested
    },
  };
});
```
**Test Count**: 41 tests across 10 describe blocks
**Priority**: **CRITICAL** - This tests business logic (matching algorithm)
**Effort**: 2-3 hours
**Expected Coverage Gain**: +3-5%

---

#### 1.2 RealtimeService.test.ts
**File**: `apps/mobile/src/__tests__/services/RealtimeService.test.ts`
**Lines**: 641
**Mock Antipattern**: **YES (PARTIAL)** (VERIFIED at lines 13-19)
**Evidence**:
```typescript
// Lines 13-19: Partial mock of service itself
jest.mock('../../services/RealtimeService', () => ({
  RealtimeService: {
    ...jest.requireActual('../../services/RealtimeService').RealtimeService,
    initialize: jest.fn(),  // Overrides real methods
    cleanup: jest.fn(),
  }
}));
```
**Test Count**: 29 tests across 12 describe blocks
**Current Status**: 11 tests FAILING (verified from coverage run)
**Priority**: **HIGH** - Real-time features critical for UX
**Effort**: 2-3 hours
**Expected Coverage Gain**: +2-4%

---

#### 1.3 RealtimeService.simple.test.ts
**File**: `apps/mobile/src/__tests__/services/RealtimeService.simple.test.ts`
**Lines**: 274
**Mock Antipattern**: **YES (PARTIAL)** (VERIFIED - same pattern as above)
**Test Count**: 10 tests across 6 describe blocks
**Priority**: **HIGH** - Duplicate of above, may merge/remove
**Effort**: 1 hour
**Expected Coverage Gain**: +1%

---

### Priority 2: Already Correct Pattern (Verify Coverage) ✅

The following files ALREADY use correct patterns (verified by agent analysis) but may need additional tests to increase coverage:

#### High Priority - Core Features (Verified Correct Pattern)
1. **BidService.test.ts** (625 lines, 37 tests) ✅
   - **Business Criticality**: CRITICAL - Handles contractor bidding (money/contracts)
   - **Pattern Status**: Correct (mocks only Supabase, AsyncStorage)
   - **Action Needed**: Verify actual coverage %, add tests if <60%
   - **Estimated Effort**: 1-2 hours

2. **UserService.test.ts** (923 lines, 24 tests) ✅
   - **Business Criticality**: HIGH - User profile management
   - **Pattern Status**: Correct (mocks only Supabase, AsyncStorage, logger)
   - **Action Needed**: Verify actual coverage %, add profile update/validation tests
   - **Estimated Effort**: 1-2 hours

3. **OfflineManager.test.ts** (325 lines, 11 tests) ✅
4. **OfflineManager.simple.test.ts** (345 lines, 8 tests) ✅
5. **OfflineManager.backoff.test.ts** (844 lines, 42 tests) ✅
   - **Business Criticality**: HIGH - Mobile offline sync reliability
   - **Pattern Status**: Correct (mocks NetInfo, AsyncStorage, queryClient, services)
   - **Action Needed**: Verify combined coverage across 3 files
   - **Estimated Effort**: 2-3 hours (if coverage gaps found)

#### Medium Priority - Additional Services
6. **JobSheetOperationsService.test.ts** (525 lines, 23 tests) ✅
   - **Business Criticality**: MEDIUM - Job sheet management
   - **Pattern Status**: Correct (mocks Supabase, serviceHelper, serviceHealthMonitor)
   - **Action Needed**: Verify coverage % for form operations
   - **Estimated Effort**: 1-2 hours

**These files already mock only external dependencies (Supabase, AsyncStorage, NetInfo, etc.)**

---

### Priority 3: Comprehensive Test Files (Unknown Pattern Status)

The following comprehensive test files exist but have NOT been analyzed yet for mock antipattern:

1. **PaymentFlows.comprehensive.test.ts**
   - **Business Criticality**: CRITICAL - End-to-end payment flows
   - **Pattern Status**: UNKNOWN (needs analysis)
   - **Action Needed**: Analyze for antipattern, verify coverage
   - **Estimated Effort**: 2-3 hours

2. **NotificationService.comprehensive.test.ts**
   - **Business Criticality**: MEDIUM - Notification delivery
   - **Pattern Status**: UNKNOWN (needs analysis)
   - **Action Needed**: Analyze for antipattern, verify coverage
   - **Estimated Effort**: 1-2 hours

3. **JobService.comprehensive.test.ts**
   - **Business Criticality**: HIGH - Job CRUD operations
   - **Pattern Status**: UNKNOWN (needs analysis)
   - **Action Needed**: Analyze for antipattern, verify coverage
   - **Estimated Effort**: 1-2 hours

4. **UserService.comprehensive.test.ts**
   - **Business Criticality**: HIGH - User management flows
   - **Pattern Status**: FILE NOT FOUND (verified by agent)
   - **Action Needed**: Confirm if file exists or was moved
   - **Estimated Effort**: N/A

**Total Potential Effort**: 4-7 hours (if antipatterns found)

---

### Summary: Remaining Service Tests (20+ Files)

#### Verified Analysis Complete (10 files):
- **Mock Antipattern Found**: 3 files (JobMatchingService, RealtimeService × 2)
- **Correct Pattern**: 6 files (BidService, UserService, OfflineManager × 3, JobSheetOperations)
- **File Not Found**: 1 file (UserService.comprehensive)

#### Needs Analysis (4+ files):
- **Comprehensive Tests**: PaymentFlows, NotificationService, JobService comprehensive tests
- **Other Services**: ~10+ additional service test files not yet analyzed

#### Total Estimated Work Remaining:
- **Fix Antipatterns**: 3 files, 5-7 hours
- **Verify Coverage**: 6 files, 4-8 hours
- **Analyze Comprehensives**: 4 files, 4-7 hours
- **TOTAL**: 13-22 hours to complete all remaining service tests

---

## 🔍 BEST PRACTICES RESEARCH FINDINGS (WebSearch)

### Key Findings from 2025 React Native Testing Guides:

1. **Mock External Dependencies Only**
   - Mock APIs, AsyncStorage, native modules, and side-effect-prone dependencies
   - Prevents flaky tests and ensures reliable test runs
   - Source: React Native Testing Guide 2025

2. **Meaningful Coverage Over Percentage**
   - Focus on critical paths rather than hitting 100% line coverage
   - High coverage doesn't always mean high-quality tests
   - Source: Jest TypeScript Best Practices 2025

3. **Isolation Benefits**
   - Mocking services keeps tests fast, focused, and free from external dependencies
   - Tests shouldn't fail because external API goes down
   - Source: Microsoft ISE Developer Blog

4. **Service Layer Testing Pattern**
   - For PaymentService that depends on PaymentGateway, mock the gateway only
   - Test the service logic in isolation
   - Source: Jest Mocking Best Practices 2025

---

## PHASE 2 EXECUTION PLAN - THREE OPTIONS

### Option 1: Continue Mock Antipattern Elimination (RECOMMENDED)

**Focus**: Fix antipatterns in critical services + verify coverage on correct-pattern services
**Effort**: 10-15 hours
**Coverage Gain**: +8-15% (projected)

#### Part A: Fix Mock Antipatterns (5-7 hours)
1. **JobMatchingService** (2-3 hours) - CRITICAL
   - Remove ContractorService mock (lines 13-74)
   - Keep AsyncStorage and logger mocks
   - Add Supabase mock for contractor queries
   - Verify all 41 tests execute real matching logic
   - VERIFICATION: Run coverage report, confirm >60% coverage

2. **RealtimeService.test.ts** (2-3 hours) - HIGH
   - Remove partial service mock (lines 13-19)
   - Keep Supabase, logger, AsyncStorage mocks
   - Fix 11 failing tests
   - Add proper channel subscription mocks
   - VERIFICATION: All 29 tests passing, confirm >50% coverage

3. **RealtimeService.simple.test.ts** (1 hour) - HIGH
   - Apply same pattern as above
   - Consider merging with main RealtimeService test
   - VERIFICATION: All 10 tests passing

#### Part B: Verify Coverage on Correct Pattern Services (5-8 hours)
4. **BidService** (1-2 hours) - CRITICAL for contractor bidding
   - Pattern already correct ✅
   - ACTION: Run coverage report to get actual %
   - If <60%, add bid validation, acceptance, rejection tests
   - VERIFICATION: Coverage >60%

5. **UserService** (1-2 hours) - HIGH for user management
   - Pattern already correct ✅
   - ACTION: Run coverage report to get actual %
   - If low, add profile update, validation, role management tests
   - VERIFICATION: Coverage >60%

6. **OfflineManager** (2-3 hours) - HIGH for mobile offline support
   - Pattern already correct ✅ (3 test files combined)
   - ACTION: Run coverage report across all 3 files
   - If gaps found, add sync conflict resolution, retry logic tests
   - VERIFICATION: Combined coverage >60%

7. **JobSheetOperationsService** (1 hour) - MEDIUM
   - Pattern already correct ✅
   - ACTION: Verify coverage % for form operations
   - VERIFICATION: Coverage check only

**Deliverables**:
- 3 antipattern files fixed
- 4 services with verified >60% coverage
- 6-8 commits with detailed evidence
- Coverage report showing 8.47% → 15-20%

---

### Option 2: Run Full Coverage Report & Prioritize (INVESTIGATIVE)

**Focus**: Get actual coverage metrics across ALL services, identify biggest gaps
**Effort**: 3-5 hours
**Coverage Gain**: 0% (analysis only, but informs all future work)

#### Tasks:
1. **Generate HTML Coverage Report** (30 min)
   ```bash
   npm test -- --coverage --coverageReporters=html,json-summary
   ```
   - Open HTML report in browser
   - Identify files with 0% coverage
   - Sort by uncovered line count

2. **Analyze Service Layer Coverage** (1 hour)
   - Extract coverage % for each service from JSON
   - Create spreadsheet: Service | Lines | Covered | % | Priority
   - Identify services with 0% coverage

3. **Business Criticality Assessment** (1 hour)
   - Map services to business features:
     - Money/Payments: CRITICAL
     - User Auth/Profile: CRITICAL
     - Job Matching: HIGH
     - Notifications: MEDIUM
     - Analytics: LOW
   - Create priority matrix: Coverage Gap × Business Impact

4. **Analyze Comprehensive Test Files** (1-2 hours)
   - Use codebase-context-analyzer on:
     - PaymentFlows.comprehensive.test.ts
     - NotificationService.comprehensive.test.ts
     - JobService.comprehensive.test.ts
   - Check for mock antipatterns
   - Verify actual coverage contribution

5. **Create Phase 3 Roadmap** (30 min)
   - Top 10 files to fix (by ROI)
   - Estimated effort per file
   - Projected coverage gains
   - Risk assessment

**Deliverables**:
- HTML coverage report (interactive)
- Service coverage spreadsheet (all services)
- Priority matrix (criticality × gap)
- Phase 3 roadmap with specific targets
- Comprehensive test file analysis

**Why This Option**:
- Prevents wasted effort on low-impact files
- Identifies hidden 0% coverage services
- Data-driven prioritization for Phase 3+
- May discover services we haven't analyzed yet

---

### Option 3: Focus on Critical Business Logic (TARGETED)

**Focus**: Ensure all money/contract/core features have >60% coverage
**Effort**: 8-12 hours
**Coverage Gain**: +10-15% (projected, focused on high-value code)

#### Targets (Business-Critical Services Only):

1. **BidService** (2-3 hours) - Money/Contracts
   - Pattern already correct ✅
   - ACTION: Run coverage, verify actual %
   - Add tests for:
     - Bid amount validation (min/max)
     - Bid acceptance flow
     - Bid rejection flow
     - Multiple bids per job
     - Bid expiration
   - VERIFICATION: Coverage >70% (higher bar for money-related code)

2. **JobMatchingService** (3-4 hours) - Core Algorithm
   - Has mock antipattern ❌
   - ACTION: Fix antipattern + comprehensive coverage
   - Add tests for:
     - Location-based matching
     - Skills-based matching
     - Availability matching
     - Rating/reputation factors
     - Edge cases (no matches, multiple matches)
   - VERIFICATION: Coverage >70%

3. **OfflineManager** (2-3 hours) - Mobile Reliability
   - Pattern already correct ✅ (3 files)
   - ACTION: Verify combined coverage
   - Add tests for:
     - Sync conflict resolution
     - Retry backoff logic
     - Queue management
     - Network state transitions
     - Data integrity
   - VERIFICATION: Coverage >65%

4. **RealtimeService** (2-3 hours) - Real-time Features
   - Has partial antipattern ⚠️
   - ACTION: Fix antipattern + real-time edge cases
   - Add tests for:
     - Subscription management
     - Message delivery
     - Connection drops/reconnects
     - Multiple channel handling
   - VERIFICATION: Coverage >60%, all tests passing

**Deliverables**:
- 4 critical services with >60-70% coverage
- All money/contract code thoroughly tested
- Coverage report: 8.47% → 18-22% (focused on critical paths)
- 4-6 commits with evidence
- Risk assessment for production deployment

**Why This Option**:
- Highest business value per hour
- Reduces risk in money-handling code
- Improves mobile reliability (offline support)
- Ensures core matching algorithm works correctly

---

## VERIFICATION REQUIREMENTS (MANDATORY)

### For EVERY claim, you MUST:

1. **Run Actual Commands**
   ```bash
   # Before starting work
   npm test -- [file].test.ts --coverage

   # After making changes
   npm test -- [file].test.ts --coverage

   # Show FULL output, not summary
   ```

2. **Capture Real Output**
   - Save coverage JSON: `coverage/coverage-summary.json`
   - Show actual test results (X/Y tests passing)
   - Display actual error messages if failures occur

3. **Show Evidence**
   - Read actual file with line numbers
   - Show exact lines that changed
   - Git diff to prove modifications
   - Before/after coverage comparison

4. **No Theoretical Results**
   - ❌ NEVER say "should increase coverage"
   - ✅ ALWAYS say "coverage increased from X% to Y% (verified by running npm test --coverage)"

   - ❌ NEVER say "would fix the issue"
   - ✅ ALWAYS say "fixed the issue, confirmed by test output: [actual output]"

---

## AGENT USAGE REQUIREMENTS (MANDATORY)

### 1. Use codebase-context-analyzer BEFORE making changes

For EVERY file you modify:
```
Use Task tool with subagent_type: "general-purpose"
Prompt: "Act as the codebase-context-analyzer agent. Analyze [ServiceName]
in the mintenance codebase. Provide comprehensive context including current
implementation, dependencies, similar patterns, and risk analysis."
```

### 2. Use testing-specialist AFTER implementation

After fixing tests:
```
Use Task tool with subagent_type: "testing-specialist"
Prompt: "Review the test changes for [ServiceName]. Verify test quality,
coverage adequacy, and identify any missing edge cases."
```

### 3. WebSearch for Problems

If stuck for >15 minutes:
```
Use WebSearch tool
Query: "Jest TypeScript [specific error message] React Native 2025"
```

**Example**:
- Error: "TypeError: X is not a function"
- WebSearch: "Jest TypeScript TypeError is not a function mock React Native 2025"

---

## SUCCESS CRITERIA

### Minimum Viable (End of Phase 2)
- [ ] 3 files with mock antipattern fixed
- [ ] All tests passing (verified by actual test run)
- [ ] Coverage: 8.47% → 12%+ (verified by coverage report)
- [ ] 3 commits with evidence-based messages

### Stretch Goal
- [ ] 4-5 services with >60% coverage each
- [ ] Coverage: 8.47% → 15%+ (verified)
- [ ] HTML coverage report generated
- [ ] Prioritization matrix for Phase 3

---

## RISK MITIGATION

### Risk 1: Tests Don't Execute Real Code After Fix
**Mitigation**:
- Run coverage report IMMEDIATELY after changes
- Add temporary console.log to service methods
- Verify console output appears in test run
- Remove console.log before committing

### Risk 2: Breaking Existing Passing Tests
**Mitigation**:
- Use codebase-context-analyzer BEFORE making changes
- Run tests BEFORE and AFTER modifications
- Git diff to verify only intended changes
- Keep external dependency mocks intact

### Risk 3: Coverage Doesn't Increase as Expected
**Mitigation**:
- Compare coverage JSON before/after
- Identify which lines are still uncovered
- Add targeted tests for uncovered branches
- Use HTML coverage report to visualize gaps

---

## DELIVERABLES

### Code
1. Fixed test files (3-5 services)
2. Before/after coverage reports
3. Git commits with evidence

### Documentation
1. This SOW
2. Coverage improvement report with actual numbers
3. Lessons learned / patterns discovered

### Metrics (ALL VERIFIED)
1. Coverage reports (before/after JSON)
2. Test pass rates (actual command output)
3. Lines covered per service (from coverage JSON)
4. Commits with git log evidence

---

## OUT OF SCOPE

### Not Included in Phase 2:
- ❌ Fixing component/screen tests
- ❌ E2E/integration tests
- ❌ Performance testing
- ❌ Achieving >20% coverage (requires Phase 3+)
- ❌ Refactoring service implementations

### Future Work (Phase 3):
- Add coverage CI gate (2 hours)
- Fix remaining 20+ test files (15-20 hours)
- Component testing (10-15 hours)
- E2E test suite (20-30 hours)

---

## RECOMMENDED APPROACH

### Recommended: Option 2 FIRST, Then Option 1 or 3

**Why Start with Option 2** (Full Coverage Analysis):
1. **Prevents Wasted Effort**: Identifies actual coverage gaps before fixing
2. **Data-Driven**: Makes informed decisions based on real metrics
3. **Low Risk**: Analysis only, no code changes
4. **ROI Clarity**: Shows which services give highest coverage gain per hour
5. **Uncovers Unknowns**: May find services with 0% coverage we haven't analyzed

**After Option 2, Choose Based on Data**:

If analysis shows many antipatterns → **Option 1** (Systematic elimination)
- More predictable effort
- Proven pattern from Phase 1
- Good for 3-5 services with antipatterns

If analysis shows low coverage on critical services → **Option 3** (Targeted)
- Highest business value
- Focus on money/core features
- Good when antipatterns are rare

### Alternative: Option 3 for Immediate Business Value

**If you need quick risk reduction** (production concerns):
- Start with Option 3 (Critical Business Logic)
- Ensures BidService (money) and JobMatching (core) are solid
- Can do Option 2 analysis later for Phase 3 planning

### Not Recommended: Option 1 First

**Why not start with Option 1**:
- We've only analyzed 10 files; may be missing bigger issues
- BidService/UserService already have correct pattern but unknown coverage %
- Better to verify coverage first, then decide if antipattern fix is priority
- Could spend 7 hours on antipatterns when real issue is missing tests

**Recommended Sequence**:
```
Session 1 (3-5 hours):  Option 2 (Analysis) → Get full picture
Session 2 (8-15 hours): Option 1 or 3 (based on Session 1 findings)
Session 3 (10-15 hours): Complete remaining high-priority items
```

---

## NEXT STEPS (IMMEDIATE)

### If user approves Option 1:

1. **Use codebase-context-analyzer** for JobMatchingService
2. **Remove mock antipattern** from JobMatchingService
3. **Run coverage report** and show actual results
4. **Commit with evidence**
5. Repeat for RealtimeService files

### If user approves Option 2:

1. **Generate HTML coverage report**
2. **Analyze top uncovered files**
3. **Create prioritization matrix**
4. **Present findings with evidence**

### If user approves Option 3:

1. **Run coverage for BidService** (verify current %)
2. **Fix JobMatchingService antipattern**
3. **Fix RealtimeService antipattern**
4. **Verify UserService coverage**
5. **Add tests to reach >60% for all 4**

---

## VERIFICATION CHECKLIST (Before Starting Work)

- [ ] Codebase-context-analyzer run for target service
- [ ] Current coverage % recorded (actual JSON)
- [ ] Current test pass rate recorded (actual output)
- [ ] Dependencies mapped
- [ ] Similar patterns identified
- [ ] Risks assessed
- [ ] WebSearch for any unknowns

## VERIFICATION CHECKLIST (Before Marking Complete)

- [ ] Coverage report re-run (new JSON)
- [ ] Coverage improvement calculated (old % → new %)
- [ ] All tests passing (actual output shown)
- [ ] Git diff reviewed
- [ ] Commit message includes evidence
- [ ] Agent recommendations followed
- [ ] No console.log left in code
- [ ] TodoWrite updated with completion

---

**LET'S BEGIN WITH VERIFIED, EVIDENCE-BASED IMPROVEMENTS.**
