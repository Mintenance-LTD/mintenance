# Finance Page Fixes

**Date:** January 2025  
**Issue:** Finance page showing £0 for all metrics and no transactions

---

## Root Causes Identified

### 1. **Missing payer_id and payee_id in Escrow Transactions** 🔴 CRITICAL
- **Location:** `apps/web/app/api/payments/create-intent/route.ts`
- **Issue:** Escrow transactions were created without `payer_id` (homeowner) and `payee_id` (contractor)
- **Impact:** `/api/payments/history` queries using `.or('payer_id.eq.${user.id},payee_id.eq.${user.id}')` returned no results
- **Fix:** Added `payer_id: user.id` and `payee_id: job.contractor_id` when creating escrow transactions

### 2. **Data Transformation Mismatch** 🟠 HIGH
- **Location:** `apps/web/app/contractor/finance/page.tsx`
- **Issue:** Finance page expected different field names than API returned
- **Impact:** Transactions not displayed correctly even if API returned data
- **Fix:** Updated transformation to use correct API response structure:
  - `p.jobId` (not `p.job_id`)
  - `p.job.title` (nested object)
  - `p.createdAt` (not `p.created_at`)
  - Proper status mapping (API: 'held', 'released' vs Finance: 'pending', 'completed')

### 3. **Webhook Column Name Mismatch** 🟡 MEDIUM
- **Location:** `apps/web/app/api/webhooks/stripe/route.ts`
- **Issue:** Webhook used `stripe_payment_intent_id` but create-intent uses `payment_intent_id`
- **Impact:** Webhook couldn't find escrow transactions to update status
- **Fix:** Updated webhook to use `payment_intent_id` and added backward compatibility with `.or()` query

### 4. **Missing payer_id/payee_id in Embedded Checkout** 🟡 MEDIUM
- **Location:** `apps/web/app/api/payments/embedded-checkout/route.ts`
- **Issue:** Embedded checkout created escrow without payer_id/payee_id
- **Fix:** Added payer_id and payee_id lookup from job

---

## Files Fixed

1. ✅ `apps/web/app/api/payments/create-intent/route.ts`
   - Added `payer_id` and `payee_id` to escrow transaction creation

2. ✅ `apps/web/app/api/payments/embedded-checkout/route.ts`
   - Added `payer_id` and `payee_id` lookup and insertion

3. ✅ `apps/web/app/contractor/finance/page.tsx`
   - Fixed data transformation to match API response structure
   - Fixed status mapping (held/released → pending/completed)
   - Improved error handling

4. ✅ `apps/web/app/api/webhooks/stripe/route.ts`
   - Fixed column name from `stripe_payment_intent_id` to `payment_intent_id`
   - Added backward compatibility with `.or()` queries
   - Added backfill logic for missing payer_id/payee_id

---

## Testing Checklist

- [ ] Create a payment intent and verify escrow transaction has payer_id/payee_id
- [ ] Verify finance page displays transactions correctly
- [ ] Verify revenue metrics calculate correctly
- [ ] Verify webhook updates escrow status correctly
- [ ] Test with existing escrow transactions (backward compatibility)
- [ ] Verify "Pending" shows held transactions
- [ ] Verify "Completed" shows released transactions
- [ ] Verify revenue chart displays data correctly

---

## Expected Behavior After Fix

1. **New Payments:** Escrow transactions will include `payer_id` and `payee_id`
2. **Finance Page:** Will display transactions and calculate revenue correctly
3. **Webhooks:** Will find and update escrow transactions correctly
4. **Backward Compatibility:** Webhook can backfill missing payer_id/payee_id from payment intent metadata

---

## Notes

- Existing escrow transactions without payer_id/payee_id will be backfilled by webhook when payment succeeds
- Finance page now correctly handles API response structure
- Status mapping ensures proper display of transaction states
