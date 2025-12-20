# Stripe Webhook Setup Guide

**Date:** October 6, 2025
**Status:** ✅ Production Ready

---

## Overview

This guide explains how to set up Stripe webhooks for the Mintenance application. Webhooks are critical for receiving real-time notifications about payment events from Stripe.

**Webhook Endpoint:** `https://yourdomain.com/api/webhooks/stripe`

---

## 🚀 Quick Setup (Development)

### **1. Install Stripe CLI**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### **2. Login to Stripe**

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### **3. Forward Webhooks to Local Server**

```bash
# Forward webhooks to your local Next.js server
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

**Copy the webhook signing secret** from the output:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
```

### **4. Add Webhook Secret to Environment**

Update `apps/web/.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### **5. Restart Your Development Server**

```bash
cd apps/web
npm run dev -- -p 3002
```

### **6. Test the Webhook**

In a new terminal, trigger a test event:
```bash
stripe trigger payment_intent.succeeded
```

Check your server logs for:
```
[Webhook] Received event: payment_intent.succeeded
[Webhook] Payment succeeded: pi_xxxxx
```

---

## 🌐 Production Setup

### **1. Configure Stripe Dashboard Webhook**

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your production URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
   - ✅ `charge.refunded`

5. Click **"Add endpoint"**

### **2. Get Webhook Signing Secret**

1. Click on your newly created webhook
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_`)

### **3. Add to Production Environment**

Add to your production environment variables:
```bash
STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
```

**For Vercel:**
```bash
vercel env add STRIPE_WEBHOOK_SECRET production
```

**For other platforms:**
Add via your hosting platform's environment variable settings.

### **4. Test Production Webhook**

1. In Stripe Dashboard, go to your webhook endpoint
2. Click **"Send test webhook"**
3. Select event type: `payment_intent.succeeded`
4. Click **"Send test webhook"**
5. Check the response (should be `200 OK`)

---

## 📊 Supported Webhook Events

### **payment_intent.succeeded**
**Triggered:** When a payment is successfully completed

**Actions:**
- Updates escrow transaction status to `held`
- Updates job payment status to `paid`
- Payment is held in escrow until job completion

**Example Event:**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxxxx",
      "amount": 15000,
      "status": "succeeded"
    }
  }
}
```

---

### **payment_intent.payment_failed**
**Triggered:** When a payment fails

**Actions:**
- Updates escrow transaction status to `failed`
- Allows user to retry payment

**Example Event:**
```json
{
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_xxxxx",
      "status": "requires_payment_method",
      "last_payment_error": {
        "message": "Your card was declined"
      }
    }
  }
}
```

---

### **payment_intent.canceled**
**Triggered:** When a payment intent is canceled

**Actions:**
- Updates escrow transaction status to `canceled`
- Frees up the escrow record

**Example Event:**
```json
{
  "type": "payment_intent.canceled",
  "data": {
    "object": {
      "id": "pi_xxxxx",
      "status": "canceled"
    }
  }
}
```

---

### **charge.refunded**
**Triggered:** When a charge is refunded

**Actions:**
- Updates escrow transaction status to `refunded`
- Marks payment as returned to customer

**Example Event:**
```json
{
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_xxxxx",
      "amount_refunded": 15000,
      "refunded": true
    }
  }
}
```

---

## 🔒 Security Features

### **1. Signature Verification**
Every webhook request is verified using Stripe's signature verification:

```typescript
const event = stripe.webhooks.constructEvent(
  body,              // Raw request body
  signature,         // Stripe-Signature header
  webhookSecret      // Your webhook secret
);
```

**Benefits:**
- Prevents unauthorized webhook calls
- Ensures webhook authenticity
- Protects against replay attacks

### **2. Error Handling**
- Invalid signatures return `400 Bad Request`
- Missing secrets return `500 Internal Server Error`
- Database errors are logged and don't expose sensitive data

### **3. Idempotency**
- Webhook handlers are idempotent (safe to retry)
- Duplicate events won't cause double-processing

---

## 🧪 Testing Webhooks

### **Test with Stripe CLI**

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test refund
stripe trigger charge.refunded
```

### **Monitor Webhook Logs**

Development:
```bash
# In terminal where Stripe CLI is running
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

Production:
- Check Stripe Dashboard → Developers → Webhooks → [Your endpoint] → "Recent events"
- Check your application server logs

---

## 🐛 Troubleshooting

### **Problem: "Webhook signature verification failed"**

**Cause:** Incorrect webhook secret or body parsing issue

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correctly set
2. Ensure you're using the secret for the correct environment (test/live)
3. Check that body parser is disabled (already configured)

---

### **Problem: "No escrow transaction found"**

**Cause:** Payment intent has no corresponding escrow record

**Solution:**
1. Ensure escrow transaction is created before payment
2. Verify `stripe_payment_intent_id` matches
3. Check database for orphaned records

---

### **Problem: Webhook times out**

**Cause:** Webhook handler takes too long (>30 seconds)

**Solution:**
1. Move slow operations to background jobs
2. Return `200 OK` quickly
3. Process asynchronously if needed

---

### **Problem: Duplicate webhook events**

**Cause:** Stripe retries failed webhooks

**Solution:**
- Webhook handlers are already idempotent
- Duplicate events won't cause issues
- Check for database unique constraints

---

## 📈 Monitoring

### **Check Webhook Health**

**Development:**
```bash
curl http://localhost:3002/api/webhooks/stripe
# Should return: 405 Method Not Allowed (GET not supported)
```

**Production:**
```bash
curl https://yourdomain.com/api/webhooks/stripe
# Should return: 405 Method Not Allowed
```

### **Stripe Dashboard Metrics**

Monitor in Stripe Dashboard:
- Success rate (should be >99%)
- Average response time (should be <3 seconds)
- Failed events (investigate any failures)

---

## 🔄 Webhook Flow

```
1. User completes payment in app
   ↓
2. Payment intent created in Stripe
   ↓
3. User confirms payment (card processing)
   ↓
4. Stripe processes payment
   ↓
5. Stripe sends webhook: payment_intent.succeeded
   ↓
6. Our webhook handler verifies signature
   ↓
7. Update escrow transaction status to 'held'
   ↓
8. Update job payment_status to 'paid'
   ↓
9. Return 200 OK to Stripe
   ↓
10. Job proceeds to 'in_progress' status
```

---

## ✅ Verification Checklist

Before going to production, verify:

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` set in production environment
- [ ] All 4 event types selected in Stripe Dashboard
- [ ] Test webhook sends successfully (200 OK)
- [ ] Server logs show webhook events being received
- [ ] Escrow transactions update correctly
- [ ] Job payment status updates correctly
- [ ] Error handling tested (invalid signature, missing data)

---

## 📝 Environment Variables

**Required for webhooks:**
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Webhook Secret (CRITICAL)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## 📊 Database Requirements

**Required Database Migrations:**

The webhook handler requires the `payment_status` column in the `jobs` table. This column has been added via migration:

**Migration:** `supabase/migrations/20250106000001_add_payment_status_to_jobs.sql`

```sql
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE jobs
ADD CONSTRAINT IF NOT EXISTS jobs_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed', 'canceled'));
```

**Valid Payment Statuses:**
- `pending` - Default status, payment not yet processed
- `paid` - Payment successfully completed
- `refunded` - Payment refunded to customer
- `failed` - Payment failed to process
- `canceled` - Payment intent canceled

**Apply Migration:**
To apply this migration to your database, run:
```bash
# For hosted Supabase database
npx supabase db push

# For local development (requires Docker)
npx supabase db reset
```

---

## 🚀 Deployment Notes

### **Vercel/Netlify/Similar**
- Webhook endpoint works automatically
- Add `STRIPE_WEBHOOK_SECRET` to environment variables
- No special configuration needed

### **Docker/VPS**
- Ensure port is accessible from internet
- Configure firewall to allow Stripe's IP ranges
- Use HTTPS (required by Stripe)

### **Load Balancers**
- Don't timeout webhooks early (allow 30s)
- Don't modify request body
- Preserve `stripe-signature` header

---

**Setup Complete!** 🎉

Your Stripe webhook integration is now production-ready. All payment events will be automatically processed and escrow transactions will be updated in real-time.

For support, see:
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
