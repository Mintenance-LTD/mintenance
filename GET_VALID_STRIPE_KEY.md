# Get Valid Stripe API Key

## Problem
Your current Stripe secret key is **invalid**:
```
sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cIt
```

Stripe returns: `"Invalid API Key provided"`

## Solution: Get Fresh API Keys from Stripe

### Step 1: Go to Stripe Dashboard
From the screenshot you showed me, you're already logged in to Stripe.

Go to: https://dashboard.stripe.com/test/apikeys

### Step 2: Get Test Mode API Keys

You'll see a page with two sections:

**Standard keys:**
```
┌─────────────────────────────────────────────────┐
│ Publishable key (for client-side)               │
│ pk_test_51SDXwQJm...                            │
│ [Show test key] [Copy]                          │
│                                                  │
│ Secret key (for server-side)                    │
│ sk_test_51SDXwQJm...                            │
│ [Reveal test key] [Copy]  ← GET THIS ONE        │
└─────────────────────────────────────────────────┘
```

### Step 3: Reveal and Copy Secret Key

1. Click **"Reveal test key"** in the Secret key section
2. The full key will appear
3. Click **"Copy"** to copy it
4. It should start with `sk_test_` and be very long (100+ characters)

### Step 4: Update Your .env.local

Open `apps/web/.env.local` and update line 45:

```bash
# OLD (INVALID):
STRIPE_SECRET_KEY=sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cIt

# NEW (PASTE YOUR KEY):
STRIPE_SECRET_KEY=sk_test_YOUR_NEW_KEY_HERE
```

**Also update the publishable key (line 47):**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_NEW_KEY_HERE
```

### Step 5: Update Supabase Edge Function

Run these commands to update the Stripe key in Supabase:

```bash
# Set your Supabase access token
export SUPABASE_ACCESS_TOKEN=sbp_c8598aa11eb61e2cf12ef9aa88a492cbf1aafb67

# Update the Stripe secret key (replace with your new key)
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_NEW_KEY_HERE" --project-ref ukrjudtlvapiajkjbcrd

# Redeploy the Edge Function
npx supabase functions deploy setup-contractor-payout --project-ref ukrjudtlvapiajkjbcrd
```

### Step 6: Restart Dev Server

```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 7: Test It Works

1. Go to http://localhost:3000/contractor/payouts
2. Click "Set Up Payout Account"
3. You should be redirected to Stripe Connect onboarding

## Why Did the Old Key Stop Working?

Stripe API keys can become invalid if:
- The key was deleted or rotated in the Stripe dashboard
- The Stripe account was changed
- The key was for a different Stripe account
- The key was incorrectly copied (missing characters)

## How to Verify Your New Key is Valid

Test it with curl:
```bash
curl -X GET "https://api.stripe.com/v1/account" -u "YOUR_NEW_STRIPE_KEY:"
```

If it works, you'll see JSON with your account info (not an error).

## Important Notes

⚠️ **Test Mode vs Live Mode:**
- Right now you're in **Test Mode** (keys start with `sk_test_`)
- For production, you'll need **Live Mode** keys (start with `sk_live_`)
- Always test with test mode first!

⚠️ **Security:**
- Never commit Stripe keys to git
- `.env.local` is in `.gitignore` - keep it there
- Only use secret keys server-side (API routes, Edge Functions)
- Use publishable keys client-side (they're safe to expose)
