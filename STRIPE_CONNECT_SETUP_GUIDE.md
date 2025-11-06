# Stripe Connect Setup Guide

**Date:** January 30, 2025  
**Purpose:** Guide for setting up Stripe Connect for contractor payouts

---

## Overview

The Mintenance platform uses Stripe Connect to enable contractors to receive payments directly into their bank accounts. This guide covers the setup process and testing requirements.

---

## Prerequisites

1. **Stripe Account**
   - Production Stripe account with Connect enabled
   - Test mode Stripe account for development/testing

2. **Environment Variables**
   - `STRIPE_SECRET_KEY` - Stripe secret key (server-side)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (client-side)
   - Both keys must be from the same Stripe account (production or test mode)

3. **Supabase Edge Function**
   - Edge function: `setup-contractor-payout` must be deployed
   - Function should handle Stripe Connect account creation

---

## Contractor Payout Setup Flow

### 1. User Flow

1. Contractor navigates to `/contractor/payouts`
2. Clicks "Set Up Payout Account" button
3. API calls `/api/contractor/payout/setup`
4. Edge function creates Stripe Connect Express account
5. Returns Stripe onboarding URL
6. Contractor redirected to Stripe onboarding
7. Contractor completes Stripe onboarding (bank account, identity verification)
8. Returns to `/contractor/payouts/success` (or callback URL)
9. Payout account verified and saved

### 2. API Endpoints

#### POST `/api/contractor/payout/setup`

**Request:**
- Authentication: Required (contractor role)
- Body: None

**Response:**
```json
{
  "success": true,
  "accountUrl": "https://connect.stripe.com/setup/...",
  "accountId": "acct_..."
}
```

**Implementation:**
- Located at: `apps/web/app/api/contractor/payout/setup/route.ts`
- Uses Supabase Edge Function: `setup-contractor-payout`
- Creates Stripe Connect Express account
- Returns onboarding URL

### 3. Database Schema

**Table: `contractor_payout_accounts`**

```sql
- id: uuid (primary key)
- contractor_id: uuid (references users.id)
- account_type: 'bank_account' | 'paypal' | 'venmo' | 'zelle'
- account_holder_name: text
- account_number: text (encrypted)
- routing_number: text (encrypted)
- stripe_account_id: text (Stripe Connect account ID)
- is_primary: boolean
- is_verified: boolean
- created_at: timestamp
- updated_at: timestamp
```

---

## Testing Stripe Connect

### Test Mode Setup

1. **Get Stripe Test Keys**
   - Log into Stripe Dashboard
   - Switch to "Test mode"
   - Get test API keys:
     - Publishable key: `pk_test_...`
     - Secret key: `sk_test_...`

2. **Update Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Test Account Creation**
   - Use test contractor account
   - Navigate to `/contractor/payouts`
   - Click "Set Up Payout Account"
   - Should redirect to Stripe test mode onboarding

4. **Test Bank Account**
   - Use Stripe test bank account numbers
   - Routing number: `110000000` (test)
   - Account number: Any 8-12 digits
   - Or use: `000123456789` for instant verification

### Stripe Test Cards & Accounts

**Test Bank Accounts:**
- Success: `000123456789`
- Decline: `000000000000`
- Micro-deposit required: Any other account number

**Test Routing Numbers:**
- US: `110000000` (ACH)
- US: `021000021` (ACH)

---

## Production Setup

### 1. Enable Stripe Connect

1. Log into Stripe Dashboard (production)
2. Navigate to "Connect" → "Settings"
3. Enable Connect Express accounts
4. Configure onboarding flow
5. Set up webhooks (optional but recommended)

### 2. Configure Webhooks (Recommended)

**Webhook Endpoint:**
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events to listen for:
  - `account.updated` - When contractor completes onboarding
  - `account.application.deauthorized` - When contractor disconnects
  - `capability.updated` - When account capabilities change

**Webhook Secret:**
- Get from Stripe Dashboard → Webhooks
- Store in environment variable: `STRIPE_WEBHOOK_SECRET`

### 3. Compliance & Verification

**Required for Production:**
- Stripe Connect onboarding flow
- Identity verification (KYC)
- Bank account verification
- Tax information collection (if required)

**Stripe Handles:**
- Identity verification
- Bank account verification
- Tax form collection (1099)
- Compliance checks

---

## Payout Flow After Setup

### 1. Payment to Contractor

1. Homeowner pays for job (escrow)
2. Job completed and approved
3. Escrow released to contractor
4. Payment transferred to contractor's Stripe Connect account
5. Stripe automatically pays out to contractor's bank account

### 2. Payout Schedule

- **Express Accounts**: Automatic payouts (daily, weekly, or monthly)
- Configured in Stripe Dashboard per contractor
- Default: Daily payouts (next business day)

### 3. Payout Fees

- Platform fee: Configured in your application
- Stripe Connect fee: 0.25% + standard payment processing fees
- Paid by contractor (deducted from payout)

---

## API Implementation Details

### Edge Function: `setup-contractor-payout`

**Location:** Supabase Edge Functions

**Purpose:**
- Create Stripe Connect Express account
- Link to contractor's user account
- Return onboarding URL

**Example Response:**
```json
{
  "accountUrl": "https://connect.stripe.com/setup/s/acct_...",
  "accountId": "acct_...",
  "created": true
}
```

### API Route: `/api/contractor/payout/setup`

**File:** `apps/web/app/api/contractor/payout/setup/route.ts`

**Flow:**
1. Authenticate user (must be contractor)
2. Call Supabase Edge Function
3. Return onboarding URL
4. Client redirects contractor to Stripe

---

## Error Handling

### Common Errors

1. **Stripe Account Already Exists**
   - Check if contractor already has `stripe_account_id`
   - Return existing account details
   - Allow re-onboarding if needed

2. **Onboarding Incomplete**
   - Check account capabilities
   - Detect incomplete onboarding
   - Redirect to Stripe to complete

3. **Verification Failed**
   - Handle identity verification failures
   - Provide clear error messages
   - Allow retry

---

## Security Considerations

1. **API Key Security**
   - Never expose secret keys in client-side code
   - Use environment variables
   - Rotate keys regularly

2. **Webhook Verification**
   - Always verify webhook signatures
   - Use `STRIPE_WEBHOOK_SECRET`
   - Validate event types

3. **Data Encryption**
   - Encrypt sensitive data (bank account numbers)
   - Use Stripe's secure storage when possible
   - Follow PCI compliance guidelines

---

## Testing Checklist

### Before Going Live

- [ ] Stripe Connect enabled in production
- [ ] Test mode fully tested
- [ ] Webhooks configured and tested
- [ ] Error handling tested
- [ ] Onboarding flow tested end-to-end
- [ ] Bank account verification tested
- [ ] Payout transfers tested (test mode)
- [ ] Compliance requirements met
- [ ] Documentation updated

### Test Scenarios

1. **New Contractor Setup**
   - [ ] Creates Stripe Connect account
   - [ ] Redirects to onboarding
   - [ ] Completes onboarding
   - [ ] Returns to success page
   - [ ] Account saved in database

2. **Existing Account**
   - [ ] Detects existing account
   - [ ] Shows account status
   - [ ] Allows re-onboarding if needed

3. **Verification States**
   - [ ] Pending verification
   - [ ] Verified
   - [ ] Verification failed
   - [ ] Requires additional information

---

## Troubleshooting

### Issue: Onboarding URL Not Working

**Solution:**
- Verify Stripe keys are correct
- Check Stripe Connect is enabled
- Verify Edge Function is deployed
- Check network connectivity

### Issue: Account Not Saving

**Solution:**
- Check database connection
- Verify contractor_id is correct
- Check Edge Function returns correct data
- Verify webhook is receiving events (if using)

### Issue: Payouts Not Processing

**Solution:**
- Verify account is verified
- Check payout schedule settings
- Verify bank account is active
- Check Stripe Dashboard for errors

---

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Connect Express](https://stripe.com/docs/connect/express-accounts)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

## Support

For issues or questions:
1. Check Stripe Dashboard for account status
2. Review Stripe logs in Dashboard
3. Check application logs for errors
4. Contact Stripe support if needed

---

## Notes

- Stripe Connect Express is recommended for simple onboarding
- Custom accounts provide more control but require more setup
- Webhooks are optional but recommended for production
- Test mode is essential for development and QA

