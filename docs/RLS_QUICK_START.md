# RLS Testing - Quick Start Guide

**Time to complete:** 10 minutes
**Difficulty:** Beginner

---

## What You'll Do

Test Row Level Security (RLS) policies to ensure your database is secure and users can only access their own data.

---

## Prerequisites (2 minutes)

1. **Database Migration Applied**
   ```bash
   # Check if migration is applied
   npx supabase db diff --local
   ```

2. **Environment Variables Set**
   ```bash
   # Check .env.local has:
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

---

## Quick Test (5 minutes)

### Option 1: SQL Test (Fastest)

Run the SQL test script directly:

```bash
npx supabase db execute --file scripts/test-rls-policies.sql
```

**What to look for:**
- ✅ All tests should show `✓ PASS`
- ❌ Any `✗ FAIL` is a security issue

**Expected output:**
```
✓ PASS: Payer can see their escrow transactions (1 records)
✓ PASS: Cross-tenant access blocked for escrow transactions
✓ PASS: User can see their own refresh tokens (1 records)
✓ PASS: Cross-user access blocked for refresh tokens (CRITICAL SECURITY PASS)
```

### Option 2: TypeScript Test (More Comprehensive)

Run the Jest test suite:

```bash
cd apps/web
npm test __tests__/rls-policies.test.ts
```

**What to look for:**
- All tests should pass
- No failures in critical tables

---

## What If Tests Fail?

### Critical Failures (Stop Immediately)

If you see any of these:
```
✗ FAIL: Cross-user token access detected!
✗ FAIL: Cross-tenant data leakage for escrow transactions!
✗ FAIL: Third party can access private messages!
```

**DO NOT DEPLOY TO PRODUCTION**

**What to do:**
1. Review the migration file: `supabase/migrations/20251221181018_add_rls_policies_critical_tables.sql`
2. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'problem_table';`
3. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'problem_table';`
4. Contact the database team

### Non-Critical Issues

If you see warnings about:
- Performance
- Missing indexes
- Query optimization

These can be addressed later, but note them in your test report.

---

## Complete Test Report (3 minutes)

After tests pass, fill in the test report:

1. **Open template:**
   ```
   docs/RLS_TEST_REPORT.md
   ```

2. **Fill in:**
   - Date and tester name
   - Total tests passed/failed
   - Any issues found
   - Sign-off

3. **Save and commit:**
   ```bash
   git add docs/RLS_TEST_REPORT.md
   git commit -m "docs: complete RLS testing report"
   ```

---

## Critical Security Checks ✅

Before you're done, verify these MUST PASS:

- [ ] **Refresh Token Isolation**
  ```sql
  -- User CANNOT see other users' tokens
  ✓ PASS: Cross-user access blocked for refresh tokens
  ```

- [ ] **Financial Data Privacy**
  ```sql
  -- Third parties CANNOT see escrow transactions
  ✓ PASS: Cross-tenant access blocked for escrow transactions
  ```

- [ ] **Message Privacy**
  ```sql
  -- Third parties CANNOT read private messages
  ✓ PASS: Third party cannot see private messages
  ```

- [ ] **Payout Account Security**
  ```sql
  -- Contractors CANNOT see others' payout accounts
  ✓ PASS: Cross-contractor access blocked for payout accounts
  ```

- [ ] **Bid Privacy**
  ```sql
  -- Contractors CANNOT see competitors' bids
  ✓ PASS: Cross-contractor access blocked for bids
  ```

**If ALL 5 pass: ✅ You're good to deploy!**
**If ANY fail: ❌ Stop and fix before deploying**

---

## Next Steps

### If All Tests Pass ✅

1. **Fill in test report** (`docs/RLS_TEST_REPORT.md`)
2. **Get security team review** (if required)
3. **Deploy to staging** and re-test
4. **Monitor production** for RLS violations

### If Tests Fail ❌

1. **Review security findings** (`docs/RLS_SECURITY_FINDINGS.md`)
2. **Check migration file** for policy definitions
3. **Debug with SQL** (see troubleshooting guide)
4. **Fix and re-test**
5. **Document the fix**

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check Supabase is running
npx supabase status

# Restart if needed
npx supabase stop && npx supabase start
```

### "RLS not enabled"

```sql
-- Enable RLS manually
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Or re-run migration
npx supabase db push
```

### "Auth context not set"

For TypeScript tests, ensure you're authenticated:

```typescript
// In your test setup
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password',
});
```

### "Test users already exist"

```sql
-- Clean up old test data
DELETE FROM public.users WHERE email LIKE 'test-%@test.com';
```

---

## Full Documentation

Need more details? See:

- **Testing Guide:** `docs/RLS_TESTING_GUIDE.md` - Comprehensive testing instructions
- **Test Report:** `docs/RLS_TEST_REPORT.md` - Template for documenting results
- **Security Findings:** `docs/RLS_SECURITY_FINDINGS.md` - Security analysis
- **Summary:** `docs/RLS_TESTING_SUMMARY.md` - Overview of all deliverables

---

## Quick Command Reference

```bash
# Run SQL tests
npx supabase db execute --file scripts/test-rls-policies.sql

# Run TypeScript tests
cd apps/web && npm test __tests__/rls-policies.test.ts

# Run specific test category
npm test __tests__/rls-policies.test.ts -t "Financial Tables"

# Check RLS status
npx supabase db execute --command "SELECT * FROM verify_rls_enabled();"

# View policies for a table
npx supabase db execute --command "SELECT * FROM pg_policies WHERE tablename = 'jobs';"
```

---

## Success Checklist

Before marking this task complete:

- [ ] SQL tests run and all pass
- [ ] TypeScript tests run and all pass
- [ ] All 5 critical security checks pass
- [ ] Test report filled in
- [ ] No CRITICAL failures
- [ ] Performance acceptable (<100ms)
- [ ] Documentation reviewed

---

## Support

**Stuck?** Check:
1. Troubleshooting section above
2. Full testing guide (`docs/RLS_TESTING_GUIDE.md`)
3. Migration file comments
4. #security-team Slack channel

**Found a bug?** Report it:
- Email: security@mintenance.com
- Slack: #security-team
- Do NOT open public GitHub issue for security vulnerabilities

---

**Total Time:** ~10 minutes
**Next:** Deploy to staging and monitor

**Last Updated:** December 21, 2025
