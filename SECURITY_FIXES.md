# Security Fixes — Quick Reference Guide

**Generated**: 2026-02-27
**For**: Mintenance Development Team
**Source**: PAYMENT_SECURITY_AUDIT.md + PCI_COMPLIANCE_CHECKLIST.md

---

## 🚨 DO THESE RIGHT NOW (Before Any Production Traffic)

---

### FIX-1: Rotate ALL Live Production Credentials

**Files**: `.env.local` (lines 44-194)
**Risk**: Live Stripe key compromise = unauthorized charges, refunds, customer data access

**Credentials to rotate IMMEDIATELY**:

```bash
# 1. Stripe — https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_REDACTED...   # ROTATE NOW
STRIPE_WEBHOOK_SECRET=whsec_REDACTED...   # ROTATE NOW

# 2. Database — Supabase dashboard → Database → Reset password
# Current (WEAK): REDACTED
DATABASE_URL=postgresql://postgres.xxx:REDACTED@...  # ROTATE NOW

# 3. JWT — Generate new 128-char secret
# node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
JWT_SECRET=SLnnjgPA6j/1jrLF7OcU...  # ROTATE NOW

# 4. OpenAI — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-tz834m3iYjCQ...  # ROTATE NOW

# 5. Twilio — https://console.twilio.com/
TWILIO_AUTH_TOKEN=b522cdde15c6893bf...  # ROTATE NOW

# 6. SendGrid — https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.XMmXbHPxTYe_ZANuECPDIg...  # ROTATE NOW

# 7. ENCRYPTION MASTER KEY — CRITICAL: Re-encrypt all data first!
ENCRYPTION_MASTER_KEY=2189bc3d0d390544...  # ROTATE AFTER RE-ENCRYPTION
```

**For local dev, NEVER use `sk_live_` keys**:
```bash
# Development should always use test keys:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Add to git pre-commit hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/sh
if git diff --cached --name-only | xargs grep -l "sk_live_\|sk_test_51" 2>/dev/null; then
  echo "ERROR: Possible Stripe live key detected in commit. Aborting."
  exit 1
fi
```

---

### FIX-2: Fix `isFirstTimeTransaction()` — Wrong Column in Query

**File**: `apps/web/lib/payments/high-risk-checks.ts`
**Lines**: 326-349
**Time to fix**: 2 minutes

```typescript
// BEFORE (broken — always returns empty, every user appears as first-time):
const { count, error } = await serverSupabase
  .from('escrow_transactions')
  .select('id', { count: 'exact', head: true })
  .eq('job_id', userId)          // ← BUG: job_id contains job UUIDs, not user UUIDs
  .eq('status', 'completed');

// AFTER (correct):
const { count, error } = await serverSupabase
  .from('escrow_transactions')
  .select('id', { count: 'exact', head: true })
  .eq('payer_id', userId)        // ← correct: filter by the user who paid
  .eq('status', 'completed');
```

---

### FIX-3: Fix `detectUnusualPattern()` — Missing User ID Filter

**File**: `apps/web/lib/payments/high-risk-checks.ts`
**Lines**: 355-408
**Time to fix**: 5 minutes

```typescript
// FIX 1: Velocity check — add userId filter
const { count, error } = await serverSupabase
  .from('escrow_transactions')
  .select('id', { count: 'exact', head: true })
  .eq('payer_id', userId)         // ← ADD THIS LINE
  .gte('created_at', fiveMinutesAgo);

// FIX 2: Average check — add userId filter
const { data: avgData, error: avgError } = await serverSupabase
  .from('escrow_transactions')
  .select('amount')
  .eq('payer_id', userId)          // ← ADD THIS LINE
  .eq('status', 'completed')
  .order('created_at', { ascending: false })  // ← most recent 10 for this user
  .limit(10);
```

---

### FIX-4: Fix `admin_hold_status` Schema/Code Mismatch

**Files**: `apps/web/app/api/payments/release-escrow/route.ts:217` and DB migration
**Time to fix**: 10 minutes

The code checks for `'admin_hold'` and `'pending_review'` but the DB only allows `'none'`, `'held'`, `'released'`, `NULL`.

**Option A (preferred): Update migration to add the missing values**:
```sql
-- New migration: supabase/migrations/20260227000001_fix_admin_hold_status.sql
ALTER TABLE public.escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_admin_hold_status_check;

ALTER TABLE public.escrow_transactions
  ADD CONSTRAINT escrow_transactions_admin_hold_status_check
  CHECK (admin_hold_status IN ('none', 'held', 'released', 'admin_hold', 'pending_review')
         OR admin_hold_status IS NULL);
```

**Option B: Update the code to match the existing DB constraint**:
```typescript
// BEFORE (broken — values 'admin_hold' and 'pending_review' can't exist in DB):
if (escrowTransaction.admin_hold_status === 'admin_hold' ||
    escrowTransaction.admin_hold_status === 'pending_review') {

// AFTER (correct — check for the value the DB constraint actually allows):
if (escrowTransaction.admin_hold_status === 'held') {
```

---

### FIX-5: Remove PII from Payment Methods API Response

**File**: `apps/web/app/api/payments/methods/route.ts`
**Time to fix**: 5 minutes

```typescript
// BEFORE (leaks PII and internal Stripe IDs):
const formattedMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  billing_details: pm.billing_details,  // ← REMOVE: contains full address, email, phone
}));

return NextResponse.json({
  paymentMethods: formattedMethods,
  stripeCustomerId,   // ← REMOVE: internal Stripe ID
  defaultPaymentMethodId,
});

// AFTER (safe):
const formattedMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  isDefault: pm.id === defaultPaymentMethodId,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
  } : null,
  // billing_details: REMOVED — do not expose PII
  created: pm.created,
}));

return NextResponse.json({
  paymentMethods: formattedMethods,
  // stripeCustomerId: REMOVED — internal identifier
  defaultPaymentMethodId,
});
```

---

## HIGH PRIORITY (This Sprint)

---

### FIX-6: Encrypt `mfa_secret` at Rest

**File**: `apps/web/lib/payments/high-risk-checks.ts:218`
**Impact**: If DB is breached, all TOTP secrets exposed → MFA bypassed for all users

**Step 1**: Create migration to encrypt existing secrets:
```sql
-- This requires a migration that reads and re-encrypts all existing mfa_secret values
-- Use the application's ENCRYPTION_MASTER_KEY via pgcrypto or application-level encryption
```

**Step 2**: Update read path in `high-risk-checks.ts`:
```typescript
// After fetching:
const decryptedSecret = await decryptField(user.mfa_secret); // decrypt transiently
const isValid = await validateTOTPToken(decryptedSecret, mfaToken);
// DO NOT store decryptedSecret anywhere
```

**Step 3**: Update write path in MFA enrollment to encrypt before storing.

---

### FIX-7: Add TOTP Replay Protection

**File**: `apps/web/lib/payments/high-risk-checks.ts`
**Lines**: 210-289
**Impact**: Used TOTP codes can be reused within 90-second window

```typescript
import { serverSupabase } from '@/lib/api/supabaseServer';

async function validateTOTPToken(
  secret: string,
  token: string,
  userId: string  // ← add userId parameter
): Promise<boolean> {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Mintenance',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) return false;

    // CHECK: Has this TOTP code been used in the last 90 seconds?
    const replayKey = `totp_used:${userId}:${token}`;
    const { data: existingUse } = await serverSupabase
      .from('totp_replay_cache')
      .select('id')
      .eq('cache_key', replayKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingUse) {
      logger.warn('TOTP replay attack detected', { service: 'payments', userId });
      return false;
    }

    // RECORD: Mark this code as used for 90 seconds
    await serverSupabase.from('totp_replay_cache').insert({
      cache_key: replayKey,
      user_id: userId,
      expires_at: new Date(Date.now() + 90_000).toISOString(),
    });

    return true;
  } catch (error) {
    logger.error('TOTP validation error', error, { service: 'payments' });
    return false;
  }
}
```

Also create the DB table:
```sql
CREATE TABLE IF NOT EXISTS public.totp_replay_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON totp_replay_cache (expires_at);  -- for cleanup
-- Cleanup old entries (run as cron):
DELETE FROM totp_replay_cache WHERE expires_at < NOW();
```

---

### FIX-8: Add Role Restriction to Release Escrow

**File**: `apps/web/app/api/payments/release-escrow/route.ts:24`
**Time to fix**: 1 minute

```typescript
// BEFORE (no role restriction):
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },

// AFTER (restrict to relevant roles):
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin', 'contractor'], rateLimit: { maxRequests: 20 } },
```

---

### FIX-9: Fix User Role Source — Stop Trusting Client-Writable `user_metadata`

**File**: `apps/web/middleware.ts:364`
**Impact**: Users can escalate to admin role by updating their own `user_metadata`

```typescript
// BEFORE (reads role from client-writable user_metadata):
requestHeaders.set('x-user-role', user.user_metadata?.role || 'homeowner');

// AFTER (look up role from server-controlled table):
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();
const role = profile?.role || 'homeowner';
requestHeaders.set('x-user-role', role);
```

---

### FIX-10: Enforce Session Timeout in Production

**File**: `.env.staging`, production env vars
**Current**: `ENFORCE_SESSION_TIMEOUTS=false` (default)
**Required by PCI DSS 8.2.8**: 15-minute idle timeout

```bash
# Add to ALL non-local environments:
ENFORCE_SESSION_TIMEOUTS=true
SESSION_IDLE_TIMEOUT_MINUTES=15    # PCI DSS requires 15 min
SESSION_ABSOLUTE_TIMEOUT_HOURS=12
```

---

### FIX-11: Update Stripe API Version

**Files**: `apps/web/lib/stripe.ts:15`, `apps/web/app/api/payments/release-escrow/route.ts:22`
**Note**: Also eliminate multiple `new Stripe()` instantiations — use the shared singleton

```typescript
// In apps/web/lib/stripe.ts — update version:
_stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,  // ← update to current
  typescript: true,
});

// In release-escrow/route.ts — REMOVE direct Stripe initialization:
// DELETE: const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
// Instead import from shared stripe module:
import { stripe } from '@/lib/stripe';
```

---

## MEDIUM PRIORITY (Next Sprint)

---

### FIX-12: Remove CSP `unsafe-inline` — Enforce Nonce-Based CSP

**File**: `apps/web/middleware.ts:589`
**Status**: Report-Only strict CSP is already in place — complete the migration

```typescript
// CURRENT (enforcement CSP — has unsafe-inline):
"script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com"

// TARGET (already in Report-Only — promote to enforcement once violations reach zero):
`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://maps.googleapis.com`
```

**Migration path**:
1. Monitor `Content-Security-Policy-Report-Only` violations via `/api/csp-report`
2. Fix each violation (inline scripts need `nonce="${nonce}"` attribute)
3. Once violations reach zero in prod, replace enforced CSP header

---

### FIX-13: Add Subresource Integrity (SRI) for Stripe.js

**File**: Any component/layout loading Stripe.js
**PCI DSS**: Requirement 6.4.3 — payment scripts must have integrity verified

```html
<!-- Check https://stripe.com/docs/security/guide for latest SRI hash -->
<!-- Example structure (use actual hash from Stripe): -->
<script
  src="https://js.stripe.com/v3/"
  integrity="sha384-ACTUAL_HASH_FROM_STRIPE"
  crossorigin="anonymous"
  async
></script>
```

Note: Stripe rotates their script — check their documentation for the approved implementation method for SRI.

---

### FIX-14: Strip Raw Event Data from Webhook Storage

**File**: `apps/web/app/api/webhooks/stripe/services/idempotency.service.ts`

```typescript
// BEFORE (stores full raw event including customer PII):
await supabase.from('webhook_events').insert({
  event_id: eventId,
  event_type: eventType,
  provider: 'stripe',
  data: eventData,      // ← REMOVE: may contain email, address, billing data
  processed_at: new Date().toISOString(),
});

// AFTER (store minimum needed for idempotency):
await supabase.from('webhook_events').insert({
  event_id: eventId,
  event_type: eventType,
  provider: 'stripe',
  // data: REMOVED
  processed_at: new Date().toISOString(),
});
```

---

### FIX-15: Remove `payment_intent_id` from History API Response

**File**: `apps/web/app/api/payments/history/route.ts`

```typescript
// BEFORE:
const selectFields = `id, job_id, payer_id, payee_id, amount, status, payment_intent_id, ...`;

// AFTER (remove payment_intent_id from client-facing fields):
const selectFields = `id, job_id, payer_id, payee_id, amount, status, ...`;
// Remove paymentIntentId from the response mapping
```

---

### FIX-16: Fix IP Extraction for Refund Rate Limiting

**File**: `apps/web/app/api/payments/refund/route.ts:20`

```typescript
// BEFORE (x-forwarded-for is spoofable):
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

// AFTER (use Vercel's trusted IP + also key on userId):
const ip = request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]
        || 'unknown';
const rateLimitResult = await checkApiRateLimit(`refund:${user.id}:${ip}`);
//                                                       ^^^^^^^^^ add userId
```

---

### FIX-17: Fix Internal HTTP Fetch SSRF Risk in process-job-payment

**File**: `apps/web/app/api/payments/process-job-payment/route.ts`

Instead of making an HTTP call to itself, import and call the service functions directly:

```typescript
// BEFORE (internal HTTP fetch — SSRF risk):
const createIntentResponse = await fetch(`${request.nextUrl.origin}/api/payments/create-intent`, {
  headers: { Cookie: request.headers.get('cookie') as string }
});

// AFTER (direct service call — no HTTP overhead, no SSRF surface):
import { createPaymentIntentForJob } from '@/lib/services/payment/PaymentInitialization';

const result = await createPaymentIntentForJob({
  amount,
  jobId,
  contractorId: job.contractor_id,
  userId: user.id,
  currency: 'gbp',
});
```

---

## LOW PRIORITY (Plan to Fix)

---

### FIX-18: Fix Stripe Idempotency Key to Be Truly Deterministic

**File**: `apps/web/app/api/payments/create-intent/route.ts:234`

```typescript
// BEFORE (new UUID each call — Stripe-level idempotency broken):
const stripeIdempotencyKey = `payment_intent_${jobId}_${user.id}_${crypto.randomUUID()}`;

// AFTER (deterministic — same key for same logical operation):
const stripeIdempotencyKey = `payment_intent_${jobId}_${user.id}`;
// The Mintenance-level idempotency check (checkIdempotency) prevents double calls
// The Stripe-level key prevents duplicate charges if Stripe receives duplicate requests
```

---

### FIX-19: Fix Floating-Point Currency Arithmetic

**File**: `apps/web/app/api/payments/refund/route.ts:142`

```typescript
// BEFORE (floating-point drift risk):
const refundAmount = Math.round(escrow.amount * 100);

// AFTER (always pass amounts in integer cents from DB):
// Store amounts as INTEGER CENTS in the database column type
// Or use: const refundAmount = parseInt(String(escrow.amount * 100), 10);
// Better: use decimal.js library for all monetary arithmetic
```

---

### FIX-20: Update Minimatch (ReDoS in Dev Dependencies)

```bash
cd C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean
npm audit fix
# If that doesn't work for all packages:
npm update minimatch --depth 10
```

---

## Verification Checklist

After implementing each fix, verify with:

```bash
# Type check
npx tsc --noEmit 2>&1

# Run payment tests
npx vitest run apps/web/__tests__/api/payments/ 2>&1

# Build check
npm run build 2>&1

# Verify no live keys in any non-.env file
grep -r "sk_live_\|sk_test_51" --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=".git" --exclude-dir="node_modules" . 2>&1

# Verify mfa_secret is not logged anywhere
grep -r "mfa_secret" --include="*.ts" apps/ 2>&1
```

---

## Fix Priority Timeline

| Week | Fixes | Status Goal |
|------|-------|-------------|
| **Immediate** | FIX-1 (rotate creds), FIX-2 (isFirstTime), FIX-3 (detectPattern), FIX-4 (admin hold), FIX-5 (billing_details) | 🔴 Critical resolved |
| **Sprint 1** | FIX-6 (encrypt mfa_secret), FIX-7 (TOTP replay), FIX-8 (role gate), FIX-9 (role source), FIX-10 (session timeout), FIX-11 (Stripe version) | 🟠 High resolved |
| **Sprint 2** | FIX-12 (CSP), FIX-13 (SRI), FIX-14 (webhook data), FIX-15 (history API), FIX-16 (IP rate limit), FIX-17 (SSRF) | 🟡 Medium resolved |
| **Sprint 3** | FIX-18 (idempotency key), FIX-19 (currency), FIX-20 (npm audit) | 🟢 Low resolved |

---

## Standards Referenced

- [PCI DSS v4.0](https://www.pcisecuritystandards.org/document_library/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Payment Security Guide](https://owasp.org/www-project-payment-card-industry-v2-0/)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [NIST SP 800-132 (Key Derivation)](https://csrc.nist.gov/publications/detail/sp/800-132/final)
