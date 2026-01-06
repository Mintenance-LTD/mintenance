# Stripe Connect Payout System - Internal Flow Documentation

## Overview

Mintenance uses **Stripe Connect Express Accounts** to handle contractor payouts. This allows contractors to receive payments directly from customers while you (the platform) take a commission.

## How It Works - The Complete Flow

### 1. **Contractor Setup** (One-Time)

When a contractor clicks "Set Up Payout Account":

```
Contractor → API Route → Supabase Edge Function → Stripe API
```

**What happens:**
1. Contractor clicks button on `/contractor/payouts` page
2. API route `/api/contractor/payout/setup` is called
3. Edge Function `setup-contractor-payout` creates a Stripe Connect Express account
4. Contractor data is sent to Stripe:
   - Email
   - Name (first_name, last_name)
   - Country (defaults to GB/UK)
   - Account type: Express (Stripe manages compliance)

5. **Database Updates:**
   - `contractor_payout_accounts` table: New row with `stripe_account_id`
   - `users` table: Updated with `stripe_connect_account_id`

6. Contractor is redirected to Stripe's hosted onboarding form
7. After completing the form, they return to `/contractor/payout/success`

### 2. **What Appears in YOUR Stripe Dashboard**

**Connected Accounts Section:**
- Each contractor appears as a separate "Connected Account"
- You'll see:
  - Account ID (e.g., `acct_1234567890`)
  - Contractor name and email
  - Account status: Incomplete → Complete
  - Payout schedule
  - Balance (their earnings)

**Important:**
- Contractors do NOT see your Stripe dashboard
- They manage their payout details through Stripe's interface (bank account, debit card, etc.)
- You CANNOT see their bank account details (Stripe handles this securely)

### 3. **Payment Flow - When a Job is Completed**

```
Customer pays → Platform (you) → Hold in escrow → Transfer to contractor
```

**Step by step:**

1. **Customer Payment:**
   ```typescript
   // Customer pays for a job
   Amount: £1000
   Stripe processes payment to YOUR account
   ```

2. **Platform Fees Calculated:**
   ```typescript
   Platform Fee: 5% (capped at £50)  = £50
   Stripe Fee: 2.9% + £0.30          = £29.30
   Contractor Receives:               = £920.70
   ```

3. **Transfer to Contractor:**
   - After job completion, funds are transferred from your Stripe balance to contractor's Connect account
   - Uses Stripe's `Transfer` API:
   ```typescript
   await stripe.transfers.create({
     amount: 92070, // £920.70 in pence
     currency: 'gbp',
     destination: contractor.stripe_connect_account_id,
     description: 'Payment for Job #12345',
   });
   ```

4. **Contractor Receives Money:**
   - Funds appear in contractor's Stripe balance
   - Stripe automatically pays out to their bank account based on their payout schedule:
     - **Elite tier:** Daily payouts (next day)
     - **Trusted tier:** Weekly payouts
     - **Standard tier:** Monthly payouts

### 4. **Database Schema**

**contractor_payout_accounts table:**
```sql
{
  id: UUID,
  contractor_id: UUID (references users.id),
  stripe_account_id: STRING (e.g., 'acct_1234567890'),
  account_complete: BOOLEAN,
  account_type: 'bank_account' | 'paypal' | 'venmo' | 'zelle',
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

**users table (contractor fields):**
```sql
{
  stripe_connect_account_id: STRING,
  payout_tier: 'elite' | 'trusted' | 'standard',
  payout_speed_hours: INTEGER (24, 168, 720)
}
```

### 5. **What You See in Stripe Dashboard**

#### **Home / Today Tab:**
- **Gross volume**: Total payments received from customers
- **Payouts**: Money leaving your account (to contractors)
- **Balance**: Money held before transferring to contractors

#### **Connect / Accounts Tab:**
You'll see a list of all contractor accounts:
```
John Smith
acct_1234567890
Active • Complete
Balance: £920.70
```

#### **Payments Tab:**
- All customer payments appear here
- Shows: Amount, Customer, Status, Fees

#### **Transfers Tab:**
- All transfers to contractors appear here
- Shows: Amount, Destination (contractor), Date, Status

### 6. **Example Money Flow**

**Scenario:** Customer pays £1000 for plumbing job

1. **Day 1:** Customer payment
   ```
   Your Stripe Balance: +£1000
   Customer charged: £1000
   Status: Held in escrow
   ```

2. **Day 3:** Job completed, contractor approved
   ```
   Platform calculates fees:
   - Platform fee: £50 (5%)
   - Stripe fee: £29.30 (2.9% + £0.30)
   - Contractor amount: £920.70

   Your Stripe Balance: -£920.70 (transfer to contractor)
   Your Revenue: £50 (platform fee)
   Contractor Balance: +£920.70
   ```

3. **Day 4-7:** Stripe pays contractor
   ```
   Contractor's bank account: +£920.70
   (Timing depends on their payout tier)
   ```

### 7. **Webhook Handling**

Your system listens for Stripe webhooks at `/api/webhooks/stripe`:

**Key events:**
- `account.updated`: Contractor completes onboarding
- `transfer.created`: Money sent to contractor
- `transfer.paid`: Contractor received payout
- `payout.paid`: Contractor's bank received funds

### 8. **Security & Compliance**

**What Stripe Handles:**
- KYC (Know Your Customer) verification
- Tax compliance (1099 forms in US)
- Bank account verification
- Identity verification
- Fraud prevention

**What You Handle:**
- Contractor approval (who can receive payouts)
- Fee calculation
- Payment timing (when to release escrow)
- Dispute resolution

### 9. **Testing with Your Test Keys**

Your test keys from the Stripe dashboard:
```
Publishable: pk_test_51SDXwQJmZpzAEZO8...
Secret: sk_test_51SDXwQJmZpzAEZO8...
```

**To test:**
1. Use test mode in Stripe dashboard
2. Create contractor account (will use test mode)
3. Use test card numbers: `4242 4242 4242 4242`
4. Complete test transfers
5. Check "Connect → Accounts" to see test contractors

### 10. **Going Live**

When ready for production:
1. Switch to live API keys in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
2. Update Supabase Edge Function secrets with live keys
3. Complete Stripe account verification
4. Enable live mode in Stripe dashboard
5. Real contractors will go through real verification
6. Real money will be transferred

## Summary

**In Your Stripe Dashboard:**
- ✅ See all contractor accounts
- ✅ See all payments from customers
- ✅ See all transfers to contractors
- ✅ Monitor balances and fees
- ✅ Handle disputes and refunds

**You Will NOT See:**
- ❌ Contractor bank account details
- ❌ Contractor SSN/tax info
- ❌ Direct access to contractor funds

**Stripe Manages:**
- Identity verification
- Compliance
- Bank payouts
- Tax reporting
- Fraud prevention

**You Manage:**
- Who gets paid
- How much (after fees)
- When (job completion)
- Your platform fee (5%)
