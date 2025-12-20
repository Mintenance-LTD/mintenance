# Stripe Environment Variables Setup

**Date:** January 30, 2025  
**Purpose:** Configure Stripe API keys for payment functionality

---

## Environment Variables to Add

Add these variables to your `.env.local` file in `apps/web/`:

```env
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cI
STRIPE_WEBHOOK_SECRET=whsec_OFs1QDF8GXr6jGW01pJ0zsOSIMoibGrg
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SDXwQJmZpzAEZO8HeINT3ftdRn2UKF29yvYzG8XtKwaG5eWxaZyUwPBdxSbQk7kvekacZO568Pt6npJdwUYMbb200nV9OyQPA
```

---

## Setup Instructions

### 1. Locate Your `.env.local` File

The file should be located at:
```
apps/web/.env.local
```

### 2. Add the Stripe Variables

Open `.env.local` and add the three Stripe variables listed above. Make sure:
- Each variable is on its own line
- There are no spaces around the `=` sign
- No quotes are needed around the values
- The file ends with a newline

### 3. Verify Configuration

After adding the variables, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

You should see:
```
✅ Environment variables validated successfully
```

If you see errors, check:
- Variable names are exactly as shown (case-sensitive)
- No extra spaces or quotes
- File is saved

---

## Testing Stripe Integration

Once configured, you can test:

1. **Payment Methods Page** - `/settings/payment-methods`
   - Click "Add Payment Method"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/25`)
   - Any 3-digit CVC (e.g., `123`)

2. **Contractor Payout Setup** - `/contractor/payouts`
   - Click "Set Up Payout Account"
   - This will redirect to Stripe Connect onboarding (test mode)

---

## Test Card Numbers

Stripe provides test card numbers for testing:

**Successful Payments:**
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

**Declined Payments:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

**3D Secure:**
- `4000 0025 0000 3155` - Requires authentication

Use any future expiry date and any 3-digit CVC.

---

## Security Notes

⚠️ **Important:**
- These are **TEST** keys (indicated by `sk_test_` and `pk_test_`)
- Never commit `.env.local` to version control
- For production, use **LIVE** keys (indicated by `sk_live_` and `pk_live_`)
- Keep your webhook secret secure - it's used to verify webhook authenticity

---

## Troubleshooting

### Error: "STRIPE_SECRET_KEY is not configured"
- Check that the variable is in `.env.local`
- Restart the development server
- Check for typos in the variable name

### Error: "Invalid Stripe key format"
- Verify the key starts with `sk_test_` or `sk_live_`
- Check for extra spaces or characters
- Ensure the entire key is on one line

### Payment Methods Not Loading
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Check browser console for errors
- Ensure Stripe.js is loading correctly

---

## Next Steps

After configuring Stripe:
1. Test adding a payment method on `/settings/payment-methods`
2. Test contractor payout setup on `/contractor/payouts`
3. Verify webhook endpoint is configured in Stripe Dashboard
4. Test payment flows end-to-end

---

## Resources

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com/test)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

