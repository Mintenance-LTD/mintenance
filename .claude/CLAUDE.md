# CLAUDE MANDATORY DEVELOPMENT CONTRACT (MDC) - MINTENANCE CODEBASE

## CODE QUALITY AUDIT (Last audited: 2026-02-26)

**Current State: B- Grade (72/100) - FURTHER IMPROVED in Feb 26 session**

### Verified Metrics (measured, not estimated):
- **`any` types in source code: ~26 occurrences / 21 files** (down from 56 on Feb 13; excludes mocks, test-utils, __mocks__ dirs)
- **`console.*` in app code: ~27 total** (7 in web, 20 in mobile source; down from 42; web only in catch blocks/build-time)
- **Largest file: 905 lines** (apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts) - **0 files >1,000 lines** (down from 17 on Feb 13, then 1 on Feb 26 morning)
- **Build: PASSES clean** (Next.js production build; `ignoreBuildErrors: false` — TypeScript errors will fail the build)
- **TypeScript strict mode: ON** in all packages (web, mobile, shared, types) — confirmed in all tsconfig.json files
- **Web tests: ~178/183 suites PASS (~97%)** - Vitest v4 with globals:true; payment-flow and auth-flow failures fixed this session; ~4 pre-existing failures remain (rate-limiter, Card/Input mock, BudgetRangeSelector toast)
- **Mobile tests: 9,743/10,393 pass (93.8%)** - healthy test infrastructure (597 test files)
- **Security: CSRF protection, rate limiting, .env gitignored, RLS enabled** (334 tables with RLS, 806 policies)
- **Supabase imports: MOSTLY standardized** - 402 files use `@/lib/api/supabaseServer` BUT 10 files still use direct `createClient` from `@supabase/supabase-js` (see below)
- **API routes: withApiHandler() migration NEARLY COMPLETE** — 290/310 routes (93.5%) migrated; 20 remaining are intentional exceptions (18 cron jobs use `withCronHandler`, 1 Stripe webhook needs raw body, 1 OAuth callback)

### What Changed Since Feb 13 Audit:
| Metric | Feb 13 State | Feb 26 Actual | Change |
|--------|-------------|---------------|--------|
| Files >1,000 lines | **17** | **0** | ✅ All split (16 before Feb 26, +1 this session: OfflineManager.ts) |
| Largest file | **1,413 lines** (NotificationService.ts) | **905 lines** (AssessmentOrchestrator.ts) | ✅ Improved |
| withApiHandler routes | **2/249 (< 1%)** | **290/310 (93.5%)** | ✅ Effectively complete |
| `any` types | **56** | **~26** | ✅ Improved |
| `console.*` in app code | **42** | **~27** | ✅ Improved |
| Supabase imports | claimed "all standardized" | **10 files non-standard** | ❌ Never fully true |
| Web test failures | **7 failing** | **~4 failing** | ✅ payment-flow + auth-flow fixed this session |

### What Changed in Feb 26 Session (this session):
| Task | Before | After |
|------|--------|-------|
| OfflineManager.ts | **1,090 lines** | **300-line facade** + 5 modules in `offline/` subdir |
| SustainabilityEngine.ts | **945 lines** | **43-line facade** + 5 modules in `sustainability/` subdir |
| ResourceManagementService.ts | **978 lines** | **35-line facade** + 5 modules in `resource-management/` subdir |
| payment-flow test failures | **3 failing** | **0 failing** (fixed rate limit body, contracts mock, stripe.customers.list) |
| auth-flow test failures | **11 failing** | **0 failing** (fixed fetch mock, password selector, text assertions) |

### Real Priority Issues (as of 2026-02-26 end of session):
1. **HIGH**: Fix 10 files using non-standard direct `createClient` from `@supabase/supabase-js`:
   - `apps/web/app/api/auth/reset-password/route.ts`
   - `apps/web/app/contractor/card-editor/page.tsx`
   - `apps/web/app/contractor/gallery/page.tsx`
   - `apps/web/app/contractor/invoices/page.tsx`
   - `apps/web/app/contractor/profile/page.tsx`
   - `apps/web/app/contractor/quotes/[id]/page.tsx`
   - `apps/web/app/contractor/reporting/page.tsx`
   - `apps/web/app/contractor/[id]/page.tsx`
   - `apps/web/app/jobs/[id]/sign-off/page.tsx`
   - `apps/web/lib/database.ts`
2. **MEDIUM**: Split remaining large files (not yet split): AssessmentOrchestrator.ts (905), EscrowReleaseAgent.ts (886), ServiceRequestScreen.tsx (904), several ~800-850 line files
3. **MEDIUM**: Reduce ~26 remaining `any` types (top offenders: packages/security/src adapters, shared-ui DataTable)
4. **MEDIUM**: Fix ~4 remaining pre-existing test failures (rate-limiter fallback, Card/Input shared-ui mock, BudgetRangeSelector toast)
5. **LOW**: 27 console.* statements remaining across web (7) and mobile (20) source code

## SECTION 1: ABSOLUTE VERIFICATION REQUIREMENTS - NO FALSE RESULTS

### ZERO TOLERANCE FOR FALSE CLAIMS

**BEFORE making ANY claim, you MUST:**
1. **RUN the actual command** - No assumptions
2. **CAPTURE real output** - No summaries
3. **SHOW evidence** - No hiding failures
4. **VERIFY it works** - No theoretical fixes

**VERIFICATION PROTOCOL FOR EVERY CHANGE:**
```bash
# 1. Type check
npx tsc --noEmit [file] 2>&1

# 2. Lint check
npx eslint [file] 2>&1

# 3. Test check
npm test -- [file].test.ts 2>&1

# 4. Build check
npm run build 2>&1

# MUST show ALL outputs, even failures
```

## SECTION 2: MANDATORY CODE STANDARDS - BUILD WILL FAIL

### HARD LIMITS (NO EXCEPTIONS):
| Metric | Maximum | Current State (2026-02-26) | Priority |
|--------|---------|----------------------------|----------|
| File size | 300 lines | 905 lines max (0 files >1K; ~8 files 800-905 lines) | MEDIUM |
| Function size | 50 lines | 200-400+ line route handlers remain | MEDIUM |
| Class methods | 7 | Still large in some services | MEDIUM |
| `any` types (source) | 0 | ~26 occurrences / 21 files | MEDIUM |
| console.* (app code) | 0 | ~27 total (7 web, 20 mobile) | LOW |
| Web test suites | 80% pass | ~97% (~178/183) — Vitest v4 | OK |
| Mobile test coverage | 80% pass | 93.8% (9,743/10,393) | OK |
| withApiHandler | 100% routes | 93.5% (290/310; 20 intentional exceptions) | OK |
| Supabase canonical import | 100% files | ~98% (10 files use direct createClient) | HIGH |

## SECTION 3: MANDATORY SUB-AGENT USAGE RULES

### CRITICAL: Sub-Agent Invocation Requirements

#### 1. Codebase Context Analyzer (MANDATORY - MUST BE CALLED FIRST)
**YOU MUST** invoke the `codebase-context-analyzer` agent BEFORE:
- Fixing any bug (no matter how small)
- Modifying any feature
- Adding new functionality
- Refactoring existing code
- Making performance optimizations
- Addressing security issues
- Making any database changes
- Modifying API endpoints
- Changing component behavior
- Updating styles or UI elements
- Modifying configuration files
- Changing business logic

**How to invoke:**
```
Use Task tool with subagent_type: "general-purpose"
Prompt: "Act as the codebase-context-analyzer agent defined in .claude/agents/codebase-context-analyzer.md. Analyze [specific area/bug/feature] in the mintenance codebase and provide a comprehensive context analysis following the exact structured format specified in the agent definition. Include all sections: Scope Summary, Current Implementation, Dependencies Map, Similar Patterns, Risk Analysis, Recommended Approach, and Additional Context."
```

#### 2. Specialized Agent Usage Rules

**ALWAYS** use the appropriate specialized agent for domain-specific work:

- **UI/UX work** → `ui-designer` agent (AFTER context analyzer)
- **Testing** → `testing-specialist` agent (AFTER implementation)
- **Security** → `security-expert` agent (WITH context analyzer for security issues)
- **Performance** → `performance-optimizer` agent (AFTER context analyzer)
- **Mobile** → `mobile-developer` agent (AFTER context analyzer for mobile changes)
- **Frontend** → `frontend-specialist` agent (AFTER context analyzer for React/TypeScript)
- **DevOps** → `devops-engineer` agent (FOR deployment/CI/CD issues)
- **Database** → `database-architect` agent (AFTER context analyzer for DB changes)
- **API Design** → `api-architect` agent (AFTER context analyzer for API work)
- **Property Assessment** → `ai-building-engineer` or `building-surveyor-ai` agent

#### 3. Multi-Agent Workflow (MANDATORY SEQUENCE)

For ANY code modification, follow this exact sequence:

1. **FIRST (ALWAYS)**: `codebase-context-analyzer` - Get full context and impact analysis
2. **SECOND**: Relevant specialized agent(s) - Implementation based on context
3. **THIRD**: `testing-specialist` - Verify changes don't break anything
4. **FINAL**: `codebase-context-analyzer` - Final review before marking complete

**Example for bug fix:**
```
1. Context Analyzer → "Analyze authentication bug in login flow"
2. Frontend Specialist → "Fix the bug following context analyzer recommendations"
3. Testing Specialist → "Write/update tests for the fix"
4. Context Analyzer → "Final review of authentication bug fix"
```

#### 4. Parallel Agent Execution

When multiple independent analyses are needed, run agents in parallel:
```
Single message with multiple Task tool invocations:
- Task 1: Context analysis for area A
- Task 2: Security review for area B
- Task 3: Performance check for area C
```

#### 5. Agent Review Requirements

**BEFORE marking any task complete or committing code:**
1. Run `codebase-context-analyzer` for final review
2. Ensure ALL recommendations from agents were followed
3. Document any deviations with justification
4. Verify no new issues were introduced
5. Confirm all existing tests still pass
6. Check that new tests were added if needed

#### 6. No Exceptions Policy

**NEVER skip agent invocation**, even for:
- "Simple" one-line fixes (often have hidden dependencies)
- "Urgent" hotfixes (proper analysis prevents cascading failures)
- "Obvious" changes (context reveals non-obvious impacts)
- "Documentation only" changes (may affect API contracts)
- "Style only" changes (may break component rendering)
- "Config only" changes (may affect multiple environments)

#### 7. Agent Output Integration

**YOU MUST**:
- Read ENTIRE agent output before proceeding
- Follow ALL recommendations unless technically impossible
- Document in code comments WHY if you deviate
- Include agent insights in commit messages
- Reference specific risks identified by agents
- Create TODOs for any deferred recommendations

#### 8. Failure Protocol

If an agent identifies HIGH RISK or recommends NOT proceeding:
1. STOP immediately
2. Present the risks to the user
3. Get explicit approval before continuing
4. Document the decision in the code

### ENFORCEMENT RULES

1. **Any code change without context analysis = INCOMPLETE TASK**
2. **Any bug fix without testing verification = POTENTIAL REGRESSION**
3. **Any feature without specialized agent review = TECHNICAL DEBT**
4. **Any deployment without final review = PRODUCTION RISK**

### COMMIT MESSAGE FORMAT

All commits MUST include agent analysis reference:
```
fix: [issue description]

Context Analysis: [key findings from context analyzer]
Implementation: [approach taken based on agent recommendations]
Testing: [verification performed]
Risk: [any remaining risks identified]

Reviewed by: codebase-context-analyzer
Specialized agents: [list of other agents used]
```

## PROJECT-SPECIFIC RULES

### Database Commands
- npx supabase db diff --local

### Code Quality Requirements
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files (*.md) unless explicitly requested
- ALWAYS use agents to understand existing patterns before adding new code

### Mintenance-Specific Contexts
- This is a multi-tenant platform for property maintenance
- Web app (Next.js) and Mobile app (React Native) share code
- Supabase backend with PostgreSQL and Row Level Security
- Stripe integration for payments
- Real-time features via Supabase subscriptions
- Three user types: homeowners, contractors, admin

### CANONICAL JOB LIFECYCLE WORKFLOW (Updated 2026-02-14)

This is the complete user workflow from job creation to payment. All features MUST respect this flow.

**Phase 1: Job Creation (Homeowner)**
1. Homeowner navigates to `/jobs/create`
2. Fills in: title, description, category, urgency, location, budget range, photos
3. `POST /api/jobs` creates job with status `posted`
4. System notifies nearby contractors (within radius) via notifications table

**Phase 2: Bidding (Contractors)**
5. Contractors see job on dashboard / get notification
6. Contractor views job details at `/contractor/jobs/[id]`
7. Contractor submits bid: amount, message, estimated timeline
8. `POST /api/jobs/[id]/bids` creates bid with status `pending`
9. PricingAgent scores bid competitiveness (optional AI feature)
10. Homeowner receives notification of new bid

**Phase 3: Bid Acceptance (Homeowner)**
11. Homeowner views bids on job page `/jobs/[id]`
12. Homeowner accepts a bid → `POST /api/jobs/[id]/bids/[bidId]/accept`
13. Winning bid status → `accepted`, all other bids → `rejected`
14. Job status → `assigned`, `contractor_id` set on job
15. System auto-creates draft contract (`contracts` table, status `draft`)
16. System auto-creates message thread between homeowner and contractor

**Phase 4: Contract Signing (Both Parties)**
17. Both parties view contract at `/jobs/[id]` (ContractManagement component)
18. Homeowner signs → contract status `pending_contractor`
19. Contractor signs → contract status `pending_homeowner` (or `accepted` if homeowner already signed)
20. Both signed → contract status `accepted`
21. `POST /api/contracts/[id]/sign` handles signing logic

**Phase 5: Payment into Escrow (Homeowner)**
22. After contract accepted, homeowner sees "Pay Now" button
23. `POST /api/jobs/[id]/payment-intent` creates Stripe PaymentIntent
24. Homeowner completes payment via Stripe Elements
25. `POST /api/jobs/[id]/confirm-payment` confirms payment
26. Escrow record created: status `pending` → `held`
27. Contractor notified that payment is secured in escrow

**Phase 6: Job Start (Contractor) - REQUIRES PHOTO EVIDENCE**
28. Contractor navigates to `/contractor/jobs/[id]`
29. JobPhotoUpload component shows "Upload Before Photos" mode
30. Contractor takes/uploads photos of current damage (uses device camera or gallery)
31. `POST /api/jobs/[id]/photos/before` uploads to Supabase Storage
32. PhotoVerificationService validates quality (brightness, sharpness, resolution)
33. Geolocation captured from browser (Haversine distance check, 100m threshold)
34. Photos stored in `job_photos_metadata` table with `photo_type: 'before'`
35. "Start Job" button becomes enabled (requires >= 1 before photo)
36. Contractor clicks "Start Job" → `POST /api/jobs/[id]/start`
37. API validates: contractor assigned, status is `assigned`, before photos exist
38. Job status: `assigned` → `in_progress`
39. Homeowner notified: "Work has started on your job"

**Phase 7: Work Execution (Contractor)**
40. Contractor performs physical work at the property
41. Can communicate with homeowner via message thread

**Phase 8: Job Completion (Contractor) - AUTO-TRIGGERED BY PHOTOS**
42. Contractor returns to `/contractor/jobs/[id]`
43. JobPhotoUpload component shows "Upload After Photos" mode
44. Contractor takes/uploads photos of completed work
45. `POST /api/jobs/[id]/photos/after` uploads to Supabase Storage
46. PhotoVerificationService validates quality + category-specific requirements
47. Photos stored in `job_photos_metadata` with `photo_type: 'after'`
48. **Auto-completion triggers**: job status `in_progress` → `completed`, `completed_at` set
49. Homeowner notified: "Job Completed - Review Required" with link to job page

**Phase 9: Homeowner Review (Homeowner)**
50. Homeowner navigates to `/jobs/[id]`
51. HomeownerPhotoReview component renders with BeforeAfterSlider
52. Draggable slider shows before photo overlaid on after photo for comparison
53. If multiple photo pairs: thumbnail navigation to cycle through them
54. **Option A - Approve**: Homeowner clicks "Approve Work"
55. `POST /api/jobs/[id]/confirm-completion` sets `completion_confirmed_by_homeowner: true`
56. Triggers escrow release process
57. **Option B - Request Changes**: Homeowner clicks "Request Changes"
58. Textarea appears for comments describing needed fixes
59. `POST /api/jobs/[id]/request-changes` creates notification to contractor
60. Contractor notified with homeowner's comments and link back to job
61. **Safety net**: If homeowner doesn't respond within 7 days, auto-release triggers

**Phase 10: Payment Release (System)**
62. After homeowner approval (or 7-day timeout):
63. Escrow status: `held` → `release_pending`
64. System calculates platform fee (percentage of job amount)
65. Stripe Transfer created to contractor's connected account
66. Escrow status: `release_pending` → `released`
67. Contractor notified: "Payment released for [job title]"
68. Homeowner notified: "Payment processed for [job title]"

**Phase 11: Review (Both Parties - Optional)**
69. Both parties can leave star ratings (1-5) and text reviews
70. Reviews stored in reviews table linked to job
71. Contractor's average rating updated on profile
72. Homeowner's rating tracked for contractor reference
73. Job lifecycle complete

**Key Status Transitions:**
```
Job:     posted → assigned → in_progress → completed
Bid:     pending → accepted/rejected
Contract: draft → pending_X → accepted
Escrow:  pending → held → release_pending → released
```

**Enforcement Gates:**
- Can't start job without before photos (`/api/jobs/[id]/start` checks `job_photos_metadata`)
- Job completion auto-triggered by after photo upload (no manual "complete" button)
- Payment release requires homeowner approval (with 7-day auto-release safety net)
- Contract must be signed by both parties before payment
- Escrow must be funded before job can start

## VERIFICATION CHECKLIST

Before ANY code is written or modified:
- [ ] Context Analyzer has been run
- [ ] Dependencies have been mapped
- [ ] Similar patterns have been identified
- [ ] Risks have been assessed
- [ ] Specialized agent has reviewed (if applicable)
- [ ] Testing strategy is defined
- [ ] Impact on other components is understood

This is NOT optional. These rules ensure code quality, prevent regressions, and maintain consistency across the entire mintenance platform.

## QUALITY ENFORCEMENT RULES

### NO SHORTCUTS POLICY
- NEVER assume success without verification
- ALWAYS run actual commands/tests to verify claims
- NEVER report "would work" - only report "did work"
- ALWAYS show actual output/results, not theoretical outcomes
- NEVER mark tasks complete without evidence

### VERIFICATION REQUIREMENTS
Before ANY status report:
- [ ] Run the actual test/build/command
- [ ] Capture and show REAL output
- [ ] Verify with multiple methods when possible
- [ ] Check edge cases, not just happy path
- [ ] Document any failures honestly

### BANNED PHRASES (without proof)
NEVER use these without actual verification:
- "should work"
- "would fix"
- "appears to be"
- "likely resolves"
- "seems correct"
- "looks good"
- "probably works"

ALWAYS use evidence-based language:
- "verified by running X, output: [actual output]"
- "test output shows Y: [actual results]"
- "confirmed with Z: [specific evidence]"
- "ran [command], result: [actual result]"

## MANDATORY VERIFICATION PROTOCOL

For ANY claim about code/system state:
1. Use Read tool to show actual code (with line numbers)
2. Use Bash tool to run actual commands (show full output)
3. Use Grep/Glob to prove file existence (show results)
4. Use testing tools to verify functionality (show test output)

**NEVER rely on assumptions or memory**
**ALWAYS verify with actual file/command output**

### AGENT OUTPUT REQUIREMENTS

ALL agent responses MUST include:
- **Evidence**: Actual file paths, line numbers, code snippets
- **Verification**: Commands run and their output
- **Limitations**: What was NOT checked
- **Confidence**: Low/Medium/High with justification

**Example of GOOD agent report:**
✅ "Found 3 instances in [auth.ts:42](auth.ts#L42), verified by grep output: [shows actual grep results]"
✅ "Ran `npm test`, all 47 tests passed: [shows test summary]"
✅ "Checked 5 files, found issue in 2: [lists specific files and line numbers]"

**Example of BAD agent report:**
❌ "Should be fixed" (no evidence, no verification)
❌ "All tests pass" (didn't actually run tests)
❌ "No issues found" (didn't show what was checked)
❌ "Implementation complete" (didn't verify functionality)

## ANTI-BIAS RULES

### Completeness Bias Prevention
- NEVER report "all tests pass" without running them and showing output
- NEVER claim "no issues found" without thorough scan and listing what was checked
- NEVER say "implementation complete" without verification of functionality
- ALWAYS list what was NOT checked, untested scenarios, potential edge cases

### Optimism Bias Prevention
- Report failures FIRST, successes second
- Assume code is broken until proven working
- List risks before benefits
- Show actual errors in full, don't summarize or hide them
- Highlight what could still go wrong

### Shortcut Detection
If you're tempted to:
- Skip a verification step → STOP, run it anyway
- Assume based on file name → STOP, read the actual file
- Mark complete based on plan → STOP, verify actual outcome
- Summarize errors → STOP, show full error output
- Say "looks good" → STOP, define what "good" means and verify it

## POST-TASK AUDIT (MANDATORY)

After EVERY task, before marking complete:

### Audit Questions (answer with evidence):
1. **What EXACTLY did I change?** (show diffs with git diff or file comparison)
2. **What did I run to verify?** (show command output verbatim)
3. **What could still be broken?** (list untested scenarios)
4. **What assumptions did I make?** (list and challenge each one)
5. **What would prove me wrong?** (then run that test)

### Audit Checklist:
- [ ] Re-read original request - did I answer it precisely?
- [ ] Run relevant tests - show actual output (not summary)
- [ ] Check for side effects - verify related code still works
- [ ] Look for edge cases - test at least one explicitly
- [ ] Verify file changes - use git diff or Read tool to confirm
- [ ] List what was NOT verified - be explicit about gaps

### Evidence Requirements
Every completion report MUST include:
1. **Commands Run**: Exact commands with full output
2. **Files Modified**: List with git diff or before/after comparison
3. **Tests Executed**: Test names and results (pass/fail counts)
4. **Verification Method**: How you confirmed it works
5. **Remaining Risks**: What could still fail
6. **Not Tested**: Scenarios that were NOT verified

### Example of COMPLETE Task Report:
```
✅ Task: Fix authentication bug in login flow

Evidence:
- Modified: apps/web/src/lib/auth.ts (lines 42-56)
- Verified with: git diff apps/web/src/lib/auth.ts
- Ran: npm test -- auth.test.ts
- Result: 12/12 tests passed
- Edge cases tested: empty password, SQL injection, XSS
- Not tested: rate limiting, OAuth flows
- Remaining risk: Password reset flow not verified

Commands executed:
$ npm test -- auth.test.ts
PASS apps/web/src/__tests__/auth.test.ts
  ✓ validates email format (23 ms)
  ✓ rejects empty password (18 ms)
  [... full output ...]

$ git diff apps/web/src/lib/auth.ts
[shows actual diff]
```

## FAILURE REPORTING REQUIREMENTS

When something doesn't work:
1. Show the FULL error message (not summarized)
2. Show the exact command that failed
3. Show relevant file contents that may be causing issue
4. List what you tried that didn't work
5. Explain what you don't understand
6. Ask for clarification rather than guessing

NEVER say "there's an error" - ALWAYS show the actual error.
NEVER say "it failed" - ALWAYS show why it failed.
NEVER hide errors to appear more competent.