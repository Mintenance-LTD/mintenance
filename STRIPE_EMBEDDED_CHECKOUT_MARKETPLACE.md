# Stripe Embedded Checkout - Marketplace Payment Integration ✅

**Date:** January 30, 2025  
**Status:** Updated for Marketplace Payments with Escrow

---

## 🎯 Overview

The Stripe Embedded Checkout integration has been **updated to support your marketplace payment flow** with:

✅ **Escrow Transactions** - Funds held until job completion  
✅ **Platform Fees** - 5% fee (min $0.50, max $50) automatically calculated  
✅ **Stripe Connect** - Contractor payouts handled via Connect accounts  
✅ **Fee Tracking** - Platform fees tracked in database  
✅ **Webhook Integration** - Automatic escrow updates on payment completion  

---

## 🔄 How It Works

### Marketplace Payment Flow

1. **Homeowner initiates payment** via Embedded Checkout
2. **Checkout Session created** with:
   - Full amount charged to platform account
   - Escrow transaction created in database
   - Platform fee calculated and stored in metadata
   - Contractor Stripe Connect account ID stored for later payout

3. **Payment completes** → Webhook `checkout.session.completed` fires
4. **Escrow updated** to `held` status with payment intent ID
5. **Job completion** → Escrow released via existing `/api/payments/release-escrow`
6. **Contractor payout** → Transfer created (amount - platform fee) to contractor's Connect account

### Key Differences from Payment Intents

| Feature | Payment Intents | Embedded Checkout |
|---------|----------------|-------------------|
| **UI** | Custom form | Stripe-hosted embedded form |
| **Escrow** | ✅ Created immediately | ✅ Created on session creation |
| **Platform Fees** | ✅ Calculated on release | ✅ Calculated upfront |
| **Connect Payouts** | ✅ Via transfers on release | ✅ Via transfers on release |
| **Webhook** | `payment_intent.succeeded` | `checkout.session.completed` |

---

## 📋 API Usage

### Create Embedded Checkout Session

**Endpoint:** `POST /api/payments/embedded-checkout`

**Request Body:**
```json
{
  "priceId": "price_1234567890",
  "jobId": "uuid-optional",
  "contractorId": "uuid-optional",
  "quantity": 1,
  "paymentType": "final" // "deposit" | "final" | "milestone"
}
```

**Response:**
```json
{
  "clientSecret": "cs_test_...",
  "sessionId": "cs_test_...",
  "isMarketplacePayment": true
}
```

### Marketplace Payment Requirements

When `jobId` is provided:
- ✅ Validates homeowner owns the job
- ✅ Verifies contractor has Stripe Connect account set up
- ✅ Calculates platform fee (5% with min/max)
- ✅ Creates escrow transaction
- ✅ Stores contractor account ID for later payout

---

## 🔗 Integration Points

### 1. Escrow Transaction Creation

When a marketplace payment is created, an escrow transaction is immediately created:

```typescript
{
  job_id: jobId,
  amount: totalAmount,
  status: 'pending',
  payment_type: paymentType,
  stripe_checkout_session_id: session.id,
}
```

### 2. Webhook Handler

The `checkout.session.completed` webhook:
- Updates escrow status to `held`
- Links payment intent ID
- Stores platform fee and contractor payout amounts
- Updates job payment status to `paid`

### 3. Escrow Release (Existing Flow)

When escrow is released via `/api/payments/release-escrow`:
- Calculates fees using `FeeCalculationService`
- Creates Stripe Connect transfer to contractor (amount - platform fee)
- Creates platform fee transfer record
- Updates escrow status to `released`

---

## 💰 Fee Calculation

Platform fees are calculated using your existing `FeeCalculationService`:

- **Rate:** 5% for all payment types (deposit, final, milestone)
- **Minimum:** $0.50
- **Maximum:** $50.00
- **Stripe Fee:** 2.9% + $0.30 (tracked separately)

**Example:**
- Payment: $100.00
- Platform Fee: $5.00 (5% of $100)
- Stripe Fee: $3.20 (2.9% + $0.30)
- Contractor Payout: $94.80 ($100 - $5.00 platform fee)
- Net Platform Revenue: $1.80 ($5.00 - $3.20)

---

## 🔒 Security Features

✅ **CSRF Protection** - All API routes protected  
✅ **Authentication** - User must be logged in  
✅ **Authorization** - Homeowner must own the job  
✅ **Validation** - Job ownership and contractor verification  
✅ **Idempotency** - Prevents duplicate payments  
✅ **Webhook Verification** - Signature verification on all webhooks  

---

## 📊 Database Schema

### Escrow Transactions

The integration uses your existing `escrow_transactions` table:

- `stripe_checkout_session_id` - Links to Checkout Session
- `stripe_payment_intent_id` - Links to Payment Intent (set by webhook)
- `platform_fee` - Calculated platform fee
- `contractor_payout` - Amount contractor will receive
- `status` - `pending` → `held` → `released`

### Platform Fee Transfers

Platform fees are tracked in `platform_fee_transfers` table (created on escrow release).

---

## 🧪 Testing

### Test Cards

- **Success:** `4242 4242 4242 4242`
- **Requires Auth:** `4000 0025 0000 3155`
- **Declined:** `4000 0000 0000 9995`

### Test Flow

1. Create a test Price in Stripe Dashboard
2. Create a job with an assigned contractor
3. Ensure contractor has Stripe Connect account set up
4. Call `/api/payments/embedded-checkout` with `jobId` and `priceId`
5. Complete payment with test card
6. Verify webhook updates escrow transaction
7. Release escrow and verify contractor receives payout

---

## ⚠️ Important Notes

### Escrow vs Direct Payments

- **With `jobId`:** Creates escrow transaction, funds held until release
- **Without `jobId`:** Simple payment, no escrow, no marketplace fees

### Stripe Connect Account Required

For marketplace payments, the contractor **must** have:
- `users.stripe_connect_account_id` set
- Stripe Connect account fully onboarded

If missing, the API returns: `"Contractor has not set up payment account"`

### Platform Fee Timing

- **Calculated:** At checkout session creation
- **Stored:** In escrow transaction metadata
- **Applied:** When escrow is released (via existing release flow)

---

## 🔄 Migration from Payment Intents

If you want to migrate from Payment Intents to Embedded Checkout:

1. **Replace** `/api/payments/create-intent` calls with `/api/payments/embedded-checkout`
2. **Update** client components to use `EmbeddedCheckoutComponent`
3. **Webhooks** already handle both (Payment Intents and Checkout Sessions)
4. **Escrow release** works the same for both payment methods

---

## ✅ Summary

The Embedded Checkout integration now fully supports your marketplace payment model:

- ✅ Homeowner payments via embedded form
- ✅ Escrow transactions created and tracked
- ✅ Platform fees calculated (5% with min/max)
- ✅ Contractor payouts via Stripe Connect
- ✅ Fee transfers tracked in database
- ✅ Webhook integration for automatic updates

**The integration is production-ready for marketplace payments!** 🎉

