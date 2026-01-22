# MANDATORY VERIFICATION RULES - NO FALSE RESULTS POLICY

## CRITICAL: THESE RULES PREVENT FALSE REPORTING

**Every claim MUST be verified with actual evidence. NO EXCEPTIONS.**

---

## 1. NO FALSE RESULTS RULE - ABSOLUTE ZERO TOLERANCE

### BANNED PHRASES (NEVER USE WITHOUT PROOF):
❌ "This should work"
❌ "This will fix the issue"
❌ "Tests pass" (without running them)
❌ "No errors found" (without checking)
❌ "Implementation complete" (without verification)
❌ "Successfully refactored" (without testing)
❌ "Performance improved" (without metrics)

### REQUIRED EVIDENCE-BASED LANGUAGE:
✅ "Verified by running [command], output: [actual output]"
✅ "Confirmed with [tool], result: [specific result]"
✅ "Tested with [specific test], outcome: [actual outcome]"
✅ "Measured using [metric], value: [actual measurement]"

---

## 2. VERIFICATION PROTOCOL FOR EVERY CHANGE

### BEFORE CLAIMING ANYTHING WORKS:

```bash
# 1. COMPILE CHECK
npx tsc --noEmit path/to/file.ts
# MUST show actual output or "FAILED TO VERIFY"

# 2. LINT CHECK
npx eslint path/to/file.ts
# MUST show actual warnings/errors or "0 problems"

# 3. TEST CHECK (if tests exist)
npm test -- path/to/file.test.ts
# MUST show actual pass/fail count

# 4. RUNTIME CHECK (for critical changes)
node -e "require('./file.js')"
# MUST show no errors or actual error message

# 5. GREP VERIFICATION (for refactoring)
grep -n "oldPattern" file.ts
# MUST show "no matches" or line numbers
```

### VERIFICATION CHECKLIST FOR EVERY TASK:
- [ ] Did I run the actual command?
- [ ] Did I capture the real output?
- [ ] Did I check for side effects?
- [ ] Did I verify the fix actually works?
- [ ] Did I document what wasn't tested?

---

## 3. PROOF OF WORK REQUIREMENTS

### FOR EVERY CODE CHANGE:

```markdown
## Change Made:
File: [exact path]
Lines: [exact line numbers]
Change: [exact description]

## Verification Performed:
1. Command: `[exact command run]`
   Output: `[actual output, not summarized]`

2. Test: `[test command]`
   Result: `[actual test output]`

3. Build: `[build command]`
   Status: `[actual status]`

## What Was NOT Verified:
- [List anything not checked]
- [Be honest about gaps]
```

---

## 4. FALSE POSITIVE PREVENTION

### BEFORE REPORTING AN ERROR:

1. **Verify it's real:**
```bash
# Don't just grep, actually compile
npx tsc --noEmit file.ts 2>&1 | grep "error TS"
# Show the ACTUAL error, not assumption
```

2. **Check context:**
```bash
# Read surrounding code
head -n 20 file.ts
tail -n 20 file.ts
# Understand before claiming error
```

3. **Test the fix:**
```bash
# After fixing, verify it works
npm test
npm run build
# Show actual success/failure
```

---

## 5. MUTATION TESTING FOR VERIFICATION

### INSERT INTENTIONAL ERRORS TO VERIFY TESTS WORK:

```typescript
// Original code
function add(a: number, b: number) {
  return a + b;
}

// Mutation test - break it intentionally
function add(a: number, b: number) {
  return a - b; // WRONG on purpose
}

// Run test - MUST fail
npm test -- add.test.ts
// If test passes with broken code = TEST IS FAKE
```

---

## 6. TRACEABILITY REQUIREMENTS

### EVERY CLAIM MUST HAVE:

1. **Source:** Where did you read/check this?
2. **Command:** What exact command verified it?
3. **Output:** What was the actual output?
4. **Timestamp:** When was this checked?
5. **Confidence:** HIGH (verified) / MEDIUM (partial) / LOW (assumed)

### EXAMPLE:
```markdown
CLAIM: "Fixed the logger syntax error"
SOURCE: packages/services/src/base/BaseService.ts:29
COMMAND: grep -n "logger.error" packages/services/src/base/BaseService.ts
OUTPUT: Line 29: logger.error('Service error occurred:', error, { service: 'general' });
VERIFIED: npx tsc --noEmit packages/services/src/base/BaseService.ts
RESULT: No TypeScript errors
CONFIDENCE: HIGH
```

---

## 7. REGRESSION TESTING AFTER CHANGES

### AFTER EVERY REFACTORING:

```bash
# 1. Run existing tests
npm test 2>&1 | tee test-output.txt
# MUST show actual pass/fail counts

# 2. Check for new TypeScript errors
npx tsc --noEmit 2>&1 | tee tsc-output.txt
# MUST show actual error count

# 3. Check for new ESLint issues
npx eslint . 2>&1 | tee eslint-output.txt
# MUST show actual warning/error count

# 4. Verify application still builds
npm run build 2>&1 | tee build-output.txt
# MUST show success or actual errors
```

---

## 8. PERFORMANCE VERIFICATION

### BEFORE CLAIMING "IMPROVED PERFORMANCE":

```javascript
// MEASURE BEFORE
console.time('operation');
oldFunction();
console.timeEnd('operation');
// Output: operation: 1234ms

// MEASURE AFTER
console.time('operation');
newFunction();
console.timeEnd('operation');
// Output: operation: 567ms

// CALCULATE
Improvement = ((1234 - 567) / 1234) * 100 = 54% faster
// ONLY claim improvement with actual numbers
```

---

## 9. COVERAGE VERIFICATION

### BEFORE CLAIMING TEST COVERAGE:

```bash
# Run actual coverage report
npm test -- --coverage 2>&1
# MUST show:
# - Statements: XX%
# - Branches: XX%
# - Functions: XX%
# - Lines: XX%

# For specific file
npm test -- --coverage file.test.ts
# Show actual percentages, not estimates
```

---

## 10. ANTI-HALLUCINATION RULES

### FORBIDDEN BEHAVIORS:
❌ Making up test results
❌ Assuming code works without running it
❌ Claiming files exist without checking
❌ Reporting success without verification
❌ Hiding errors to appear competent

### REQUIRED BEHAVIORS:
✅ Always run actual commands
✅ Always show real output
✅ Always admit when something fails
✅ Always list what wasn't checked
✅ Always provide reproduction steps

---

## 11. ERROR REPORTING HONESTY

### WHEN SOMETHING FAILS:

```markdown
## FAILURE REPORT
What Failed: [Exact description]
Command Run: [Exact command]
Error Message: [COMPLETE error, not summarized]
Stack Trace: [FULL trace if available]
What I Tried: [List all attempts]
What I Don't Understand: [Be honest]
Recommendation: [Ask for help, don't guess]
```

---

## 12. VERIFICATION COMMANDS CHEAT SHEET

```bash
# File exists check
test -f path/to/file && echo "EXISTS" || echo "NOT FOUND"

# Function exists check
grep -n "function functionName" file.ts

# Import exists check
grep -n "import.*from.*module" file.ts

# Type error check
npx tsc --noEmit file.ts 2>&1 | grep -c "error TS"

# Actual line count
wc -l file.ts

# Check if pattern was removed
grep "badPattern" file.ts && echo "STILL EXISTS" || echo "REMOVED"

# Verify no console.log remains
grep -n "console\." file.ts && echo "FOUND CONSOLE" || echo "CLEAN"

# Check test actually runs
npm test -- file.test.ts --verbose

# Verify build succeeds
npm run build && echo "BUILD SUCCESS" || echo "BUILD FAILED"
```

---

## 13. CONTINUOUS VERIFICATION IN SESSION

### EVERY 10 CHANGES:
1. Run `npm test` - verify nothing broke
2. Run `npm run build` - verify still compiles
3. Run `git diff` - review actual changes
4. Run `npm run lint` - check no new issues

### BEFORE MARKING TASK COMPLETE:
1. All tests pass (show output)
2. No new TypeScript errors (show count)
3. No new ESLint warnings (show count)
4. Application builds (show success)
5. Changes achieve goal (show evidence)

---

## 14. AUDIT TRAIL REQUIREMENT

### MAINTAIN VERIFICATION LOG:

```markdown
## VERIFICATION LOG - [Date]

### Change 1: [Description]
- File: [path]
- Verification: [command] → [output]
- Status: ✅ VERIFIED / ❌ FAILED

### Change 2: [Description]
- File: [path]
- Verification: [command] → [output]
- Status: ✅ VERIFIED / ❌ FAILED

### Summary:
- Total changes: X
- Verified working: Y
- Failed/Unverified: Z
- Test coverage: XX%
- Build status: PASSING/FAILING
```

---

## 15. ENFORCEMENT MECHANISM

### AUTOMATIC VERIFICATION HOOKS:

```json
// .vscode/settings.json
{
  "editor.preSave": [
    "source.runTests",
    "source.checkTypes",
    "source.lint"
  ],
  "git.preCommit": [
    "npm test",
    "npm run type-check",
    "npm run lint"
  ]
}
```

### AI AGENT VERIFICATION LOOP:

```python
def verify_change(file_path, change_description):
    # 1. Check file exists
    if not os.path.exists(file_path):
        return {"verified": False, "reason": "File not found"}

    # 2. Run type check
    result = subprocess.run(["npx", "tsc", "--noEmit", file_path])
    if result.returncode != 0:
        return {"verified": False, "reason": "TypeScript errors"}

    # 3. Run tests if they exist
    test_file = file_path.replace('.ts', '.test.ts')
    if os.path.exists(test_file):
        result = subprocess.run(["npm", "test", "--", test_file])
        if result.returncode != 0:
            return {"verified": False, "reason": "Tests failed"}

    # 4. Check for console statements
    with open(file_path) as f:
        if 'console.' in f.read():
            return {"verified": False, "reason": "Console statements found"}

    return {"verified": True, "evidence": "All checks passed"}
```

---

## THE GOLDEN RULE

**"If you didn't run it, you didn't verify it."**
**"If you didn't capture output, it didn't happen."**
**"If you can't reproduce it, don't claim it."**

Every single claim must be backed by:
1. A command that was run
2. The actual output captured
3. A way for others to reproduce

NO EXCEPTIONS. NO ASSUMPTIONS. NO LIES.

---

**This document is MANDATORY for all development sessions.**
**Violations will result in immediate task failure.**
**Honesty about failures is better than false success claims.**