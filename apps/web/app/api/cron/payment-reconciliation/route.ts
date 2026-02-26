import { withCronHandler } from '@/lib/cron-handler';
import { PaymentReconciliationService } from '@/lib/services/payment/PaymentReconciliationService';

/**
 * Cron endpoint for payment reconciliation.
 * Compares local escrow_transactions against Stripe PaymentIntents
 * to detect and flag discrepancies. Should be called daily.
 */
export const GET = withCronHandler('payment-reconciliation', async () => {
  return await PaymentReconciliationService.reconcile();
});
