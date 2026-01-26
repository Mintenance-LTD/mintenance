# COMPREHENSIVE ACTION PLAN - Options 1-3

**Date**: 2026-01-22
**Current State**: Vitest migration complete, now addressing test quality and code quality
**Priority Order**: Based on impact and verification requirements

---

## CURRENT METRICS (VERIFIED)

### Web App
- ✅ Test files: 1,055 (after removing 384 placeholders)
- ✅ Vitest compatible: 100%
- ⚠️  Test failures: ~12-20% (test logic issues, not syntax)

### Mobile App
- Test files: 689
- Test infrastructure: Jest (working)
- Coverage: ~40-60% (from previous reports)

### Code Quality
- Files with `any` types: 933 files
- Files with `console.*`: 156 files
- Large files (>300 lines): Unknown (needs analysis)

---

## OPTION 1: FIX WEB APP TEST LOGIC ISSUES

**Goal**: Get web app test suite to 100% passing
**Duration**: 4-6 hours
**Impact**: High - enables CI/CD, improves confidence

### Phase 1A: Mock Configuration Fixes (1 hour)

**Issue**: Some mocks missing default exports or using wrong patterns

#### Tasks:
1. **Fix react-hot-toast mock** (HIGH PRIORITY)
   ```bash
   # Find all files using react-hot-toast
   grep -r "react-hot-toast" apps/web --include="*.test.ts*" | wc -l
   ```

   **Fix Pattern**:
   ```typescript
   // BEFORE (wrong)
   vi.mock('react-hot-toast');

   // AFTER (correct)
   vi.mock('react-hot-toast', () => ({
     default: {
       success: vi.fn(),
       error: vi.fn(),
       loading: vi.fn(),
     },
   }));
   ```

2. **Fix Supabase mock imports**
   - Pattern: Use `importOriginal` for partial mocks
   - Files affected: ~50-100 tests

3. **Fix Next.js navigation mocks**
   - `useRouter`, `useParams`, `useSearchParams`
   - Files affected: ~30-50 tests

#### Automation Script:
```javascript
// apps/web/fix-mock-configurations.js
const fs = require('fs');
const path = require('path');

const mockPatterns = {
  'react-hot-toast': `vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));`,

  'next/navigation': `vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));`,
};

// Apply fixes to all test files
```

#### Verification:
```bash
# Run subset of tests
npm test -- --run app/jobs/create/components/__tests__

# Expected: All mock-related failures resolved
```

---

### Phase 1B: Component Props & Data Fixes (2 hours)

**Issue**: Components expect props/data that tests don't provide

#### Tasks:
1. **Identify components with prop issues**
   ```bash
   # Run tests and capture errors
   npm test -- --run 2>&1 | grep "Cannot destructure" > prop-errors.txt
   npm test -- --run 2>&1 | grep "undefined" >> prop-errors.txt
   ```

2. **Create test data factories**
   ```typescript
   // apps/web/test/factories/index.ts
   export const mockContractor = {
     id: 'contractor-123',
     name: 'John Smith',
     rating: 4.8,
     reviews_count: 42,
     verified: true,
   };

   export const mockJob = {
     id: 'job-123',
     title: 'Fix leaking tap',
     category: 'plumbing',
     budget: 250,
     status: 'open',
   };

   export const mockUser = {
     id: 'user-123',
     email: 'test@example.com',
     role: 'homeowner',
   };
   ```

3. **Fix component tests systematically**
   - Start with most-used components
   - Apply factory pattern
   - Verify each fix

#### Automation Script:
```javascript
// apps/web/add-test-data-factories.js
// Scans tests, identifies missing props, adds factories
```

#### Verification:
```bash
npm test -- --run app/contractor/dashboard-enhanced/components/__tests__
# Expected: Component render without prop errors
```

---

### Phase 1C: Async/Timing Fixes (1 hour)

**Issue**: Race conditions, timeout issues, timing-dependent tests

#### Tasks:
1. **Fix async waitFor patterns**
   ```typescript
   // BEFORE (flaky)
   it('should load data', () => {
     render(<Component />);
     expect(screen.getByText('Data loaded')).toBeInTheDocument();
   });

   // AFTER (reliable)
   it('should load data', async () => {
     render(<Component />);
     await waitFor(() => {
       expect(screen.getByText('Data loaded')).toBeInTheDocument();
     });
   });
   ```

2. **Fix rate limiting tests**
   - Use `vi.useFakeTimers()` for time-dependent tests
   - Example: WeatherService rate limiting tests

3. **Fix cache expiration tests**
   - Mock `Date.now()` for deterministic timing

#### Verification:
```bash
npm test -- --run lib/services/weather/__tests__/WeatherService.test.ts
# Expected: All timing-related failures resolved
```

---

### Phase 1D: Validation & Reporting (30 minutes)

#### Tasks:
1. **Run full test suite**
   ```bash
   npm test -- --run --reporter=verbose 2>&1 | tee test-results.txt
   ```

2. **Generate metrics**
   ```bash
   # Count passing vs failing
   grep "✓" test-results.txt | wc -l  # Passing
   grep "✗" test-results.txt | wc -l  # Failing
   ```

3. **Create completion report**
   - Document all fixes applied
   - Show before/after metrics
   - List any remaining issues

#### Success Criteria:
- [ ] Test pass rate >90% (currently ~80%)
- [ ] Zero mock configuration errors
- [ ] Zero component prop errors
- [ ] All async tests stable

---

## OPTION 2: MOBILE APP TEST COVERAGE IMPROVEMENTS

**Goal**: Increase mobile test coverage from 40-60% to 80%+
**Duration**: 8-12 hours
**Impact**: Critical - mobile is customer-facing

### Phase 2A: Coverage Analysis (1 hour)

#### Tasks:
1. **Run coverage report**
   ```bash
   cd apps/mobile
   npm test -- --coverage --silent 2>&1 | tee coverage-report.txt
   ```

2. **Identify critical uncovered paths**
   ```bash
   # Parse coverage report
   node analyze-coverage.js
   ```

3. **Prioritize by criticality**
   - Payment flows: CRITICAL
   - Authentication: CRITICAL
   - Job posting: HIGH
   - Messaging: HIGH
   - Profile/Settings: MEDIUM

#### Output:
- `MOBILE_COVERAGE_GAPS.md` - Detailed gap analysis
- Priority list of files needing tests

---

### Phase 2B: Critical Path Tests (4 hours)

**Focus**: Payment, Auth, Job Posting

#### Tasks:
1. **Payment Flow Tests** (90 minutes)
   - Payment method addition
   - Payment creation
   - Payment confirmation
   - Refund processing
   - Edge cases (network errors, declined cards)

   **Target Coverage**: 85%+

2. **Authentication Tests** (90 minutes)
   - Login flow
   - Registration flow
   - Password reset
   - Biometric auth
   - Session management
   - MFA flows

   **Target Coverage**: 90%+

3. **Job Posting Tests** (90 minutes)
   - Create job flow
   - Photo upload
   - AI analysis integration
   - Budget calculation
   - Validation
   - Submission

   **Target Coverage**: 85%+

#### Automation:
```javascript
// apps/mobile/generate-critical-tests.js
// Uses AI to analyze uncovered code paths
// Generates test templates for each path
```

#### Verification:
```bash
npm test -- PaymentService.test.ts --coverage
# Expected: >85% coverage
```

---

### Phase 2C: Integration Tests (3 hours)

**Focus**: End-to-end user journeys

#### Tasks:
1. **Homeowner Journey**
   - Register → Create Job → Review Bids → Accept Bid → Pay → Complete
   - File: `__tests__/integration/HomeownerJourney.test.tsx`

2. **Contractor Journey**
   - Register → Verify → Browse Jobs → Submit Bid → Get Accepted → Complete Job → Get Paid
   - File: `__tests__/integration/ContractorJourney.test.tsx`

3. **Payment Journey**
   - Add Card → Create Payment → 3D Secure → Success → Refund
   - File: `__tests__/integration/PaymentJourney.test.tsx`

#### Verification:
```bash
npm test -- __tests__/integration/
# Expected: All journeys pass end-to-end
```

---

### Phase 2D: Service Layer Tests (2 hours)

**Focus**: Business logic in services

#### Tasks:
1. **JobService comprehensive tests**
   - CRUD operations
   - Search/filtering
   - Matching algorithm
   - Status transitions

2. **NotificationService tests**
   - Push notifications
   - In-app notifications
   - Notification preferences
   - Deep linking

3. **RealtimeService tests**
   - Subscription management
   - Event handling
   - Reconnection logic
   - Error recovery

#### Verification:
```bash
npm test -- src/services/ --coverage
# Expected: >80% service layer coverage
```

---

### Phase 2E: Coverage Validation (1 hour)

#### Tasks:
1. **Final coverage run**
   ```bash
   npm test -- --coverage --watchAll=false
   ```

2. **Generate report**
   ```bash
   node coverage-analysis.js > MOBILE_COVERAGE_FINAL_REPORT.md
   ```

3. **Compare before/after**
   - Before: ~40-60%
   - Target: 80%+

#### Success Criteria:
- [ ] Overall coverage >80%
- [ ] Critical paths >85%
- [ ] Services >80%
- [ ] Components >75%
- [ ] Zero flaky tests

---

## OPTION 3: CODE QUALITY VIOLATIONS

**Goal**: Fix `any` types and `console.*` statements
**Duration**: 12-20 hours
**Impact**: High - improves type safety, maintainability

### Phase 3A: Remove Console Statements (2 hours)

**Current**: 156 files with console statements
**Target**: 0 files

#### Tasks:
1. **Create logger migration script**
   ```javascript
   // scripts/replace-console-with-logger.js
   const fs = require('fs');

   function replaceConsole(filePath) {
     let content = fs.readFileSync(filePath, 'utf8');
     let modified = false;

     // Add logger import if needed
     if (content.includes('console.') && !content.includes('from \'@/utils/logger\'')) {
       content = `import { logger } from '@/utils/logger';\n${content}`;
       modified = true;
     }

     // Replace console.log -> logger.info
     content = content.replace(/console\.log\(/g, 'logger.info(');
     // Replace console.error -> logger.error
     content = content.replace(/console\.error\(/g, 'logger.error(');
     // Replace console.warn -> logger.warn
     content = content.replace(/console\.warn\(/g, 'logger.warn(');
     // Replace console.debug -> logger.debug
     content = content.replace(/console\.debug\(/g, 'logger.debug(');

     if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
       fs.writeFileSync(filePath, content);
       return true;
     }
     return false;
   }
   ```

2. **Run migration**
   ```bash
   # Find all files with console statements
   find . -name "*.ts" -o -name "*.tsx" | \
     xargs grep -l "console\." | \
     grep -v node_modules | \
     grep -v ".test.ts" > console-files.txt

   # Migrate each file
   cat console-files.txt | xargs node scripts/replace-console-with-logger.js
   ```

3. **Add ESLint rule to prevent regression**
   ```json
   // .eslintrc.js
   {
     "rules": {
       "no-console": ["error", { "allow": [] }]
     }
   }
   ```

#### Verification:
```bash
# Verify no console statements remain
find . -name "*.ts" -o -name "*.tsx" | \
  xargs grep -l "console\." | \
  grep -v node_modules | \
  grep -v ".test.ts" | \
  wc -l
# Expected: 0
```

---

### Phase 3B: Fix `any` Types (10-15 hours)

**Current**: 933 files with `any` types
**Target**: <50 files (critical business logic only)

#### Strategy:
1. **Tier 1: Auto-fixable** (3 hours)
   - Function return types
   - Array types
   - Object literals

2. **Tier 2: Type inference** (4 hours)
   - Parameters with obvious types
   - useState hooks
   - API responses

3. **Tier 3: Proper types** (6 hours)
   - Complex objects
   - Generic types
   - Union types

#### Tasks:

**Tier 1A: Function Return Types (1 hour)**
```typescript
// BEFORE
function calculateTotal(items: any) {
  return items.reduce((sum: any, item: any) => sum + item.price, 0);
}

// AFTER
interface Item {
  price: number;
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Script**:
```javascript
// scripts/fix-any-return-types.js
// Analyzes functions, infers return types from implementation
```

**Tier 1B: Array Types (1 hour)**
```typescript
// BEFORE
const jobs: any[] = [];

// AFTER
const jobs: Job[] = [];
```

**Script**:
```javascript
// scripts/fix-any-arrays.js
// Finds any[], infers type from usage
```

**Tier 1C: Object Literals (1 hour)**
```typescript
// BEFORE
const config: any = { timeout: 5000 };

// AFTER
interface Config {
  timeout: number;
}
const config: Config = { timeout: 5000 };
```

**Tier 2A: Hook Types (2 hours)**
```typescript
// BEFORE
const [data, setData] = useState<any>(null);

// AFTER
interface UserData {
  id: string;
  email: string;
}
const [data, setData] = useState<UserData | null>(null);
```

**Tier 2B: API Response Types (2 hours)**
```typescript
// BEFORE
const response: any = await fetch('/api/jobs');

// AFTER
interface JobsResponse {
  jobs: Job[];
  total: number;
}
const response: JobsResponse = await fetch('/api/jobs').then(r => r.json());
```

**Tier 3A: Create Type Definitions (3 hours)**
```typescript
// packages/types/src/index.ts
export interface Job {
  id: string;
  title: string;
  category: JobCategory;
  budget: number;
  status: JobStatus;
  created_at: string;
  homeowner_id: string;
}

export type JobCategory =
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'painting'
  | 'roofing';

export type JobStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
```

**Tier 3B: Apply Types Across Codebase (3 hours)**
- Import types from central location
- Replace `any` with proper types
- Fix type errors that emerge

#### Automation Strategy:
```bash
# 1. Generate type usage report
node scripts/analyze-any-types.js > any-types-report.json

# 2. Auto-fix Tier 1 (safe)
node scripts/fix-any-tier1.js

# 3. Review and fix Tier 2 (needs validation)
node scripts/fix-any-tier2.js --dry-run
# Review changes, then:
node scripts/fix-any-tier2.js

# 4. Manual Tier 3 (complex types)
# Use report to guide manual fixes
```

#### Verification:
```bash
# Count remaining any types
find . -name "*.ts" -o -name "*.tsx" | \
  xargs grep -o ": any\|any\[\]\|any\>" | \
  wc -l

# Run TypeScript compiler
npx tsc --noEmit

# Expected:
# - <50 any types remaining
# - Zero type errors
```

---

### Phase 3C: File Size Reduction (3 hours)

**Goal**: Reduce files >300 lines

#### Tasks:
1. **Identify large files**
   ```bash
   find . -name "*.ts" -o -name "*.tsx" | \
     xargs wc -l | \
     sort -rn | \
     head -n 50 > large-files.txt
   ```

2. **Refactor strategies**
   - Extract components
   - Extract utilities
   - Split services
   - Extract types

3. **Apply refactoring**
   - Focus on files >500 lines first
   - Use sub-agents for complex refactoring

#### Verification:
```bash
find . -name "*.ts" -o -name "*.tsx" | \
  xargs wc -l | \
  awk '$1 > 300 { count++ } END { print count }'
# Track reduction over time
```

---

## EXECUTION STRATEGY

### Recommended Order:
1. **Option 1 first** (4-6 hours) - Quick win, enables CI/CD
2. **Option 3A (Console)** (2 hours) - Easy, high impact
3. **Option 2** (8-12 hours) - Critical for mobile quality
4. **Option 3B (Any types)** (10-15 hours) - Long-term quality

### Total Time: 24-35 hours (3-4 full days)

---

## VERIFICATION REQUIREMENTS

For **every** phase, you must:

1. **Run actual commands**
   ```bash
   # Not: "This should work"
   # But: "Ran command X, output: Y"
   ```

2. **Show real output**
   ```bash
   $ npm test -- --run
   Test Files  1 passed (1)
   Tests       38 passed (38)
   ✅ VERIFIED
   ```

3. **Capture metrics**
   - Before counts
   - After counts
   - Difference

4. **Document evidence**
   - Command output
   - File diffs
   - Test results

---

## SUCCESS CRITERIA

### Option 1: Web Test Quality ✅
- [ ] Test pass rate >90%
- [ ] Zero mock errors
- [ ] Zero component prop errors
- [ ] All async tests stable
- [ ] Full test suite runs in <5 minutes

### Option 2: Mobile Coverage ✅
- [ ] Overall coverage >80%
- [ ] Critical paths >85%
- [ ] Integration tests pass
- [ ] Zero flaky tests
- [ ] Coverage report generated

### Option 3: Code Quality ✅
- [ ] Console statements: 156 → 0
- [ ] `any` types: 933 → <50
- [ ] Files >300 lines: tracked and reducing
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no warnings

---

## TOOLS TO CREATE

1. **fix-mock-configurations.js** - Auto-fix common mock patterns
2. **add-test-data-factories.js** - Generate test data factories
3. **replace-console-with-logger.js** - Console → logger migration
4. **fix-any-tier1.js** - Auto-fix simple any types
5. **analyze-any-types.js** - Generate any types usage report
6. **generate-critical-tests.js** - AI-powered test generation

---

## REPORTING

After each phase, create:
- `PHASE_X_COMPLETION_REPORT.md`
- Include actual metrics, commands run, evidence
- No false positives - everything verified

---

**Ready to begin? Which option would you like to start with?**
