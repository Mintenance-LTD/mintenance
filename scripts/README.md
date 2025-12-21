# 📜 Mintenance Scripts

This directory contains utility scripts for testing, deployment, and maintenance.

---

## Available Scripts

### 1. **Payment Flow Test** (`test-payment-flow.ts`)

Tests the complete payment infrastructure including database connectivity, Stripe integration, and escrow transactions.

**Prerequisites:**
```bash
# Add to .env:
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
STRIPE_SECRET_KEY=sk_test_<your-secret-key>
```

**Usage:**
```bash
npm run test:payment
```

**What It Tests:**
- ✅ Supabase database connection
- ✅ Database schema verification (escrow_transactions, users.stripe_customer_id)
- ✅ Stripe API connection
- ✅ Payment intent creation
- ✅ Escrow transaction creation
- ✅ Customer creation
- ✅ Payment method attachment
- ✅ Automatic cleanup of test data

**Example Output:**
```
🧪 Payment Flow Test Suite
==========================

1️⃣ Testing Supabase Database Schema
✅ escrow_transactions table exists
✅ users table accessible
✅ stripe_customer_id column exists

2️⃣ Testing Stripe API Connection
✅ Stripe API connected
   Available: $0
   Pending: $0

3️⃣ Testing Payment Intent Creation
✅ Payment intent created successfully
   ID: pi_3xyz...
   Amount: $50
   Status: requires_payment_method

4️⃣ Testing Escrow Transaction Creation
✅ Escrow transaction created
   ID: 123e4567-e89b-12d3-a456-426614174000
   Amount: $50.00
   Status: pending

5️⃣ Testing Stripe Customer Creation
✅ Customer created successfully
   ID: cus_xyz...
   Email: test@mintenance.app

6️⃣ Testing Payment Method Attachment
✅ Payment method attached successfully
   ID: pm_xyz...
   Type: card
   Card: visa ending in 4242

7️⃣ Cleaning Up Test Data
✅ Cancelled payment intent: pi_3xyz...
✅ Deleted escrow transaction: 123e4567...
✅ Deleted customer: cus_xyz...
✅ Cleanup completed

✅ All Tests Passed!
====================
Your payment infrastructure is working correctly.
You can now deploy the payment API endpoints to production.
```

---

### 2. **RLS Policies Test Suite** (`test-rls-policies.sql`)

🔐 **CRITICAL SECURITY TEST** - Tests Row Level Security policies across 32 tables to ensure multi-tenant data isolation and prevent cross-tenant data leakage.

**Prerequisites:**
```bash
# Ensure RLS migration has been applied
npx supabase db diff --local
```

**Usage:**
```bash
# Via Supabase CLI (Recommended)
npx supabase db execute --file scripts/test-rls-policies.sql

# Or via psql
psql -h localhost -U postgres -d mintenance -f scripts/test-rls-policies.sql
```

**What It Tests:**
- ✅ RLS enabled on all 32 critical tables
- ✅ Financial data isolation (escrow_transactions, contractor_payout_accounts)
- ✅ Authentication security (refresh_tokens - MOST CRITICAL)
- ✅ User data privacy (jobs, bids, messages, notifications, reviews)
- ✅ Cross-tenant access blocking (users CANNOT see other users' data)
- ✅ Admin override capabilities
- ✅ AI/ML table security
- ✅ System table access control
- ✅ Edge cases (NULL user_id, invalid user_id)
- ✅ Query performance with RLS

**Critical Tests:**
1. **Refresh Token Isolation** - Users CANNOT see other users' tokens (prevents account takeover)
2. **Escrow Transaction Privacy** - Third parties CANNOT see financial transactions
3. **Message Privacy** - Third parties CANNOT read private messages
4. **Payout Account Security** - Contractors CANNOT see others' payout accounts
5. **Bid Privacy** - Contractors CANNOT see competitors' bids

**Expected Output:**
```sql
==================================
RLS POLICIES COMPREHENSIVE TEST
==================================

1. Creating test users...
✓ Test users created successfully

2. Creating test data...
✓ Test data created successfully

3. Verifying RLS is enabled on all critical tables...

 Table Name              | RLS Status
-------------------------+------------------
 bids                    | ✓ ENABLED
 contractor_locations    | ✓ ENABLED
 contractor_payout_accounts | ✓ ENABLED
 escrow_transactions     | ✓ ENABLED
 jobs                    | ✓ ENABLED
 messages                | ✓ ENABLED
 notifications           | ✓ ENABLED
 refresh_tokens          | ✓ ENABLED
 reviews                 | ✓ ENABLED
 security_events         | ✓ ENABLED
 yolo_corrections        | ✓ ENABLED
 ... (and 21 more tables)

4. Testing Financial Tables RLS Policies...
✓ PASS: Payer can see their escrow transactions (1 records)
✓ PASS: Cross-tenant access blocked for escrow transactions
✓ PASS: Contractor can see their payout account (1 records)
✓ PASS: Cross-contractor access blocked for payout accounts

5. Testing Authentication Tables RLS Policies...
✓ PASS: User can see their own refresh tokens (1 records)
✓ PASS: Cross-user access blocked for refresh tokens (CRITICAL SECURITY PASS)

6. Testing User Data Tables RLS Policies...
✓ PASS: Homeowner can see their own jobs (2 records)
✓ PASS: Public can see open jobs (2 records)
✓ PASS: Cross-tenant access blocked for draft jobs
✓ PASS: Contractor can see their own bids (1 records)
✓ PASS: Cross-contractor access blocked for bids
✓ PASS: Sender can see their messages (1 records)
✓ PASS: Receiver can see their messages (1 records)
✓ PASS: Third party cannot see private messages (CRITICAL SECURITY PASS)

7. Testing Admin Override Capabilities...
✓ PASS: Admin can see all data (escrow: 1, jobs: 3, messages: 1)

8. Testing System Tables RLS Policies...
✓ PASS: Non-admin cannot see security events
✓ INFO: Admin can see 0 security events

9. Testing AI/ML Tables RLS Policies...
✓ PASS: Non-admin cannot see retraining jobs

10. Testing Edge Cases...
✓ PASS: Unauthenticated users can see open jobs (2) but not drafts

==================================
TEST SUMMARY REPORT
==================================

All RLS policies are working correctly!
✅ All tests PASSED
```

**If ANY test fails:**
- ❌ **DO NOT DEPLOY to production**
- Review the failure details
- Check policy definitions in migration file
- Fix the issue and re-test
- Document the fix

**Documentation:**
- Testing Guide: `docs/RLS_TESTING_GUIDE.md`
- Test Report Template: `docs/RLS_TEST_REPORT.md`
- Security Findings: `docs/RLS_SECURITY_FINDINGS.md`
- Summary: `docs/RLS_TESTING_SUMMARY.md`

**Companion TypeScript Tests:**
- Location: `apps/web/__tests__/rls-policies.test.ts`
- Run via: `cd apps/web && npm test __tests__/rls-policies.test.ts`

---

### 3. **Deployment Verification** (`verify-deployment.js`)

Verifies the production deployment is working correctly.

**Usage:**
```bash
npm run deploy:verify
```

---

## Creating New Scripts

When creating new scripts:

1. **Use TypeScript:** `.ts` extension for type safety
2. **Add shebang:** `#!/usr/bin/env tsx` at the top
3. **Make executable:** `chmod +x scripts/your-script.ts` (Unix/Mac)
4. **Add to package.json:** Add script command to `scripts` section
5. **Document here:** Add description to this README

**Example Script Template:**
```typescript
#!/usr/bin/env tsx
/**
 * Script Name and Description
 *
 * Prerequisites:
 * - List required environment variables
 * - List required dependencies
 *
 * Usage: npm run script-name
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate environment
if (!process.env.REQUIRED_VAR) {
  console.error('❌ Missing REQUIRED_VAR in .env');
  process.exit(1);
}

async function main() {
  try {
    console.log('🚀 Starting script...');

    // Your logic here

    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
```

---

## Environment Variables

Scripts in this directory may require these environment variables:

### Required for Payment Tests:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `STRIPE_SECRET_KEY` - Stripe secret key (server-side only)

### Optional:
- `SENTRY_DSN` - Sentry project DSN
- `OPENAI_API_KEY` - OpenAI API key (server-side only)

**Security Note:** Never commit `.env` files or expose secret keys in scripts!

---

## Troubleshooting

### "Missing environment variable" error:
1. Check `.env` file exists in project root
2. Verify variable name matches exactly
3. Ensure no trailing spaces in `.env` values

### "Module not found" error:
1. Run `npm install` to install dependencies
2. Check `package.json` has required dependencies
3. Try `npm run reset` to clean and reinstall

### "Permission denied" error (Unix/Mac):
```bash
chmod +x scripts/your-script.ts
```

### "tsx not found" error:
```bash
npm install -D tsx
```

---

## Best Practices

1. **Always clean up test data** - Don't leave test records in production databases
2. **Use test mode keys** - Stripe test keys start with `sk_test_`
3. **Handle errors gracefully** - Provide helpful error messages
4. **Log important steps** - Use descriptive console.log statements
5. **Validate inputs** - Check environment variables before use
6. **Document prerequisites** - List all requirements in script header

---

*Last Updated: October 1, 2025*
