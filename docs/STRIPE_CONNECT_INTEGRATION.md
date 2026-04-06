# Stripe Connect + Elements Integration

This document covers the payment integration scaffold: contractor payouts via
Stripe Connect Express, and homeowner payment-method collection via Stripe
Elements.

## Product decisions (locked in)

| Decision | Value |
|---|---|
| Connect account type | **Express** (Stripe-hosted onboarding) |
| Who pays Stripe fees | **Platform** (Mintenance absorbs processing fees) |
| Payout cadence | **Weekly** (Friday) |
| Primary currency | **GBP** |
| Supported payment methods (homeowners) | **Cards + BACS Direct Debit** |
| Minimum payout threshold | **£50** (5000 minor units) |
| Tax handling | **Stripe Tax** (platform issues tax documents) |

All of these are encoded in [apps/web/lib/stripe/connect/config.ts](../apps/web/lib/stripe/connect/config.ts).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTRACTOR PAYOUT FLOW                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contractor clicks "Set up payouts"                             │
│       │                                                         │
│       ▼                                                         │
│  POST /api/payments/stripe-connect/onboard                      │
│       │                                                         │
│       ├──► ensureConnectAccount(contractorId, email)            │
│       │    (creates Stripe Express account if missing)          │
│       │                                                         │
│       └──► createOnboardingLink(accountId)                      │
│            (returns short-lived Stripe-hosted URL)              │
│                                                                 │
│  Contractor completes Stripe-hosted onboarding                  │
│       │                                                         │
│       ▼                                                         │
│  Stripe fires webhook: account.updated                          │
│       │                                                         │
│       └──► handleAccountUpdated (checkout-handlers.ts)          │
│            Mirrors capabilities to profiles:                    │
│              - stripe_charges_enabled                           │
│              - stripe_payouts_enabled                           │
│              - stripe_transfers_active                          │
│              - stripe_details_submitted                         │
│              - stripe_requirements_pending                      │
│                                                                 │
│  Job completes + escrow released → contractor earns             │
│       │                                                         │
│       ▼                                                         │
│  accumulateEarnings() credits contractor_payout_balances        │
│                                                                 │
│  Weekly cron: GET /api/cron/contractor-payouts                  │
│       │                                                         │
│       └──► processEligiblePayouts()                             │
│            For each balance >= £50 threshold:                   │
│              - stripe.transfers.create(destination=account_id)  │
│              - Record in contractor_payout_transfers            │
│              - Reset balance                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HOMEOWNER PAYMENT-METHOD FLOW (Elements)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Homeowner clicks "Add payment method"                          │
│       │                                                         │
│       ▼                                                         │
│  POST /api/payments/setup-intent                                │
│       │                                                         │
│       └──► createSetupIntentForUser(userId, email)              │
│            Returns { clientSecret }                             │
│                                                                 │
│  Client mounts <Elements> + <PaymentElement>                    │
│       │                                                         │
│       ▼                                                         │
│  stripe.confirmSetup({ elements, confirmParams })               │
│       │                                                         │
│       └──► Redirects through 3DS if required                    │
│                                                                 │
│  Stripe fires webhook: setup_intent.succeeded                   │
│       │                                                         │
│       └──► handleSetupIntentWebhookSucceeded                    │
│            Stores in payment_methods table with last4/brand     │
└─────────────────────────────────────────────────────────────────┘
```

## What's in the scaffold

### Backend (server)

| File | Purpose |
|---|---|
| [lib/stripe/connect/config.ts](../apps/web/lib/stripe/connect/config.ts) | Product config (thresholds, currencies, account defaults) |
| [lib/stripe/connect/types.ts](../apps/web/lib/stripe/connect/types.ts) | Shared TypeScript types |
| [lib/stripe/connect/accounts.ts](../apps/web/lib/stripe/connect/accounts.ts) | `ensureConnectAccount`, `syncAccountStatus`, `getCachedAccountStatus` |
| [lib/stripe/connect/onboarding.ts](../apps/web/lib/stripe/connect/onboarding.ts) | `createOnboardingLink`, `createDashboardLoginLink` |
| [lib/stripe/connect/payouts.ts](../apps/web/lib/stripe/connect/payouts.ts) | `accumulateEarnings`, `getPayoutBalance`, `processEligiblePayouts` |
| [lib/stripe/elements/setup-intents.ts](../apps/web/lib/stripe/elements/setup-intents.ts) | `createSetupIntentForUser`, `ensureStripeCustomer`, `handleSetupIntentSucceeded` |

### API routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/payments/stripe-connect/onboard` | Create/fetch Connect account + return onboarding URL |
| GET | `/api/payments/stripe-connect/status` | Current account status (cached or fresh with `?refresh=true`) |
| POST | `/api/payments/stripe-connect/dashboard-link` | Express Dashboard login link (tax docs, bank updates) |
| POST | `/api/payments/setup-intent` | Create SetupIntent for Elements |
| GET | `/api/payments/payout-balance` | Current contractor payout balance |
| GET | `/api/cron/contractor-payouts` | Weekly cron: process eligible payouts |

### Webhook handlers added

Extended [stripe-webhook-event-handler.ts](../apps/web/lib/services/stripe-webhook/stripe-webhook-event-handler.ts) to handle:
- `account.updated` — mirrors Connect capability flags to profiles (existing handler enhanced)
- `setup_intent.succeeded` — attaches payment method to customer
- `setup_intent.setup_failed` — records failure for debugging
- `payment_method.detached` — removes PM from local table

### Database migration

[supabase/migrations/20260405000000_stripe_connect_integration.sql](../supabase/migrations/20260405000000_stripe_connect_integration.sql) adds:

- `profiles.stripe_customer_id` (homeowners)
- `profiles.stripe_connect_account_id` + capability flags (contractors)
- `contractor_payout_balances` (threshold accumulator)
- `contractor_payout_transfers` (audit trail)
- `stripe_setup_intents` (Elements flow tracking)

All tables have RLS policies enforcing contractor-only access to their own rows.

## What's NOT in the scaffold (frontend work)

### Contractor onboarding UI
Create `apps/web/app/contractor/payouts/page.tsx`:
- Call `GET /api/payments/stripe-connect/status` on mount
- If no account: show "Set up payouts" button → POST `/onboard` → `window.location = url`
- If onboarded: show status, last payout date, pending balance, "View dashboard" button
- Landing page at `/contractor/payouts/onboarding-complete` after Stripe redirects back

### Homeowner Elements UI
Replace [PaymentMethodForm.tsx](../apps/web/app/contractor/subscription/payment-methods/components/PaymentMethodForm.tsx):

```tsx
'use client';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function PaymentMethodForm() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/setup-intent', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  if (!clientSecret) return <div>Loading…</div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <AddPaymentMethodInner />
    </Elements>
  );
}

function AddPaymentMethodInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account/payment-methods/return`,
      },
    });
    if (error) {
      setSubmitting(false);
      // Show error.message to user
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || submitting}>
        {submitting ? 'Saving…' : 'Save payment method'}
      </button>
    </form>
  );
}
```

## Environment variables required

```bash
# Already configured
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Cron authentication (existing pattern)
CRON_SECRET=...
```

## Cron schedule

Add to `vercel.json` (or your cron provider):

```json
{
  "crons": [
    {
      "path": "/api/cron/contractor-payouts",
      "schedule": "0 9 * * 5"
    }
  ]
}
```

Runs Friday 09:00 UTC. Adjust as needed.

## Testing locally

```bash
# Start Supabase + apply migration
supabase start
supabase db reset

# Install Stripe CLI + forward webhooks
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger account.updated --add account:metadata.contractor_id=<uuid>
stripe trigger setup_intent.succeeded
```

## Next steps (not in scaffold)

1. **Wire up cron in vercel.json** with the entry above
2. **Add frontend pages** (Elements form, contractor onboarding page)
3. **Hook `accumulateEarnings` into escrow release** — call it from `EscrowReleaseAgent` after a successful release instead of (or in addition to) the current direct transfer
4. **List/delete payment-method endpoints** — `GET /api/payments/payment-methods`, `DELETE /api/payments/payment-methods/[id]`
5. **Enable Stripe Tax** in the Stripe Dashboard (Reporting → Tax forms → enable 1099-K generation)
6. **BACS Direct Debit mandate UI** — Stripe's `<PaymentElement>` handles the mandate acceptance automatically when `bacs_debit` is in `payment_method_types`; verify legal copy matches UK requirements
7. **Alerting on failed transfers** — extend `processEligiblePayouts` to emit admin notifications on `failed > 0`
