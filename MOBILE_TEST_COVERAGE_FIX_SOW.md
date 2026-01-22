# Mobile Test Coverage Fix - Scope of Work

**Date**: 2026-01-22
**Objective**: Fix mobile test suite to achieve 60%+ actual code coverage
**Current State**: 0.13% coverage (tests mock everything, don't execute production code)
**Target State**: 60% coverage on critical services, 40% overall within this session

---

## SCOPE BREAKDOWN

### Phase 1: Infrastructure Setup (1 hour)
**Goal**: Set up tools and validation

#### Tasks:
1. Create test quality validation script
2. Add coverage baseline snapshot
3. Create test template for proper testing
4. Document testing best practices

**Deliverables**:
- `scripts/validate-test-quality.js` - Detects mock-only tests
- `TESTING_BEST_PRACTICES.md` - Guide for writing real tests
- `apps/mobile/test-template.test.ts` - Template with proper patterns

**Success Criteria**:
- ✅ Can identify which tests are mock-only
- ✅ Have template for hybrid mock/real tests
- ✅ Coverage baseline documented

---

### Phase 2: Critical Services Fix (8-12 hours)
**Goal**: Fix top 3 critical services to 60% coverage

#### 2A: PaymentService (3-4 hours)
**Priority**: 🔴 CRITICAL (handles money)

**Current**: 0/214 lines (0%)
**Target**: 130/214 lines (60%)

**Test Areas**:
1. **Amount Validation** (30 min)
   - Positive numbers only
   - Maximum limits
   - Currency conversion (dollars → cents)
   - Decimal handling

2. **Payment Intent Creation** (1 hour)
   - Success flow
   - Stripe API errors
   - Network timeout handling
   - Retry logic

3. **Payment Confirmation** (1 hour)
   - Success flow
   - Card declined scenarios
   - 3DS authentication
   - Error handling

4. **Refund Processing** (1 hour)
   - Full refund
   - Partial refund
   - Already refunded error
   - Refund validation

5. **Payment Method Management** (30 min)
   - Add payment method
   - List payment methods
   - Delete payment method
   - Default payment method

**Files to Modify**:
- `src/__tests__/services/PaymentService.test.ts` - Rewrite with real logic tests
- `src/services/PaymentService.ts` - May discover bugs during testing

**Estimated Lines Covered**: ~130 lines

---

#### 2B: AuthService (2-3 hours)
**Priority**: 🔴 CRITICAL (handles security)

**Current**: 0/131 lines (0%)
**Target**: 80/131 lines (60%)

**Test Areas**:
1. **Login Flow** (45 min)
   - Valid credentials
   - Invalid credentials
   - Account lockout after failed attempts
   - Session creation

2. **Registration** (45 min)
   - Valid data
   - Duplicate email
   - Password strength validation
   - Email verification trigger

3. **Session Management** (30 min)
   - Token validation
   - Token refresh
   - Token expiration
   - Logout (session cleanup)

4. **Password Reset** (30 min)
   - Request reset
   - Validate reset token
   - Update password
   - Rate limiting

5. **Multi-Factor Authentication** (30 min)
   - Enable MFA
   - Verify MFA code
   - Disable MFA
   - Backup codes

**Files to Modify**:
- `src/__tests__/services/AuthService.test.ts` - Rewrite
- `src/services/AuthService.ts` - Bug fixes as needed

**Estimated Lines Covered**: ~80 lines

---

#### 2C: JobService (2-3 hours)
**Priority**: 🟠 HIGH (core feature)

**Current**: 0/19 lines (0%)
**Target**: 12/19 lines (60%)

**Note**: JobService is only 19 lines, likely a facade. Will test actual implementation files.

**Test Areas**:
1. **Job CRUD** (1 hour)
   - Create job with validation
   - Read job by ID
   - Update job fields
   - Delete job (soft delete)

2. **Job Status Transitions** (1 hour)
   - Draft → Published
   - Published → In Progress
   - In Progress → Completed
   - Invalid transitions blocked

3. **Job Search/Filter** (1 hour)
   - By location
   - By category
   - By budget range
   - By date range

**Files to Modify**:
- `src/__tests__/services/JobService.test.ts`
- `src/__tests__/services/JobCRUDService.test.ts` - Rewrite
- `src/__tests__/services/JobSearchService.test.ts` - Rewrite

**Estimated Lines Covered**: ~200 lines across all job-related services

---

### Phase 3: Service Layer Expansion (6-8 hours)
**Goal**: Bring overall coverage to 40%

**Services to Fix** (in order):
1. **ContractorService** (2 hours) - 0/147 lines → 90 lines (60%)
2. **MessagingService** (2 hours) - 0/159 lines → 95 lines (60%)
3. **NotificationService** (2-3 hours) - 0/363 lines → 145 lines (40%)
4. **BidService** (1 hour) - Add real tests for bidding logic

**Estimated Total Lines**: ~330 additional lines

---

### Phase 4: Utilities & Hooks (2-3 hours)
**Goal**: Test utility functions and hooks

**Files to Fix**:
1. **Logger** (30 min)
   - Fix 9 failing tests (console.info → console.log)
   - Test sanitization logic
   - Test error formatting

2. **Cache Utility** (1 hour)
   - Set/get operations
   - TTL expiration
   - Cache invalidation
   - Memory limits

3. **Circuit Breaker** (1 hour)
   - Success tracking
   - Failure threshold
   - Half-open state
   - Reset logic

4. **Hooks** (30 min)
   - useAuth
   - useJobs
   - useNetworkState

**Estimated Lines**: ~150 lines

---

## EXECUTION PLAN

### Session 1 (Current) - 4 hours
**Focus**: Phase 1 + Phase 2A (PaymentService)

1. ✅ Infrastructure setup (1 hour)
2. ✅ Fix PaymentService tests (3 hours)

**Expected Coverage After**: ~10% (PaymentService is large)

---

### Session 2 - 3 hours
**Focus**: Phase 2B + 2C

1. ✅ Fix AuthService tests (2 hours)
2. ✅ Fix JobService tests (1 hour)

**Expected Coverage After**: ~15-20%

---

### Session 3 - 4 hours
**Focus**: Phase 3 (first 2 services)

1. ✅ Fix ContractorService (2 hours)
2. ✅ Fix MessagingService (2 hours)

**Expected Coverage After**: ~25-30%

---

### Session 4 - 4 hours
**Focus**: Phase 3 (remaining) + Phase 4

1. ✅ Fix NotificationService (2 hours)
2. ✅ Fix BidService (1 hour)
3. ✅ Fix utilities & hooks (1 hour)

**Expected Coverage After**: ~35-40%

---

## TOTAL EFFORT ESTIMATE

| Phase | Hours | Coverage Gain |
|-------|-------|---------------|
| Phase 1: Infrastructure | 1 | 0% (setup) |
| Phase 2A: PaymentService | 3-4 | +10% |
| Phase 2B: AuthService | 2-3 | +5% |
| Phase 2C: JobService | 2-3 | +5% |
| Phase 3: Service Layer | 6-8 | +10% |
| Phase 4: Utils & Hooks | 2-3 | +5% |
| **TOTAL** | **16-22 hours** | **35-40%** |

**Stretch Goal**: 60% coverage (additional 8-10 hours)

---

## SUCCESS CRITERIA

### Minimum Viable (End of Session 1)
- ✅ PaymentService: 60% coverage
- ✅ Infrastructure for quality testing in place
- ✅ Template and documentation complete

### Phase 2 Complete (End of Session 2)
- ✅ PaymentService: 60%+ coverage
- ✅ AuthService: 60%+ coverage
- ✅ JobService: 60%+ coverage
- ✅ Overall: 15-20% coverage

### Phase 3 Complete (End of Session 3)
- ✅ Top 5 services: 60%+ coverage each
- ✅ Overall: 25-30% coverage

### Final Goal (End of Session 4)
- ✅ Overall: 35-40% coverage
- ✅ All critical paths tested
- ✅ No mock-only tests remaining

---

## RISK MITIGATION

### Risk 1: Tests Take Longer Than Estimated
**Mitigation**:
- Focus on critical paths first
- Skip edge cases if time-constrained
- Document skipped tests for future work

### Risk 2: Discover Major Bugs in Services
**Mitigation**:
- Log bugs but don't fix during test writing
- Create bug tickets for separate work
- Use `.skip()` for tests that expose unfixable bugs

### Risk 3: Coverage Doesn't Increase as Expected
**Mitigation**:
- Run coverage after each test file
- Verify production code is executing (add console.log temporarily)
- Check for additional mocking preventing execution

---

## DELIVERABLES

### Code
1. ✅ Fixed test files (8-10 services)
2. ✅ Test infrastructure scripts
3. ✅ Test template file

### Documentation
1. ✅ This SOW
2. ✅ TESTING_BEST_PRACTICES.md
3. ✅ Coverage progression report
4. ✅ Known issues / bugs discovered

### Metrics
1. ✅ Coverage reports (before/after)
2. ✅ Lines covered per service
3. ✅ Test execution time
4. ✅ Number of real vs mock-only tests

---

## OUT OF SCOPE

### Not Included in This Work:
- ❌ E2E/integration tests (separate effort)
- ❌ Component/screen tests (visual testing)
- ❌ Performance testing
- ❌ Bug fixes discovered during testing (logged separately)
- ❌ Achieving 80% coverage (requires 40-60 total hours)

### Future Work:
- Add coverage CI gate (2 hours)
- Fix remaining 400+ test files (30-40 hours)
- Add E2E test suite (20-30 hours)
- Component visual regression tests (10-15 hours)

---

## STARTING NOW

### Immediate Next Steps:
1. ✅ Create test quality validator
2. ✅ Create testing best practices doc
3. ✅ Create test template
4. ✅ Start PaymentService test fixes

**Let's begin with Phase 1...**
