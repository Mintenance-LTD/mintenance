/**
 * Contractor payout accumulator + weekly transfer processor.
 *
 * Flow:
 *   1. Escrow releases call `accumulateEarnings()` → increments pending_amount_minor
 *   2. Weekly cron runs `processEligiblePayouts()` which:
 *      - finds balances where pending >= threshold
 *      - calls Stripe transfers.create for each
 *      - records the transfer + resets the balance
 */
import { stripe } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getPayoutThreshold, PRIMARY_CURRENCY } from './config';
import type { PayoutBalance } from './types';

/**
 * Credit accumulated earnings to a contractor's payout balance.
 * Called from escrow release path when funds become contractor's.
 *
 * Idempotent by jobId: pass the same jobId twice and it won't double-credit.
 */
export async function accumulateEarnings(params: {
  contractorId: string;
  amountMinor: number;
  currency?: string;
  jobId: string;
}): Promise<void> {
  const currency = (params.currency ?? PRIMARY_CURRENCY).toUpperCase();

  // Upsert balance row
  const { error } = await serverSupabase.rpc('credit_payout_balance', {
    p_contractor_id: params.contractorId,
    p_amount_minor: params.amountMinor,
    p_currency: currency,
    p_job_id: params.jobId,
  });

  if (error) {
    logger.error(
      'Atomic payout credit RPC failed; refusing unsafe fallback',
      error,
      {
        service: 'payouts',
        contractorId: params.contractorId,
        jobId: params.jobId,
      }
    );
    throw new Error('Unable to credit contractor payout balance atomically');
  }

  logger.info('Earnings accumulated to payout balance', {
    service: 'payouts',
    contractorId: params.contractorId,
    amountMinor: params.amountMinor,
    currency,
    jobId: params.jobId,
  });
}

/**
 * Read a contractor's payout balance for UI display.
 */
export async function getPayoutBalance(
  contractorId: string,
  currency: string = PRIMARY_CURRENCY
): Promise<PayoutBalance | null> {
  const { data, error } = await serverSupabase
    .from('contractor_payout_balances')
    .select('*')
    .eq('contractor_id', contractorId)
    .eq('currency', currency.toUpperCase())
    .maybeSingle();

  if (error) throw new Error('Could not load payout balance');
  if (!data) return null;

  const threshold = getPayoutThreshold(currency);

  return {
    contractorId: data.contractor_id,
    currency: data.currency,
    pendingAmountMinor: data.pending_amount_minor,
    lifetimePaidOutMinor: data.lifetime_paid_out_minor,
    lastPayoutAt: data.last_payout_at,
    lastPayoutTransferId: data.last_payout_transfer_id,
    threshold,
    eligibleForPayout: data.pending_amount_minor >= threshold,
  };
}

/**
 * Funds remain pending until a provider transfer and its ledger commit succeed.
 * A stable operation ID survives crashes, retries and week boundaries.
 */
export async function processEligiblePayouts(): Promise<{
  processed: number;
  skipped: number;
  failed: number;
}> {
  const { data: balances, error } = await serverSupabase
    .from('contractor_payout_balances')
    .select('contractor_id, currency')
    .gte('pending_amount_minor', getPayoutThreshold(PRIMARY_CURRENCY))
    .eq('currency', PRIMARY_CURRENCY);
  if (error || !balances) throw new Error('Unable to load payout balances');
  let processed = 0,
    skipped = 0,
    failed = 0;
  for (const balance of balances) {
    let operationId: string | undefined;
    try {
      const reserved = await serverSupabase.rpc('reserve_weekly_payout', {
        p_contractor_id: balance.contractor_id,
        p_currency: balance.currency,
      });
      if (reserved.error) throw new Error('Payout reservation failed');
      if (!reserved.data?.id) {
        skipped++;
        continue;
      }
      operationId = reserved.data.id;
      const begun = await serverSupabase.rpc('begin_weekly_payout', {
        p_operation_id: operationId,
      });
      if (begun.error || !begun.data?.id)
        throw new Error('Payout attempt could not be persisted');
      const op = begun.data as {
        id: string;
        state: string;
        amount_minor: number;
        currency: string;
        destination: string;
        first_attempt_at: string;
        contractor_id: string;
      };
      if (op.state === 'completed') {
        skipped++;
        continue;
      }
      let transfer;
      const age = Date.now() - new Date(op.first_attempt_at).getTime();
      // Stripe keys may expire after 24h. Never blindly resubmit an old
      // uncertain operation. Reconcile against provider metadata instead.
      if (
        !Number.isFinite(age) ||
        age >= 23 * 60 * 60 * 1000 ||
        op.state === 'needs_review'
      ) {
        const matches = [];
        for await (const candidate of stripe.transfers.list({
          destination: op.destination,
          created: {
            gte:
              Math.floor(new Date(op.first_attempt_at).getTime() / 1000) - 60,
          },
          limit: 100,
        })) {
          if (candidate.metadata.mintenance_payout_operation === op.id)
            matches.push(candidate);
        }
        if (matches.length !== 1) {
          const marked = await serverSupabase
            .from('contractor_payout_operations')
            .update({ state: 'needs_review' })
            .eq('id', op.id)
            .neq('state', 'completed');
          if (marked.error)
            throw new Error('Payout review state could not be saved');
          throw new Error('Payout requires provider reconciliation');
        }
        transfer = matches[0];
      } else {
        transfer = await stripe.transfers.create(
          {
            amount: op.amount_minor,
            currency: op.currency.toLowerCase(),
            destination: op.destination,
            metadata: {
              mintenance_contractor_id: op.contractor_id,
              mintenance_payout_operation: op.id,
              payout_type: 'weekly_threshold',
            },
          },
          { idempotencyKey: `weekly-payout-operation-${op.id}` }
        );
      }
      const destination =
        typeof transfer.destination === 'string'
          ? transfer.destination
          : transfer.destination?.id;
      if (
        transfer.amount !== op.amount_minor ||
        transfer.currency !== op.currency.toLowerCase() ||
        destination !== op.destination ||
        transfer.reversed
      ) {
        throw new Error('Provider payout does not match reserved terms');
      }
      const completed = await serverSupabase.rpc('complete_weekly_payout', {
        p_operation_id: op.id,
        p_transfer_id: transfer.id,
      });
      if (completed.error)
        throw new Error('Payout accounting awaits reconciliation');
      processed++;
    } catch (error) {
      // Never restore or spend an uncertain amount. The committed reservation
      // and pending balance survive for a retry or support reconciliation.
      logger.error('Payout operation remains pending', error, {
        service: 'payouts',
        operationId,
        contractorId: balance.contractor_id,
      });
      failed++;
    }
  }
  return { processed, skipped, failed };
}
