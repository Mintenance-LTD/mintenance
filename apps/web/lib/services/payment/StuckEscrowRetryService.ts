import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Find and unblock escrow rows that were reset by an operator because the
 * contractor's Stripe Connect payouts were not enabled at the original
 * auto-release attempt.
 *
 * Production state (2026-05-25 audit-P0-1): live shows 2 escrow rows with
 *   release_reason = 'reset by operator 2026-05-26: contractor payouts
 *                     not enabled at original release attempt — retry
 *                     once Stripe Connect onboarding complete'
 * These rows are stuck because no automated retry exists. They sit in
 * status='held' with auto_release_date=NULL forever, even after the
 * contractor finishes Stripe Connect onboarding. The auto-release cron
 * only processes rows with auto_release_date <= now(), so without a
 * re-stamp the funds never move.
 *
 * This service is idempotent:
 *   - Reads escrow rows whose release_reason matches the operator marker
 *     AND status='held' AND released_at IS NULL.
 *   - For each, joins to the contractor via jobs.contractor_id and reads
 *     the current profiles.stripe_payouts_enabled +
 *     stripe_transfers_active flags.
 *   - If both flags are now true, re-stamps auto_release_date=now() +
 *     auto_release_enabled=true and overwrites release_reason with an
 *     'auto-retry' marker so subsequent runs skip the row.
 *   - Returns a per-row report of decisions for observability.
 *
 * Running this twice in a row is safe: the second pass skips rows whose
 * release_reason was already updated, because the LIKE filter no longer
 * matches.
 */

export interface RetryReport {
  escrowId: string;
  jobId: string;
  contractorId: string | null;
  decision: 'retried' | 'still_not_payout_enabled' | 'no_contractor';
}

export interface RetrySummary {
  scanned: number;
  retried: number;
  stillBlocked: number;
  errors: number;
  rows: RetryReport[];
}

const OPERATOR_RESET_MARKER = '%contractor payouts not enabled%';

export async function retryStuckPayouts(): Promise<RetrySummary> {
  const summary: RetrySummary = {
    scanned: 0,
    retried: 0,
    stillBlocked: 0,
    errors: 0,
    rows: [],
  };

  const { data: stuckRows, error: scanError } = await serverSupabase
    .from('escrow_transactions')
    .select('id, job_id, status, release_reason')
    .ilike('release_reason', OPERATOR_RESET_MARKER)
    .eq('status', 'held')
    .is('released_at', null);

  if (scanError) {
    logger.error('Failed to scan stuck escrow rows', scanError, {
      service: 'stuck-escrow-retry',
    });
    throw scanError;
  }

  summary.scanned = stuckRows?.length ?? 0;
  if (!stuckRows || stuckRows.length === 0) return summary;

  for (const row of stuckRows) {
    // Resolve contractor via jobs.contractor_id, not via escrow.payee_id
    // (some seeded rows have null payee_id; jobs is the authoritative link
    // for the lifecycle).
    const { data: job, error: jobErr } = await serverSupabase
      .from('jobs')
      .select('contractor_id')
      .eq('id', row.job_id)
      .maybeSingle();

    if (jobErr || !job?.contractor_id) {
      summary.errors += 1;
      summary.rows.push({
        escrowId: row.id,
        jobId: row.job_id,
        contractorId: null,
        decision: 'no_contractor',
      });
      continue;
    }

    const { data: contractor, error: contractorErr } = await serverSupabase
      .from('profiles')
      .select('stripe_payouts_enabled, stripe_transfers_active')
      .eq('id', job.contractor_id)
      .maybeSingle();

    if (contractorErr || !contractor) {
      summary.errors += 1;
      continue;
    }

    const payoutReady =
      contractor.stripe_payouts_enabled === true &&
      contractor.stripe_transfers_active === true;

    if (!payoutReady) {
      summary.stillBlocked += 1;
      summary.rows.push({
        escrowId: row.id,
        jobId: row.job_id,
        contractorId: job.contractor_id,
        decision: 'still_not_payout_enabled',
      });
      continue;
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await serverSupabase
      .from('escrow_transactions')
      .update({
        auto_release_enabled: true,
        auto_release_date: nowIso,
        release_reason: 'auto-retry: contractor payouts now enabled',
        updated_at: nowIso,
      })
      .eq('id', row.id);

    if (updateErr) {
      logger.error('Failed to re-stamp stuck escrow row', updateErr, {
        service: 'stuck-escrow-retry',
        escrowId: row.id,
      });
      summary.errors += 1;
      continue;
    }

    summary.retried += 1;
    summary.rows.push({
      escrowId: row.id,
      jobId: row.job_id,
      contractorId: job.contractor_id,
      decision: 'retried',
    });
    logger.info('Stuck escrow row re-stamped for next auto-release cron', {
      service: 'stuck-escrow-retry',
      escrowId: row.id,
      jobId: row.job_id,
      contractorId: job.contractor_id,
    });
  }

  return summary;
}
