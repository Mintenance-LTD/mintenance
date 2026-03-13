# Mintenance Payments & Stripe Reference

## Stripe Architecture

### Client Setup
```typescript
// Server-side Stripe client (lazy Proxy, like Supabase)
import stripe from '@/lib/stripe'; // apps/web/lib/stripe.ts
// Uses STRIPE_SECRET_KEY env var
```

### Payment Flow (Job Lifecycle Phases 5 & 10)

#### Phase 5: Payment into Escrow
```
1. Contract accepted -> Homeowner sees "Pay Now" button
2. POST /api/jobs/[id]/payment-intent -> Creates Stripe PaymentIntent
3. Homeowner completes payment via Stripe Elements (PaymentForm component)
4. POST /api/jobs/[id]/confirm-payment -> Confirms payment
5. Escrow record: pending -> held
6. Contractor notified: "Payment secured in escrow"
```

#### Phase 10: Payment Release
```
1. Homeowner approves work (or 7-day auto-release)
2. Escrow status: held -> release_pending
3. System calculates platform fee (5% + Stripe fees)
4. Stripe Transfer created to contractor's connected account
5. Escrow status: release_pending -> released
6. Both parties notified
```

## Payment Services

### Location: `apps/web/lib/services/payment/`

| Service | Purpose |
|---------|---------|
| `EscrowService.ts` | Core escrow operations (hold, release, refund) |
| `FeeCalculationService.ts` | Platform fee calculation (5% base) |
| `FeeTransferService.ts` | Stripe Transfer creation to contractors |
| `PaymentInitialization.ts` | PaymentIntent creation |
| `PaymentConfirmation.ts` | Payment confirmation handling |
| `PaymentValidation.ts` | Input validation for payment operations |
| `PaymentEnforcement.ts` | Business rule enforcement |
| `PaymentReconciliationService.ts` | Cron: Sync payments with Stripe |
| `PayoutService.ts` | Contractor payout processing |
| `PayoutTierService.ts` | Tiered payout schedules |
| `GuaranteeService.ts` | Payment guarantees |
| `types.ts` | Payment type definitions |

### Location: `apps/web/lib/services/escrow/`

| Service | Purpose |
|---------|---------|
| `EscrowAutoReleaseService.ts` | 7-day auto-release logic |
| `EscrowStatusService.ts` | Status transition management |
| `HomeownerApprovalService.ts` | Approval workflow |
| `HomeownerApprovalReminderService.ts` | Reminder notifications |
| `PhotoVerificationService.ts` | Before/after photo quality checks |

## Fee Calculation

```typescript
// 5% platform fee + Stripe processing fees
interface FeeCalculation {
  platformFee: number;      // 5% of job amount
  stripeFee: number;        // Stripe's processing fee
  contractorAmount: number; // job amount - platformFee - stripeFee
  totalFees: number;
}
```

## Escrow State Machine

```
pending -> held           (payment confirmed)
held -> release_pending   (homeowner approves OR 7-day timeout)
release_pending -> released (Stripe Transfer succeeds)
held -> refunded          (dispute/cancellation)
held -> awaiting_homeowner_approval (job completed, waiting review)
```

## Stripe Webhook Handling

**Location**: `apps/web/app/api/webhooks/stripe/route.ts`

**IMPORTANT**: This route does NOT use `withApiHandler` - it needs raw request body for Stripe signature verification.

```typescript
// Webhook events handled:
'payment_intent.succeeded'     // Payment confirmed -> update escrow
'payment_intent.payment_failed' // Payment failed -> notify user
'charge.refunded'              // Refund processed
'transfer.created'             // Payout to contractor
'account.updated'              // Contractor Stripe Connect account update
'invoice.paid'                 // Subscription payment
'invoice.payment_failed'       // Subscription payment failed
'customer.subscription.updated' // Subscription status change
'customer.subscription.deleted' // Subscription cancelled
```

### Webhook Idempotency
```sql
-- webhook_events table with UNIQUE idempotency_key
-- check_webhook_idempotency(key) -> boolean
-- mark_webhook_processed(key) -> void
```

## Stripe Connect (Contractor Payouts)

Contractors must set up a Stripe Connected Account to receive payouts:
1. Admin initiates setup at `/admin/contractors/payment-setup`
2. Stripe account link generated for contractor onboarding
3. Contractor completes KYC/identity verification
4. `contractor_payout_accounts` table tracks account status
5. Payouts via `Stripe.transfers.create()` to connected account

## Payment Components (Frontend)

### PaymentForm (`apps/web/components/payments/PaymentForm.tsx`)
```typescript
// Uses @stripe/react-stripe-js
// Stripe Elements for PCI-compliant card collection
// confirmPayment with redirect: 'if_required'
```

### EmbeddedCheckout (`apps/web/components/payments/EmbeddedCheckout.tsx`)
```typescript
// Stripe Embedded Checkout for full checkout flow
// Fetches client secret from /api/payments/embedded-checkout
```

## Payment API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jobs/[id]/payment-intent` | POST | Create Stripe PaymentIntent |
| `/api/jobs/[id]/confirm-payment` | POST | Confirm payment received |
| `/api/payments/embedded-checkout` | POST | Create embedded checkout session |
| `/api/payments/release-escrow` | POST | Trigger escrow release |
| `/api/payments/process-job-payment` | POST | Process job payment |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/escrow/status` | GET | Escrow status check |

## Cron Jobs (Payment-Related)

| Cron | Schedule | Purpose |
|------|----------|---------|
| `payment-reconciliation` | Daily | Sync payment records with Stripe |
| `payment-setup-reminders` | Daily | Remind contractors to complete Stripe setup |
| `admin-escrow-alerts` | Every 6h | Alert on overdue escrow transactions |

## Testing Payment Flows

```typescript
// Mock Stripe in tests:
const mocks = vi.hoisted(() => ({
  stripePaymentIntentsCreate: vi.fn(),
  stripeRefundsCreate: vi.fn(),
  stripeTransfersCreate: vi.fn(),
  stripeCustomersList: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  default: {
    paymentIntents: { create: mocks.stripePaymentIntentsCreate },
    refunds: { create: mocks.stripeRefundsCreate },
    transfers: { create: mocks.stripeTransfersCreate },
    customers: { list: mocks.stripeCustomersList },
  },
}));
```

## Key Types

```typescript
type EscrowStatus = 'pending' | 'held' | 'release_pending' | 'released' | 'refunded'
  | 'awaiting_homeowner_approval' | 'pending_review' | 'failed' | 'cancelled';

type PaymentStatus = 'pending' | 'processing' | 'in_escrow' | 'released'
  | 'completed' | 'failed' | 'refunded' | 'disputed';

interface ContractorPayoutAccount {
  id: string;
  contractorId: string;
  stripeAccountId: string;
  accountComplete: boolean;
}
```
