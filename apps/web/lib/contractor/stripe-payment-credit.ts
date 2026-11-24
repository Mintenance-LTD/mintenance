import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';

/**
 * A direct transfer has a destination payment on the connected account.
 * Weekly transfers combine job earnings and have no per-payment transfer ID.
 */
export async function readStripePaymentCredit(
  transferId: string | null,
  accountId: string | null
) {
  if (!transferId?.startsWith('tr_') || !accountId?.startsWith('acct_'))
    return null;

  const options = { timeout: 5000, maxNetworkRetries: 0 };
  try {
    const transfer = await stripe.transfers.retrieve(transferId, {}, options);
    const destination =
      typeof transfer.destination === 'string'
        ? transfer.destination
        : transfer.destination?.id;
    const payment =
      typeof transfer.destination_payment === 'string'
        ? transfer.destination_payment
        : transfer.destination_payment?.id;
    if (destination !== accountId || !payment) return null;

    const { data } = await stripe.balanceTransactions.list(
      { source: payment, limit: 2 },
      { ...options, stripeAccount: accountId }
    );
    const credit = data.length === 1 ? data[0] : undefined;
    if (!credit || credit.amount <= 0) return null;

    return {
      creditedAt: new Date(credit.created * 1000).toISOString(),
      pending: credit.status === 'pending',
      reversal: transfer.reversed
        ? 'full'
        : transfer.amount_reversed > 0
          ? 'partial'
          : null,
    };
  } catch (error) {
    logger.warn('Unable to verify contractor Stripe payment credit', {
      service: 'contractor-payments',
      error: error instanceof Error ? error.name : 'Unknown error',
    });
    return null;
  }
}
