# RLS Policies Testing Guide

This guide explains how to test Row Level Security (RLS) policies for the Mintenance platform.

## Overview

We have implemented comprehensive RLS policies across 32 critical tables. This testing suite ensures:

- **Multi-tenant isolation** - Users can only access their own data
- **No cross-tenant data leakage** - Users cannot access other users' data
- **Proper admin overrides** - Admins can access all data with audit logging
- **Security compliance** - Financial and authentication data is properly protected

## Test Files

### 1. TypeScript Test Suite
**Location:** `apps/web/__tests__/rls-policies.test.ts`

Comprehensive Jest test suite that tests RLS policies programmatically.

**Features:**
- Tests all CRUD operations (SELECT, INSERT, UPDATE, DELETE)
- Tests cross-tenant access blocking
- Tests admin override capabilities
- Tests edge cases (NULL user_id, invalid user_id, bulk operations)
- Performance impact testing

### 2. SQL Test Script
**Location:** `scripts/test-rls-policies.sql`

Direct SQL testing script for database-level validation.

**Features:**
- Creates test users and data
- Verifies RLS is enabled on all tables
- Tests policies with different user contexts
- Generates comprehensive test report
- Includes performance metrics

### 3. Test Report Template
**Location:** `docs/RLS_TEST_REPORT.md`

Template for documenting test results and findings.

---

## Running the Tests

### Prerequisites

1. **Environment Setup**
   ```bash
   # Ensure you have .env.local configured
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Migration**
   ```bash
   # Ensure the RLS migration has been applied
   npx supabase db diff --local
   ```

### Option 1: TypeScript Test Suite

**Run all RLS tests:**
```bash
cd apps/web
npm test __tests__/rls-policies.test.ts
```

**Run specific test categories:**
```bash
# Financial tables only
npm test __tests__/rls-policies.test.ts -t "Financial Tables"

# Authentication tables only
npm test __tests__/rls-policies.test.ts -t "Authentication Tables"

# User data tables only
npm test __tests__/rls-policies.test.ts -t "User Data Tables"
```

**Run with coverage:**
```bash
npm test __tests__/rls-policies.test.ts --coverage
```

**Run in watch mode:**
```bash
npm test __tests__/rls-policies.test.ts --watch
```

### Option 2: SQL Test Script

**Via Supabase CLI (Recommended):**
```bash
npx supabase db execute --file scripts/test-rls-policies.sql
```

**Via psql:**
```bash
psql -h localhost -U postgres -d mintenance -f scripts/test-rls-policies.sql
```

**Via Supabase Studio:**
1. Open Supabase Studio SQL Editor
2. Copy contents of `scripts/test-rls-policies.sql`
3. Run the query
4. Review output in console

### Option 3: Combined Testing

**Run both test suites:**
```bash
# 1. Run TypeScript tests
cd apps/web
npm test __tests__/rls-policies.test.ts

# 2. Run SQL tests
npx supabase db execute --file scripts/test-rls-policies.sql

# 3. Generate report
# Use the output to fill in docs/RLS_TEST_REPORT.md
```

---

## Test Categories Explained

### 1. Financial Tables (CRITICAL 🔴)

Tests the most sensitive financial data:

- **escrow_transactions** - Payment escrow records
- **contractor_payout_accounts** - Stripe account information

**Why Critical:**
- Contains financial transactions
- PCI compliance requirements
- Direct financial impact if leaked

**Key Tests:**
- ✅ Payer can see their transactions
- ✅ Payee can see their transactions
- ❌ Third parties CANNOT see transactions
- ✅ Admin can see all (with audit logging)

### 2. Authentication Tables (CRITICAL 🔴)

Tests authentication and session security:

- **refresh_tokens** - Session refresh tokens

**Why Critical:**
- Token theft = account compromise
- Session hijacking vulnerability
- Most common attack vector

**Key Tests:**
- ✅ User can see their own tokens
- ❌ Users CANNOT see other users' tokens (MOST CRITICAL TEST)
- ✅ User can delete their own tokens
- ❌ Users CANNOT delete others' tokens

### 3. User Data Tables (MEDIUM 🟡)

Tests core platform functionality:

- **jobs** - Job postings
- **bids** - Contractor bids
- **messages** - Private messages
- **notifications** - User notifications
- **reviews** - Public reviews

**Why Important:**
- Privacy concerns
- Competitive information (bids)
- Private communications

**Key Tests:**
- ✅ Users see their own data
- ✅ Public data is accessible
- ❌ Private data is blocked from others

### 4. AI/ML Tables (LOW-MEDIUM 🟡)

Tests machine learning data:

- **yolo_corrections** - User corrections
- **yolo_retraining_jobs** - Admin-only ML jobs
- **maintenance_training_labels** - Training data

**Why Tested:**
- User privacy (corrections tied to users)
- ML model security
- Admin-only operations

### 5. System Tables (MEDIUM 🟡)

Tests system administration:

- **security_events** - Security logs (admin-only)
- **webhook_events** - Webhook payloads (admin-only)
- **idempotency_keys** - Request deduplication

**Why Tested:**
- Security event logs are sensitive
- Webhook payloads may contain PII
- Compliance requirements

---

## Understanding Test Results

### Expected Output Patterns

#### ✅ PASS - Correct Behavior
```
✓ PASS: User can see their own data (5 records)
```

#### ❌ FAIL - Unexpected Behavior
```
✗ FAIL: Cross-tenant data leakage detected! (3 records visible)
```

#### ⚠️ WARNING - Potential Issue
```
⚠ WARNING: Query performance degraded (>1000ms)
```

### Critical Failures

Any failure in these tests is a **CRITICAL SECURITY VULNERABILITY**:

1. **Cross-tenant access to financial data**
   - Users seeing other users' escrow_transactions
   - Users seeing other contractors' payout accounts

2. **Cross-user token access**
   - Users seeing other users' refresh_tokens
   - This allows session hijacking

3. **Private message leakage**
   - Third parties seeing messages between other users

4. **Admin-only table access by non-admins**
   - Regular users seeing security_events
   - Regular users seeing webhook_events

**If any of these fail, DO NOT DEPLOY TO PRODUCTION.**

---

## Common Issues and Solutions

### Issue 1: Test Users Already Exist

**Error:**
```
ERROR: duplicate key value violates unique constraint "users_pkey"
```

**Solution:**
```sql
-- Delete test users
DELETE FROM public.users WHERE email LIKE 'test-%@test.com';

-- Or use ON CONFLICT DO NOTHING in insert
```

### Issue 2: RLS Not Enabled

**Error:**
```
✗ DISABLED (SECURITY RISK!)
```

**Solution:**
```sql
-- Check migration was applied
SELECT * FROM verify_rls_enabled();

-- If not, apply migration
npx supabase db push
```

### Issue 3: Policies Not Working

**Symptoms:**
- Users can see all data
- No data is visible

**Debug Steps:**
```sql
-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'your_table';

-- 2. Check policies exist
SELECT * FROM pg_policies
WHERE tablename = 'your_table';

-- 3. Check auth context
SELECT auth.uid();  -- Should return user ID

-- 4. Test policy manually
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-id-here"}';
SELECT * FROM your_table;
```

### Issue 4: Auth Context Not Set

**Error:**
```
auth.uid() returns NULL
```

**Solution:**
```typescript
// Ensure you're using authenticated Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in before testing
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password',
});
```

---

## Performance Testing

### Expected Performance

| Query Type | Acceptable Time | Warning Threshold |
|------------|-----------------|-------------------|
| Simple SELECT | <50ms | >100ms |
| JOIN queries | <100ms | >200ms |
| Bulk operations | <200ms | >500ms |

### Performance Degradation

If RLS causes significant performance issues:

1. **Check indexes:**
   ```sql
   -- Ensure indexes exist on RLS filter columns
   CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON jobs(homeowner_id);
   CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
   ```

2. **Optimize policies:**
   ```sql
   -- Use EXISTS instead of subqueries where possible
   -- Avoid complex joins in policy USING clauses
   ```

3. **Monitor query plans:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM jobs WHERE homeowner_id = auth.uid();
   ```

---

## Continuous Testing

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
- name: Run RLS Policy Tests
  run: |
    cd apps/web
    npm test __tests__/rls-policies.test.ts

- name: Run SQL RLS Tests
  run: |
    npx supabase db execute --file scripts/test-rls-policies.sql
```

### Pre-deployment Checklist

Before deploying to production:

- [ ] All RLS tests pass (TypeScript + SQL)
- [ ] No CRITICAL failures
- [ ] No cross-tenant data leakage
- [ ] Admin override working
- [ ] Performance acceptable (<100ms for most queries)
- [ ] Test report completed and reviewed
- [ ] Security team sign-off

---

## Monitoring in Production

### Audit Logging

All admin access should be logged:

```sql
-- Check audit logs for admin access
SELECT *
FROM audit_logs
WHERE action IN ('SELECT', 'UPDATE', 'DELETE')
  AND user_id IN (SELECT id FROM users WHERE role = 'admin')
ORDER BY created_at DESC
LIMIT 100;
```

### Security Event Monitoring

Monitor for RLS bypass attempts:

```sql
-- Check for suspicious access patterns
SELECT *
FROM security_events
WHERE event_type = 'rls_policy_violation'
ORDER BY created_at DESC;
```

### Performance Monitoring

Track query performance with RLS:

```sql
-- Monitor slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%FROM jobs%'
  OR query LIKE '%FROM bids%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO NOT** commit the vulnerability details
3. **DO** report privately to security@mintenance.com
4. **DO** include:
   - Table affected
   - Steps to reproduce
   - Potential impact
   - Suggested fix

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Migration File](../supabase/migrations/20251221181018_add_rls_policies_critical_tables.sql)
- [Test Report Template](./RLS_TEST_REPORT.md)

---

## Support

For questions or issues:

- **Slack:** #security-team
- **Email:** dev-team@mintenance.com
- **Documentation:** [Internal Wiki]

---

**Last Updated:** 2025-12-21
**Version:** 1.0
**Maintainer:** Database Architecture Team
