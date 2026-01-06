# Edge Function Environment Variables Setup

## Overview

The `setup-contractor-payout` Edge Function requires specific environment variables to be configured in Supabase. These variables are used to connect to Stripe, Supabase, and generate redirect URLs.

## Required Environment Variables

### 1. STRIPE_SECRET_KEY
- **Purpose**: Stripe API secret key for creating Connect accounts
- **Format**: `sk_test_...` (test mode) or `sk_live_...` (production)
- **Where to get**: [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
- **Example**: `sk_test_51SDXwQJmZpzAEZO8AjpLog7IBoaXwl2pAc72E8UMWsLlHaKvDiEKHPlaH3vlNMPK2o01Vkx7MAqpPTBrRySZH3jy00wsQZd1cI`

### 2. APP_URL
- **Purpose**: Base URL of your application for Stripe Connect redirect URLs
- **Format**: Full URL with protocol (no trailing slash)
- **Examples**:
  - Development: `http://localhost:3000`
  - Production: `https://mintenance.co.uk`
- **Used for**: Generating `refresh_url` and `return_url` for Stripe account links

### 3. SUPABASE_URL
- **Purpose**: Supabase project URL for database access
- **Format**: `https://{project-id}.supabase.co`
- **Current Value**: `https://ukrjudtlvapiajkjbcrd.supabase.co`
- **Where to get**: Supabase Dashboard > Project Settings > API

### 4. SUPABASE_SERVICE_ROLE_KEY
- **Purpose**: Service role key for database operations (bypasses RLS)
- **Format**: JWT token starting with `eyJ...`
- **Where to get**: Supabase Dashboard > Project Settings > API > service_role key
- **⚠️ WARNING**: Never expose this in client-side code. Server-side only.

## How to Set Environment Variables in Supabase

### Via Supabase Dashboard

1. **Navigate to Edge Functions**:
   - Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/functions
   - Click on `setup-contractor-payout` function

2. **Open Settings**:
   - Click the "Settings" tab
   - Scroll to "Environment Variables" section

3. **Add Variables**:
   - Click "Add new variable"
   - Enter variable name (e.g., `STRIPE_SECRET_KEY`)
   - Enter variable value
   - Click "Save"

4. **Required Variables to Add**:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   APP_URL=https://mintenance.co.uk
   SUPABASE_URL=https://ukrjudtlvapiajkjbcrd.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Via Supabase CLI (Alternative)

```bash
# Set environment variables
supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref ukrjudtlvapiajkjbcrd
supabase secrets set APP_URL=https://mintenance.co.uk --project-ref ukrjudtlvapiajkjbcrd
supabase secrets set SUPABASE_URL=https://ukrjudtlvapiajkjbcrd.supabase.co --project-ref ukrjudtlvapiajkjbcrd
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref ukrjudtlvapiajkjbcrd
```

## Verification

After setting environment variables, verify they're configured correctly:

1. **Check Function Logs**:
   - Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/functions/setup-contractor-payout/logs
   - Look for environment variable check logs:
     ```
     🔵 Environment variables check: {
       hasStripeKey: true,
       hasAppUrl: true,
       hasSupabaseUrl: true,
       hasServiceKey: true
     }
     ```

2. **Test the Function**:
   - Use the verification script: `npx tsx scripts/verify-edge-function-env.ts`
   - Or manually invoke the function and check for errors

## Troubleshooting

### Error: "STRIPE_SECRET_KEY environment variable is not set"
- **Solution**: Add `STRIPE_SECRET_KEY` in Supabase Dashboard > Functions > Settings > Environment Variables

### Error: "APP_URL environment variable is not set"
- **Solution**: Add `APP_URL` with your application's base URL (e.g., `https://mintenance.co.uk`)

### Error: "SUPABASE_URL environment variable is not set"
- **Solution**: Add `SUPABASE_URL` with your Supabase project URL

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
- **Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard > Settings > API > service_role key

## Current Status

- ✅ Edge Function deployed: `setup-contractor-payout` (Version 11, Status: ACTIVE)
- ⚠️ Environment Variables: Need to be verified and configured in Supabase Dashboard

## Next Steps

1. Set all required environment variables in Supabase Dashboard
2. Run verification script to confirm configuration
3. Test the Stripe Connect setup flow end-to-end
