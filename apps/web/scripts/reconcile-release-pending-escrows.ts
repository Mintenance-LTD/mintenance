#!/usr/bin/env tsx
/**
 * Reconciliation: unstick `release_pending` escrows.
 *
 * Cohort: escrow rows whose status was flipped to `release_pending`
 * by the OLD `/api/jobs/[id]/confirm-completion` flow (pre-2026-05-13).
 * Nothing on the platform automatically processes `release_pending` —
 * the daily auto-release cron filters strictly on `status='held'`,
 * and the explicit `/api/payments/release-escrow` route only fires
 * when the homeowner manually clicks "Release Payment" on /payments.
 * Most homeowners assumed approving the work from the job-detail
 * page completed the transfer (the email + in-app notification both
 * say "Payment is being processed"). Funds therefore sat in limbo.
 *
 * What this script does:
 *   1. Selects `escrow_transactions` where status='release_pending'.
 *   2. Sanity-checks the related job is genuinely complete + the
 *      payment_intent_id exists.
 *   3. Resets the row so the auto-release cron picks it up on its
 *      next run:
 *        status = 'held'  (the cron's eligibility status)
 *        homeowner_approval = true
 *        homeowner_approval_at = updated_at  (when the original
 *                                              confirm-completion fired)
 *        homeowner_inspection_completed = true
 *        auto_release_enabled = true
 *        auto_release_date = now()
 *        release_reason = 'homeowner_approved'
 *        metadata.reconciled_from = 'release_pending_limbo'
 *
 * The cron then runs all the usual dispute-risk / cooling-off /
 * Stripe-Connect checks before issuing the transfer — same path
 * every new approval takes since the 2026-05-13 confirm-completion
 * fix.
 *
 * Run with --dry-run first to see how many rows are affected without
 * mutating anything. Without the flag the script proceeds for real.
 *
 * Usage:
 *   tsx apps/web/scripts/reconcile-release-pending-escrows.ts --dry-run
 *   tsx apps/web/scripts/reconcile-release-pending-escrows.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[reconcile] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dryRun = process.argv.includes('--dry-run');

interface EscrowRow {
  id: string;
  job_id: string;
  amount: number | null;
  payment_intent_id: string | null;
  updated_at: string;
  homeowner_approval: boolean | null;
  release_reason: string | null;
  metadata: Record<string, unknown> | null;
  jobs: {
    id: string;
    status: string;
    completion_confirmed_by_homeowner: boolean | null;
    contractor_id: string | null;
  } | null;
}

async function main() {
  console.info(
    `[reconcile] release_pending escrow reconciliation — mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`
  );

  const { data: escrows, error } = await supabase
    .from('escrow_transactions')
    .select(
      `
      id, job_id, amount, payment_intent_id, updated_at,
      homeowner_approval, release_reason, metadata,
      jobs (id, status, completion_confirmed_by_homeowner, contractor_id)
    `
    )
    .eq('status', 'release_pending')
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('[reconcile] Failed to fetch release_pending escrows', error);
    process.exit(2);
  }

  const rows = (escrows ?? []) as unknown as EscrowRow[];
  console.info(`[reconcile] Found ${rows.length} release_pending row(s)`);

  if (rows.length === 0) {
    console.info('[reconcile] Nothing to reconcile. Exiting.');
    return;
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const job = row.jobs;

    // Skip if no underlying job (orphaned escrow) — admin handles those
    if (!job) {
      console.warn(`[reconcile] SKIP escrow=${row.id} — no related job row`);
      skipped++;
      continue;
    }

    // Skip if job is not actually completed. Limbo only happens
    // post-approval; if the job is back to in_progress (rework cycle)
    // or never reached completed, the data state is something else and
    // needs admin review.
    if (job.status !== 'completed' && job.status !== 'disputed') {
      console.warn(
        `[reconcile] SKIP escrow=${row.id} — job.status=${job.status} (expected completed/disputed)`
      );
      skipped++;
      continue;
    }

    // Cannot release without a payment_intent — cron would also choke.
    if (!row.payment_intent_id) {
      console.warn(
        `[reconcile] SKIP escrow=${row.id} — missing payment_intent_id`
      );
      skipped++;
      continue;
    }

    const nowIso = new Date().toISOString();
    const approvedAt = row.updated_at; // approximation: when status was flipped
    const existingMetadata =
      typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
    const newMetadata = {
      ...existingMetadata,
      reconciled_from: 'release_pending_limbo',
      reconciled_at: nowIso,
      original_release_reason: row.release_reason,
    };

    const update = {
      status: 'held' as const,
      homeowner_approval: true,
      homeowner_approval_at: row.homeowner_approval ? null : approvedAt,
      homeowner_inspection_completed: true,
      homeowner_inspection_at: approvedAt,
      auto_release_enabled: true,
      auto_release_date: nowIso,
      release_reason: 'homeowner_approved',
      metadata: newMetadata,
      updated_at: nowIso,
    };

    if (dryRun) {
      console.info(
        `[reconcile] WOULD reconcile escrow=${row.id} (job=${job.id}, amount=£${row.amount}, originalReason=${row.release_reason ?? 'none'})`
      );
      processed++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('escrow_transactions')
      .update(update)
      .eq('id', row.id)
      .eq('status', 'release_pending'); // guard: another run already fixed it

    if (updateErr) {
      console.error(
        `[reconcile] FAILED escrow=${row.id} — ${updateErr.message}`
      );
      errors++;
      continue;
    }

    console.info(
      `[reconcile] ✓ Reconciled escrow=${row.id} — cron will release on next hourly run`
    );
    processed++;
  }

  console.info(
    `[reconcile] Summary: processed=${processed} skipped=${skipped} errors=${errors} mode=${dryRun ? 'DRY-RUN' : 'EXECUTE'}`
  );
}

main().catch((err) => {
  console.error('[reconcile] Unexpected failure', err);
  process.exit(3);
});
