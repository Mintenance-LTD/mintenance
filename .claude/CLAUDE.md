# CLAUDE MANDATORY DEVELOPMENT CONTRACT (MDC) - MINTENANCE CODEBASE

## ⚠️ CRITICAL: CODE QUALITY CATASTROPHE DETECTED

**Current State: F Grade (35/100) - IMMEDIATE ACTION REQUIRED**
- 1,054 line functions (52x over limit)
- 1,700 `any` types (should be 0)
- 3,189 console statements (should be 0)
- <10% test coverage (should be 80%)

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
| Metric | Maximum | Current Violation | Priority |
|--------|---------|-------------------|----------|
| File size | 300 lines | 1,200 lines (4x) | CRITICAL |
| Function size | 50 lines | 1,054 lines (21x) | CRITICAL |
| Class methods | 7 | 33 methods (5x) | HIGH |
| `any` types | 0 | 1,700 | CRITICAL |
| console.* | 0 | 3,189 | CRITICAL |
| Test coverage | 80% | <10% | CRITICAL |

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