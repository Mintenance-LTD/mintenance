# 💳 Payment API Documentation

## Overview

The Mintenance payment system uses **Stripe** for secure payment processing with an **escrow-based** architecture. All payments are held in escrow until job completion, protecting both homeowners and contractors.

---

## 🏗️ Architecture

```
Mobile App → Web API (/api/payments/*) → Stripe API → Database (escrow_transactions)
```

### Flow:
1. **Create Payment Intent** - Homeowner initiates payment
2. **Confirm Payment** - Payment captured by Stripe, funds held in escrow
3. **Complete Job** - Contractor completes work
4. **Release Escrow** - Homeowner confirms completion, funds released
5. **Optional: Refund** - Dispute resolution

---

## 📡 API Endpoints

### Base URL
```
Production: https://your-domain.com/api/payments
Development: http://localhost:3000/api/payments
```

### Authentication
All endpoints require authentication via cookies (JWT session).

---

## 1️⃣ Create Payment Intent

**POST** `/api/payments/create-intent`

Creates a Stripe PaymentIntent and escrow transaction for a job.

### Request Body
```typescript
{
  jobId: string;        // UUID of the job
  amount: number;       // Amount in dollars (e.g., 150.50)
  currency?: string;    // Default: 'usd'
  description?: string; // Optional payment description
}
```

### Response (200 OK)
```typescript
{
  clientSecret: string;          // Stripe client secret for mobile SDK
  paymentIntentId: string;       // Stripe payment intent ID
  escrowTransactionId: string;   // Database escrow transaction ID
  amount: number;
  currency: string;
}
```

### Errors
- `401`: Unauthorized (not logged in)
- `400`: Invalid request body / Job has no contractor
- `403`: Only homeowner can create payment
- `404`: Job not found
- `500`: Server error / Stripe error

### Usage Example (Mobile)
```typescript
const response = await fetch('/api/payments/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 250.00,
    description: 'Plumbing repair job'
  })
});

const { clientSecret } = await response.json();

// Use clientSecret with Stripe SDK
await stripe.confirmPayment(clientSecret, {
  paymentMethodType: 'Card',
});
```

---

## 2️⃣ Confirm Payment Intent

**POST** `/api/payments/confirm-intent`

Confirms payment was successful and updates escrow status to "held".

### Request Body
```typescript
{
  paymentIntentId: string;  // Stripe payment intent ID
  jobId: string;            // UUID of the job
}
```

### Response (200 OK)
```typescript
{
  success: true;
  escrowTransactionId: string;
  status: 'held';
  amount: number;
}
```

### Errors
- `400`: Payment not completed / Payment requires action
- `403`: Unauthorized
- `404`: Job not found
- `500`: Failed to update escrow

---

## 3️⃣ Release Escrow

**POST** `/api/payments/release-escrow`

Releases held funds to the contractor after job completion.

### Request Body
```typescript
{
  jobId: string;
  escrowTransactionId: string;
}
```

### Response (200 OK)
```typescript
{
  success: true;
  escrowTransactionId: string;
  status: 'released';
  amount: number;
  message: 'Funds released successfully';
}
```

### Errors
- `400`: Job not completed / Cannot release escrow with current status
- `403`: Only homeowner can release funds
- `404`: Job or escrow transaction not found
- `500`: Failed to release escrow

### Notes
⚠️ **Production Implementation Required:**
Currently marks escrow as "released" in database only. In production, implement Stripe Connect transfers:

```typescript
const transfer = await stripe.transfers.create({
  amount: Math.round(escrow.amount * 100),
  currency: 'usd',
  destination: contractorStripeAccountId,
  metadata: { jobId, escrowTransactionId },
});
```

---

## 4️⃣ Refund Payment

**POST** `/api/payments/refund`

Processes a full or partial refund for a payment.

### Request Body
```typescript
{
  jobId: string;
  escrowTransactionId: string;
  amount?: number;      // Optional: partial refund amount
  reason?: string;      // Optional: refund reason
}
```

### Response (200 OK)
```typescript
{
  success: true;
  refundId: string;         // Stripe refund ID
  amount: number;           // Refunded amount
  status: 'succeeded';      // Stripe refund status
  escrowTransactionId: string;
}
```

### Errors
- `400`: Cannot refund payment with current status
- `403`: Unauthorized
- `404`: Job or escrow transaction not found
- `500`: Failed to process refund

---

## 5️⃣ Get Payment Methods

**GET** `/api/payments/methods`

Retrieves all saved payment methods for the authenticated user.

### Response (200 OK)
```typescript
{
  paymentMethods: Array<{
    id: string;
    type: 'card';
    card: {
      brand: string;      // e.g., 'visa', 'mastercard'
      last4: string;      // Last 4 digits
      expMonth: number;
      expYear: number;
    };
    billing_details: {
      name?: string;
      email?: string;
      address?: object;
    };
    created: number;      // Unix timestamp
  }>;
  stripeCustomerId: string;
}
```

### Errors
- `401`: Unauthorized
- `404`: User not found
- `500`: Failed to fetch payment methods

---

## 6️⃣ Add Payment Method

**POST** `/api/payments/add-method`

Attaches a payment method to the user's account.

### Request Body
```typescript
{
  paymentMethodId: string;  // From Stripe.js createPaymentMethod()
  setAsDefault?: boolean;   // Default: false
}
```

### Response (200 OK)
```typescript
{
  success: true;
  paymentMethod: {
    id: string;
    type: 'card';
    card: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
  };
  isDefault: boolean;
}
```

### Errors
- `400`: Invalid payment method ID
- `401`: Unauthorized
- `404`: User not found
- `500`: Failed to add payment method

### Usage Example (Mobile)
```typescript
// 1. Create payment method with Stripe SDK
const { paymentMethod } = await stripe.createPaymentMethod({
  paymentMethodType: 'Card',
  card: cardDetails,
});

// 2. Attach to user account
await fetch('/api/payments/add-method', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentMethodId: paymentMethod.id,
    setAsDefault: true
  })
});
```

---

## 7️⃣ Remove Payment Method

**DELETE** `/api/payments/remove-method`

Detaches a payment method from the user's account.

### Request Body
```typescript
{
  paymentMethodId: string;
}
```

### Response (200 OK)
```typescript
{
  success: true;
  paymentMethodId: string;
  message: 'Payment method removed successfully';
}
```

### Errors
- `400`: Payment method not attached to customer
- `401`: Unauthorized
- `500`: Failed to remove payment method

---

## 🗄️ Database Schema

### escrow_transactions
```sql
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### users (additional column)
```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

---

## 🔒 Security Features

✅ **Server-side validation** - All payment processing happens server-side
✅ **Authentication required** - All endpoints require valid session
✅ **Authorization checks** - Verify user owns the job/transaction
✅ **Stripe SCA** - Supports Strong Customer Authentication (3D Secure)
✅ **Escrow protection** - Funds held until job completion
✅ **Audit trail** - All transactions logged in database

---

## 🧪 Testing

### Test Mode Setup
1. Use Stripe test keys in `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Test Card Numbers:**
   - **Success:** `4242 4242 4242 4242`
   - **Requires 3D Secure:** `4000 0027 6000 3184`
   - **Declined:** `4000 0000 0000 0002`
   - **Insufficient funds:** `4000 0000 0000 9995`

3. Use any future expiry date and any 3-digit CVC

### Integration Test Flow
```typescript
// 1. Create payment
const { clientSecret } = await createPaymentIntent({ jobId, amount: 100 });

// 2. Confirm with Stripe SDK (mobile)
await stripe.confirmPayment(clientSecret, { paymentMethodType: 'Card' });

// 3. Confirm on backend
await confirmPaymentIntent({ paymentIntentId, jobId });

// 4. Complete job (update job status)
await updateJobStatus(jobId, 'completed');

// 5. Release funds
await releaseEscrow({ jobId, escrowTransactionId });
```

---

## 🚀 Production Deployment Checklist

### Environment Variables Required
```bash
# Backend (Web App)
STRIPE_SECRET_KEY=sk_live_...        # Stripe secret key
SUPABASE_SERVICE_ROLE_KEY=...        # Supabase admin key

# Mobile App
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Stripe Account Setup
1. ✅ Create Stripe account
2. ✅ Enable payment methods (Cards, Apple Pay, Google Pay)
3. ⚠️ **Set up Stripe Connect** for contractor payouts
4. ⚠️ Configure webhooks for payment events
5. ✅ Enable test mode for development
6. ⚠️ Switch to live mode for production

### Database Migration
Run the migration to add `stripe_customer_id`:
```bash
npx supabase migration up
```

### Webhook Setup (Recommended)
Configure Stripe webhooks to handle:
- `payment_intent.succeeded` - Auto-confirm payments
- `payment_intent.payment_failed` - Handle failures
- `charge.refunded` - Sync refund status

---

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Payment success rate
- Average escrow hold time
- Refund rate
- Failed payment reasons

### Logs to Monitor
- All payment intent creations
- Failed payments (including reason)
- Escrow releases
- Refunds

### Alerts to Configure
- Multiple failed payments for same job
- Escrow held > 30 days
- High refund rate
- Stripe API errors

---

## 🆘 Troubleshooting

### Payment Intent Creation Fails
- ✅ Verify Stripe secret key is correct
- ✅ Check job has assigned contractor
- ✅ Verify user is homeowner of job
- ✅ Check amount is valid (> 0, < $1M)

### Payment Confirmation Fails
- ✅ Verify payment was successful in Stripe dashboard
- ✅ Check payment intent status
- ✅ Ensure escrow transaction exists in database

### Cannot Release Escrow
- ✅ Verify job status is 'completed'
- ✅ Check escrow status is 'held'
- ✅ Ensure user is the homeowner

### Refund Fails
- ✅ Verify payment was captured (not just authorized)
- ✅ Check refund hasn't already been processed
- ✅ Ensure sufficient time hasn't passed (Stripe limits)

---

## 📞 Support

For payment-related issues:
1. Check Stripe dashboard for transaction details
2. Review server logs for API errors
3. Verify database escrow_transactions table
4. Contact Stripe support for payment disputes

---

## 🔄 Migration from Old System

If migrating from a different payment system:

1. **Export existing transactions**
2. **Map to new escrow_transactions schema**
3. **Create Stripe customers for existing users**
4. **Test with small transaction first**
5. **Monitor closely for first 48 hours**

---

**Last Updated:** January 2025
**API Version:** 1.0.0
**Stripe API Version:** 2024-11-20.acacia
