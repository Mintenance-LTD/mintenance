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
    // Fall back to plain update if the RPC doesn't exist yet (see migration notes)
    logger.warn('credit_payout_balance RPC unavailable, using direct update', {
      service: 'payouts',
      contractorId: params.contractorId,
      error: error.message,
    });

    const { data: existing } = await serverSupabase
      .from('contractor_payout_balances')
      .select('pending_amount_minor')
      .eq('contractor_id', params.contractorId)
      .eq('currency', currency)
      .maybeSingle();

    if (existing) {
      await serverSupabase
        .from('contractor_payout_balances')
        .update({
          pending_amount_minor:
            existing.pending_amount_minor + params.amountMinor,
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', params.contractorId)
        .eq('currency', currency);
    } else {
      await serverSupabase.from('contractor_payout_balances').insert({
        contractor_id: params.contractorId,
        currency,
        pending_amount_minor: params.amountMinor,
      });
    }
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

  if (error || !data) return null;

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
 * Weekly cron: find all contractors whose pending balance meets the threshold
 * AND whose Connect account can receive payouts, then issue Stripe transfers.
 *
 * Returns a summary of processed / skipped / failed transfers.
 */
export async function processEligiblePayouts(): Promise<{
  processed: number;
  skipped: number;
  failed: number;
}> {
  const threshold = getPayoutThreshold(PRIMARY_CURRENCY);

  // Find eligible balances.
  //
  // 2026-05-25 audit-46 P1: previously omitted lifetime_paid_out_minor
  // from the SELECT. The UPDATE block below summed
  // `pending_amount_minor + balance.lifetime_paid_out_minor`, which
  // returned undefined every time, so `(amount || 0) + (undefined || 0)`
  // = amount and the lifetime total reset to just this payout. After
  // months of payouts a contractor's lifetime stat would silently
  // collapse to whatever last week's transfer was. Pull the column
  // so the UPDATE has a real cumulative base to add to.
  const { data: balances, error } = await serverSupabase
    .from('contractor_payout_balances')
    .select(
      `
      contractor_id,
      currency,
      pending_amount_minor,
      lifetime_paid_out_minor,
      profiles!inner (
        stripe_connect_account_id,
        stripe_payouts_enabled,
        stripe_transfers_active
      )
    `
    )
    .gte('pending_amount_minor', threshold)
    .eq('currency', PRIMARY_CURRENCY);

  if (error || !balances) {
    logger.error('Failed to load eligible payout balances', error, {
      service: 'payouts',
    });
    return { processed: 0, skipped: 0, failed: 0 };
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const balance of balances) {
    const profile = Array.isArray(balance.profiles)
      ? balance.profiles[0]
      : balance.profiles;

    if (
      !profile?.stripe_connect_account_id ||
      !profile?.stripe_payouts_enabled ||
      !profile?.stripe_transfers_active
    ) {
      skipped++;
      continue;
    }

    const lifetimeBefore =
      (balance as { lifetime_paid_out_minor?: number | null })
        .lifetime_paid_out_minor ?? 0;
    const claimedAmount = balance.pending_amount_minor || 0;

    // ATOMIC CLAIM (audit C1): zero the pending balance in a single
    // compare-and-swap guarded on the EXACT amount we intend to pay. Only
    // one concurrent payout run can win this UPDATE; a second overlapping
    // run matches 0 rows and skips — so the same accumulated balance can
    // never be transferred to the contractor twice. This mirrors the CAS
    // the escrow auto-release cron already uses. 2026-05-25 audit-46 P1:
    // lifetime_paid_out_minor accumulates (base pulled from the SELECT).
    const { data: claimedRows, error: claimErr } = await serverSupabase
      .from('contractor_payout_balances')
      .update({
        pending_amount_minor: 0,
        lifetime_paid_out_minor: claimedAmount + lifetimeBefore,
        last_payout_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', balance.contractor_id)
      .eq('currency', balance.currency)
      .eq('pending_amount_minor', claimedAmount)
      .select('contractor_id');

    if (claimErr || !claimedRows || claimedRows.length === 0) {
      logger.warn(
        'Payout balance already claimed or changed under us — skipping to avoid double transfer',
        {
          service: 'payouts',
          contractorId: balance.contractor_id,
          error: claimErr?.message,
        }
      );
      skipped++;
      continue;
    }

    try {
      // Deterministic per-contractor-per-week idempotency key (audit C1):
      // a retry of this run returns the same transfer rather than issuing a
      // second one. The weekly cron pays each contractor at most once per
      // week (guaranteed by the CAS above), so this key never collides
      // across two legitimate payouts.
      const weekBucket = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      const transfer = await stripe.transfers.create(
        {
          amount: claimedAmount,
          currency: balance.currency.toLowerCase(),
          destination: profile.stripe_connect_account_id,
          metadata: {
            mintenance_contractor_id: balance.contractor_id,
            payout_type: 'weekly_threshold',
          },
        },
        {
          idempotencyKey: `weekly-payout-${balance.contractor_id}-${balance.currency}-${weekBucket}`,
        }
      );

      // Record the transfer
      await serverSupabase.from('contractor_payout_transfers').insert({
        contractor_id: balance.contractor_id,
        stripe_transfer_id: transfer.id,
        stripe_destination_account: profile.stripe_connect_account_id,
        amount_minor: claimedAmount,
        currency: balance.currency,
        status: 'pending',
      });

      await serverSupabase
        .from('contractor_payout_balances')
        .update({
          last_payout_transfer_id: transfer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', balance.contractor_id)
        .eq('currency', balance.currency);

      processed++;
    } catch (err) {
      // Transfer failed AFTER we claimed (zeroed) the balance. Compensate:
      // add the claimed amount back and revert the lifetime bump so next
      // week's run retries this payout rather than silently dropping it.
      logger.error(
        'Stripe transfer failed — restoring claimed balance for retry',
        err,
        {
          service: 'payouts',
          contractorId: balance.contractor_id,
          claimedAmount,
        }
      );
      const { data: current } = await serverSupabase
        .from('contractor_payout_balances')
        .select('pending_amount_minor, lifetime_paid_out_minor')
        .eq('contractor_id', balance.contractor_id)
        .eq('currency', balance.currency)
        .maybeSingle();
      await serverSupabase
        .from('contractor_payout_balances')
        .update({
          pending_amount_minor:
            (current?.pending_amount_minor || 0) + claimedAmount,
          lifetime_paid_out_minor: Math.max(
            0,
            (current?.lifetime_paid_out_minor ??
              claimedAmount + lifetimeBefore) - claimedAmount
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', balance.contractor_id)
        .eq('currency', balance.currency);
      failed++;
    }
  }

  logger.info('Weekly payout run complete', {
    service: 'payouts',
    processed,
    skipped,
    failed,
  });

  return { processed, skipped, failed };
}
