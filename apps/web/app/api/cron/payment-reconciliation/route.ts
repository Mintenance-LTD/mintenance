import { withCronHandler } from '@/lib/cron-handler';
import { PaymentReconciliationService } from '@/lib/services/payment/PaymentReconciliationService';
export const maxDuration = 60;

/**
 * Cron endpoint for payment reconciliation.
 * Compares local escrow_transactions against Stripe PaymentIntents
 * to detect and flag discrepancies in bounded batches, scheduled every five minutes.
 */
export const GET = withCronHandler('payment-reconciliation', async () => {
  const result = await PaymentReconciliationService.reconcile();
  if (result.errors)
    throw new Error(
      'Payment reconciliation requires retry; durable results retained'
    );
  return result;
});
