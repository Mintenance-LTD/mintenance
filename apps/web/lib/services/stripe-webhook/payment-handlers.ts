/**
 * Re-export facade for the payment-related Stripe webhook handlers.
 *
 * Implementation lives in per-event modules so each handler stays
 * close to its peers and the file structure mirrors the existing
 * `subscription-handlers.ts` / `invoice-handlers.ts` / `dispute-handlers.ts`
 * pattern in the same directory.
 *
 *   - payment-intent-handlers.ts  → PaymentIntent succeeded / failed /
 *                                   canceled / requires_action
 *   - charge-handlers.ts          → charge.succeeded / .failed /
 *                                   .refunded
 *   - tip-payment-handler.ts      → tip-jar short-circuit invoked from
 *                                   payment_intent.succeeded
 *
 * 2026-05-13 split: the single file previously contained all of the
 * above + the tip-jar branch and had grown to 584 LOC. The allowlist
 * entry for `apps/web/lib/services/stripe-webhook/payment-handlers.ts`
 * was removed in the same commit.
 *
 * Public surface is unchanged — consumers can keep importing from
 * `'./payment-handlers'`:
 *
 *   import {
 *     handlePaymentIntentSucceeded,
 *     handlePaymentIntentFailed,
 *     handlePaymentIntentCanceled,
 *     handlePaymentIntentRequiresAction,
 *     handleChargeSucceeded,
 *     handleChargeFailed,
 *     handleChargeRefunded,
 *   } from './payment-handlers';
 */

export {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
  handlePaymentIntentRequiresAction,
} from './payment-intent-handlers';

export {
  handleChargeSucceeded,
  handleChargeFailed,
  handleChargeRefunded,
} from './charge-handlers';
