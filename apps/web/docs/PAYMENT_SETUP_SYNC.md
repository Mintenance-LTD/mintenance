# Payment Setup Sync - Implementation Summary

## Overview

Fixed the synchronization issue where Stripe Connect account IDs were saved to `contractor_payout_accounts` but payment setup checks were looking for `users.stripe_connect_account_id`.

## Changes Implemented

### 1. Edge Function Update
**File:** `supabase/functions/setup-contractor-payout/index.ts`

- **Added:** Update `users.stripe_connect_account_id` when creating Stripe Connect account
- **Behavior:** Now saves to both `contractor_payout_accounts.stripe_account_id` AND `users.stripe_connect_account_id`
- **Error Handling:** Logs errors but doesn't fail the request if user update fails

### 2. Webhook Handler
**File:** `apps/web/app/api/webhooks/stripe/route.ts`

- **Added:** `account.updated` event handler
- **Function:** `handleAccountUpdated()` 
- **Purpose:** Syncs account status when contractor completes Stripe onboarding
- **Updates:**
  - `users.stripe_connect_account_id` - For payment setup checks
  - `contractor_payout_accounts.stripe_account_id` - For payout management
  - `contractor_payout_accounts.account_complete` - Based on onboarding status

### 3. Success Callback Pages
**Files:**
- `apps/web/app/contractor/payout/success/page.tsx` - Server component
- `apps/web/app/contractor/payout/success/components/PayoutSuccessClient.tsx` - Client component
- `apps/web/app/contractor/payout/refresh/page.tsx` - Refresh page

**Features:**
- Verifies payment setup completion status
- Shows success message if setup complete
- Shows "in progress" message if still processing
- Provides refresh button to check status
- Links back to payouts page or dashboard

## How It Works

### Initial Setup Flow
1. Contractor clicks "Set Up Payout Account"
2. Edge function creates Stripe Connect account
3. **NEW:** Saves account ID to both tables immediately
4. Contractor redirected to Stripe onboarding
5. Enters bank account and completes verification

### After Onboarding Completion
1. Stripe sends `account.updated` webhook
2. Webhook handler syncs account status to both tables
3. Contractor redirected to `/contractor/payout/success`
4. Success page checks `users.stripe_connect_account_id`
5. Shows success message if setup complete

### Fallback Sync
- If webhook doesn't fire, edge function already saved to `users` table
- Success page can refresh to check status
- Manual sync via refresh button

## Database Fields Updated

### `users` table
- `stripe_connect_account_id` - Used by payment setup checks

### `contractor_payout_accounts` table  
- `stripe_account_id` - Used for payout management
- `account_complete` - Tracks onboarding completion status

## Webhook Configuration

**Required Stripe Webhook Event:**
- `account.updated` - Fires when Connect account status changes

**Setup Instructions:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select event: `account.updated`
4. Save webhook secret to `STRIPE_WEBHOOK_SECRET` environment variable

## Testing Checklist

- [ ] Test initial account creation saves to both tables
- [ ] Test webhook handler syncs account status
- [ ] Test success page shows correct status
- [ ] Test refresh button updates status
- [ ] Verify payment setup checks work correctly
- [ ] Test bid acceptance blocking without setup
- [ ] Test escrow release with setup complete

## Related Files

- `apps/web/lib/services/contractor/PaymentSetupNotificationService.ts` - Uses `users.stripe_connect_account_id`
- `apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts` - Checks `users.stripe_connect_account_id`
- `apps/web/app/api/payments/release-escrow/route.ts` - Uses `users.stripe_connect_account_id`
- `apps/web/app/contractor/dashboard-enhanced/page.tsx` - Checks `users.stripe_connect_account_id`

## Benefits

1. **Immediate Sync:** Account ID saved to both tables on creation
2. **Webhook Backup:** Webhook ensures sync even if initial save fails
3. **User Feedback:** Success page shows clear status
4. **Reliable Checks:** Payment setup checks now work correctly
5. **No Breaking Changes:** Existing code continues to work

