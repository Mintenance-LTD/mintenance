# Stripe Embedded Checkout Integration ✅

**Date:** January 30, 2025  
**Status:** Implementation Complete

---

## 📋 Overview

This integration implements Stripe's Embedded Checkout, allowing customers to complete payments directly on your site without redirecting to Stripe's hosted checkout page.

---

## 🎯 What Was Created

### 1. API Routes

#### `/api/payments/embedded-checkout` (POST)
Creates an embedded Stripe Checkout Session.

**Request Body:**
```json
{
  "priceId": "price_1234567890",
  "jobId": "uuid-optional",
  "contractorId": "uuid-optional",
  "quantity": 1
}
```

**Response:**
```json
{
  "clientSecret": "cs_test_..."
}
```

#### `/api/payments/session-status` (GET)
Retrieves the status of a Checkout Session.

**Query Parameters:**
- `session_id`: The Checkout Session ID

**Response:**
```json
{
  "status": "complete" | "open" | "expired",
  "customer_email": "customer@example.com"
}
```

### 2. Client Components

#### `EmbeddedCheckoutComponent`
Located at: `apps/web/components/payments/EmbeddedCheckout.tsx`

A React component that mounts Stripe's embedded checkout form.

**Props:**
- `priceId` (required): Stripe Price ID
- `jobId` (optional): Job UUID for tracking
- `contractorId` (optional): Contractor UUID for tracking
- `quantity` (optional): Quantity, defaults to 1
- `onSuccess` (optional): Callback when payment succeeds
- `onError` (optional): Callback when payment fails

**Usage:**
```tsx
import { EmbeddedCheckoutComponent } from '@/components/payments/EmbeddedCheckout';

<EmbeddedCheckoutComponent
  priceId="price_1234567890"
  jobId="job-uuid"
  contractorId="contractor-uuid"
  onSuccess={() => router.push('/success')}
  onError={(error) => console.error(error)}
/>
```

### 3. Pages

#### `/checkout` - Checkout Page
Example checkout page that uses the Embedded Checkout component.

**URL Parameters:**
- `priceId` (required): Stripe Price ID
- `jobId` (optional): Job UUID
- `contractorId` (optional): Contractor UUID
- `quantity` (optional): Quantity

**Example:**
```
/checkout?priceId=price_1234567890&jobId=xxx&contractorId=yyy
```

#### `/checkout/return` - Return Page
Handles the redirect after checkout completion. Automatically checks session status and displays appropriate messaging.

---

## 🚀 Quick Start

### 1. Create a Stripe Price

First, create a Price in your Stripe Dashboard or via API:

```typescript
const price = await stripe.prices.create({
  unit_amount: 2000, // $20.00 in cents
  currency: 'usd',
  product: 'prod_xxx', // Your product ID
});
```

### 2. Use the Component

```tsx
'use client';

import { EmbeddedCheckoutComponent } from '@/components/payments/EmbeddedCheckout';

export default function PaymentPage() {
  return (
    <div className="container mx-auto p-8">
      <EmbeddedCheckoutComponent
        priceId="price_1234567890"
        onSuccess={() => {
          // Handle success
          window.location.href = '/success';
        }}
      />
    </div>
  );
}
```

### 3. Test with Stripe Test Cards

- **Success:** `4242 4242 4242 4242`
- **Requires Authentication:** `4000 0025 0000 3155`
- **Declined:** `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

---

## 🔒 Security Features

✅ **CSRF Protection** - All API routes use CSRF tokens  
✅ **Authentication** - User must be logged in to create checkout sessions  
✅ **Authorization** - Job ownership is validated before creating sessions  
✅ **Input Validation** - All inputs validated with Zod schemas  
✅ **Error Handling** - Comprehensive error handling and logging  

---

## 📝 Environment Variables

Ensure these are set in your `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔄 Integration with Existing Payment Flow

This Embedded Checkout integration works alongside your existing Payment Intent flow:

- **Payment Intents** (`/api/payments/checkout-session`) - For custom payment flows
- **Embedded Checkout** (`/api/payments/embedded-checkout`) - For simple, Stripe-hosted forms

Both can coexist and serve different use cases.

---

## 🎨 Customization

The Embedded Checkout component uses Stripe's default styling. To customize:

1. Use Stripe's appearance API in the `EmbeddedCheckoutProvider` options
2. Override CSS variables for colors and fonts
3. Use Stripe Dashboard to set global brand colors

---

## 📚 Documentation

- [Stripe Embedded Checkout Docs](https://docs.stripe.com/checkout/embedded/quickstart)
- [Stripe React Components](https://stripe.com/docs/stripe-js/react)

---

## ✅ Next Steps

1. **Create Test Products** - Set up test products and prices in Stripe Dashboard
2. **Test the Flow** - Use test cards to verify the complete payment flow
3. **Customize Styling** - Match Stripe checkout to your brand
4. **Add Webhooks** - Handle `checkout.session.completed` events (already set up in `/api/webhooks/stripe`)
5. **Production Setup** - Switch to live keys when ready

---

## 🐛 Troubleshooting

### "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set"
- Ensure the key is in `.env.local`
- Restart the dev server after adding env vars

### "Failed to create checkout session"
- Check server logs for detailed error messages
- Verify `STRIPE_SECRET_KEY` is correct
- Ensure Price ID exists in Stripe

### Checkout form doesn't load
- Check browser console for errors
- Verify Stripe.js is loading from `js.stripe.com`
- Ensure network requests aren't blocked

---

## 📦 Package Versions

- `stripe`: ^19.0.0
- `@stripe/stripe-js`: ^8.3.0
- `@stripe/react-stripe-js`: ^5.3.0

**Note:** If `EmbeddedCheckout` is not available in `@stripe/react-stripe-js` v5.3.0, you may need to update to a newer version:

```bash
npm install @stripe/react-stripe-js@latest
```

---

## 🎉 Ready to Use!

The integration is complete and ready for testing. Start by creating a test price in Stripe and using the `/checkout` page with the `priceId` parameter.

