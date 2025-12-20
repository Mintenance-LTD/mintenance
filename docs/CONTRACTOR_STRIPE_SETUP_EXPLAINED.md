# Contractor Stripe Setup - Complete Guide

**Last Updated:** December 16, 2025  
**Purpose:** Comprehensive explanation of how contractors set up and use Stripe in the Mintenance platform

---

## Overview: Two Separate Stripe Systems

Contractors interact with **TWO different Stripe systems** in Mintenance:

1. **Stripe Connect** - For **RECEIVING** payments from homeowners (payouts to bank account)
2. **Payment Methods** - For **PAYING** for platform services (subscriptions, invoices, etc.)

These are completely separate and serve different purposes.

---

## Part 1: Stripe Connect (Receiving Payments)

### What It Is
Stripe Connect allows contractors to receive payments directly into their bank accounts when homeowners pay for completed jobs. This is the contractor's **payout account**.

### How It Works

#### Step 1: Contractor Initiates Setup
1. Contractor navigates to `/contractor/payouts` (or `/contractor/settings` → Payments section)
2. Clicks **"Set Up Payout Account"** button
3. System calls `/api/contractor/payout/setup`

#### Step 2: Stripe Connect Account Creation
1. **API Route** (`apps/web/app/api/contractor/payout/setup/route.ts`):
   - Authenticates contractor
   - Invokes Supabase Edge Function `setup-contractor-payout`

2. **Edge Function** (`supabase/functions/setup-contractor-payout/index.ts`):
   - Creates Stripe Connect **Express account** for the contractor
   - Determines country code from contractor's profile (defaults to GB/UK)
   - Creates account with:
     - Type: `express` (simplified onboarding)
     - Country: Based on contractor's country field
     - Email: Contractor's email
     - Capabilities: `card_payments`, `transfers`
     - Business type: `individual`
   - Generates Stripe onboarding link
   - Saves to database:
     - `users.stripe_connect_account_id` = Stripe account ID
     - `contractor_payout_accounts.stripe_account_id` = Stripe account ID
     - `contractor_payout_accounts.account_complete` = `false` (initially)

#### Step 3: Stripe Onboarding
1. Contractor is redirected to Stripe's hosted onboarding page
2. Contractor completes:
   - **Identity verification** (KYC - Know Your Customer)
   - **Bank account details** (where they want to receive payouts)
   - **Tax information** (if required)
3. Stripe handles all compliance and verification

#### Step 4: Webhook Sync
1. When contractor completes onboarding, Stripe sends `account.updated` webhook
2. **Webhook Handler** (`apps/web/app/api/webhooks/stripe/route.ts`):
   - Checks if account is fully onboarded:
     - `details_submitted` = true
     - `charges_enabled` = true
     - `payouts_enabled` = true
   - Updates database:
     - `contractor_payout_accounts.account_complete` = `true`
     - Syncs `users.stripe_connect_account_id`

#### Step 5: Verification Check
When a homeowner tries to accept a contractor's bid:
- System checks if contractor has completed Stripe Connect setup
- **API Route** (`apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts`):
  - Verifies `stripe_connect_account_id` exists
  - Checks `contractor_payout_accounts.account_complete`
  - If incomplete, directly queries Stripe API to verify status
  - Updates database if Stripe confirms completion but DB doesn't

### Database Tables

**`users` table:**
- `stripe_connect_account_id` (text) - Stripe Connect account ID (e.g., `acct_1234...`)

**`contractor_payout_accounts` table:**
- `contractor_id` (uuid) - References `users.id`
- `stripe_account_id` (text) - Same as `stripe_connect_account_id`
- `account_complete` (boolean) - Whether onboarding is complete
- `created_at`, `updated_at` (timestamps)

### Payment Flow After Setup

1. **Homeowner pays for job** (escrow payment)
2. **Job completed and approved**
3. **Escrow released** (`/api/payments/release-escrow`)
4. **Payment transferred** to contractor's Stripe Connect account
5. **Stripe automatically pays out** to contractor's bank account
   - Payout schedule: Daily, weekly, or monthly (configured in Stripe Dashboard)
   - Default: Daily payouts (next business day)

### Key Files

- **Setup API**: `apps/web/app/api/contractor/payout/setup/route.ts`
- **Edge Function**: `supabase/functions/setup-contractor-payout/index.ts`
- **Webhook Handler**: `apps/web/app/api/webhooks/stripe/route.ts` (handles `account.updated`)
- **Payouts Page**: `apps/web/app/contractor/payouts/page.tsx`
- **Accept Bid Check**: `apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts`

---

## Part 2: Payment Methods (Paying for Services)

### What It Is
Payment methods are credit/debit cards that contractors use to **pay for platform services** like:
- Subscription plans (Basic, Professional, Enterprise)
- Platform fees
- Invoices
- Any charges to the contractor

### How It Works

#### Step 1: Contractor Adds Payment Method
1. Contractor navigates to `/contractor/settings` → **Payments** section
2. Clicks **"+ Add new card"** button
3. Stripe Elements form appears (secure card input)
4. Contractor enters card details

#### Step 2: Payment Method Creation
1. **Client-side** (`apps/web/app/settings/payment-methods/components/AddPaymentMethodForm.tsx`):
   - Uses Stripe Elements to securely collect card info
   - Creates payment method via Stripe.js: `stripe.createPaymentMethod()`
   - Sends payment method ID to backend

2. **API Route** (`apps/web/app/api/payments/add-method/route.ts`):
   - Authenticates user
   - Gets or creates Stripe **Customer** (different from Connect account!)
   - Attaches payment method to customer
   - Optionally sets as default payment method
   - Saves `stripe_customer_id` to `users.stripe_customer_id`

#### Step 3: Payment Method Storage
- Payment methods are stored in **Stripe**, not in our database
- We only store:
  - `users.stripe_customer_id` - Links user to their Stripe Customer
- Payment method details (last4, brand, expiry) are fetched from Stripe when needed

#### Step 4: Using Payment Methods
When contractor needs to pay for something:
1. System retrieves contractor's payment methods from Stripe
2. Uses default payment method or prompts contractor to select one
3. Creates payment intent or subscription with the selected payment method
4. Stripe processes the payment

### Database Tables

**`users` table:**
- `stripe_customer_id` (text) - Stripe Customer ID (e.g., `cus_1234...`)
  - This is different from `stripe_connect_account_id`!
  - Used for charging the contractor (subscriptions, fees)

**No separate table for payment methods** - they're stored in Stripe and retrieved via API

### Key Files

- **Add Payment Method**: `apps/web/app/api/payments/add-method/route.ts`
- **List Payment Methods**: `apps/web/app/api/payments/methods/route.ts`
- **Remove Payment Method**: `apps/web/app/api/payments/remove-method/route.ts`
- **Set Default**: `apps/web/app/api/payments/set-default/route.ts`
- **Settings Page**: `apps/web/app/contractor/settings/page.tsx` (Payments section)
- **Form Component**: `apps/web/app/settings/payment-methods/components/AddPaymentMethodForm.tsx`

---

## Key Differences Summary

| Feature | Stripe Connect | Payment Methods |
|---------|---------------|-----------------|
| **Purpose** | Receive payments FROM homeowners | Pay FOR platform services |
| **Account Type** | Stripe Connect Express Account | Stripe Customer |
| **Database Field** | `users.stripe_connect_account_id` | `users.stripe_customer_id` |
| **Setup Location** | `/contractor/payouts` | `/contractor/settings` → Payments |
| **What It Links To** | Contractor's bank account | Contractor's credit/debit cards |
| **Used For** | Job payments, escrow releases | Subscriptions, platform fees |
| **Stripe Object** | `Account` (Connect) | `Customer` + `PaymentMethod` |
| **Onboarding** | Full Stripe onboarding flow | Simple card entry form |

---

## Common Scenarios

### Scenario 1: New Contractor Setup
1. Contractor signs up
2. **Stripe Connect**: Sets up payout account at `/contractor/payouts`
   - Creates Stripe Connect account
   - Completes onboarding
   - Can now receive payments
3. **Payment Methods**: Adds credit card at `/contractor/settings` → Payments
   - Creates Stripe Customer
   - Adds payment method
   - Can now pay for subscriptions

### Scenario 2: Contractor Gets Paid
1. Homeowner accepts contractor's bid
2. Homeowner pays (escrow)
3. Job completed
4. Escrow released to contractor's **Stripe Connect account**
5. Stripe automatically pays out to contractor's bank account

### Scenario 3: Contractor Pays Subscription
1. Contractor upgrades to Professional plan
2. System uses contractor's **default payment method** (from Stripe Customer)
3. Creates Stripe subscription
4. Charges contractor's card monthly

### Scenario 4: Homeowner Tries to Accept Bid
1. System checks: Does contractor have `stripe_connect_account_id`?
2. System checks: Is `account_complete` = true?
3. If not, queries Stripe API directly to verify
4. If still incomplete, shows error: "Contractor must complete payment setup"
5. Contractor must complete Stripe Connect onboarding before bid can be accepted

---

## Troubleshooting

### "Payment setup required" error when accepting bid
- **Cause**: Contractor hasn't completed Stripe Connect onboarding
- **Solution**: Contractor must go to `/contractor/payouts` and complete setup
- **Check**: `contractor_payout_accounts.account_complete` should be `true`

### Payment method not showing
- **Cause**: Payment methods are stored in Stripe, not database
- **Solution**: Check `users.stripe_customer_id` exists, then query Stripe API
- **API**: `GET /api/payments/methods` retrieves from Stripe

### Can't remove default payment method
- **Cause**: System prevents removing the default payment method
- **Solution**: Set another payment method as default first, then remove

### Stripe Connect account exists but not marked complete
- **Cause**: Webhook may have failed or not fired
- **Solution**: System automatically checks Stripe API when accepting bid
- **Manual Fix**: Query Stripe API and update `account_complete` if needed

---

## Environment Variables Required

```env
# Stripe API Keys (same account for both systems)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...

# Stripe Webhooks
STRIPE_WEBHOOK_SECRET=whsec_... (for webhook signature verification)

# Supabase (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (for invoking Edge Functions)
SUPABASE_URL=https://...
APP_URL=https://... (for Stripe Connect return URLs)
```

---

## Testing

### Test Mode
- Use Stripe test mode keys (`sk_test_...`, `pk_test_...`)
- Test cards: `4242 4242 4242 4242` (Visa, succeeds)
- Test Connect accounts: Use test mode onboarding flow

### Production
- Use Stripe live mode keys (`sk_live_...`, `pk_live_...`)
- Real bank accounts required for Connect
- Real cards required for payment methods
- Webhooks must be configured in Stripe Dashboard

---

## Security Notes

1. **Never expose** `STRIPE_SECRET_KEY` in client-side code
2. **Always verify** webhook signatures using `STRIPE_WEBHOOK_SECRET`
3. **Use CSRF protection** on all payment-related API routes
4. **Validate** user ownership before accessing payment methods
5. **Rate limit** payment API endpoints to prevent abuse

---

## Summary

- **Stripe Connect** = Contractor's bank account to **receive** money
- **Payment Methods** = Contractor's cards to **pay** for services
- Both systems are separate but work together to enable full payment functionality
- Contractors need both to fully use the platform:
  - Connect account to get paid for jobs
  - Payment methods to pay for subscriptions/fees
