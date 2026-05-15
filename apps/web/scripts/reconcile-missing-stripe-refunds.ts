#!/usr/bin/env tsx
/**
 * Reconciliation: issue missing Stripe refunds for DB-only refunds.
 *
 * Cohort: `escrow_transactions` rows with `status='refunded'` where
 * the OLD `/api/jobs/[id]/terminate-contractor` flow flipped the DB
 * status but never called `stripe.refunds.create()` (pre-2026-05-13).
 * The homeowner's card was charged when escrow was funded, but the
 * platform held the money — the homeowner never saw it back.
 *
 * The 2026-05-13 fix to terminate-contractor (and the new
 * contractor-withdraw route + admin-refund alignment) all persist
 * `stripe_refund_id` to `escrow.metadata` on a successful Stripe
 * refund. This script identifies rows that lack that key and walks
 * them through the actual Stripe call.
 *
 * Safety:
 *   • Stripe idempotency key derived from the escrow id, so re-runs
 *     never double-refund — Stripe returns the existing refund.
 *   • Before issuing, the script lists existing refunds on the
 *     PaymentIntent via `stripe.refunds.list` — if any are already
 *     succeeded/pending, it records that and skips. This catches the
 *     case where someone manually refunded via the Stripe dashboard.
 *   • The escrow row is updated only after Stripe confirms success.
 *
 * Run with --dry-run first.
 *
 * Usage:
 *   tsx apps/web/scripts/reconcile-missing-stripe-refunds.ts --dry-run
 *   tsx apps/web/scripts/reconcile-missing-stripe-refunds.ts
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[reconcile] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'
  );
  process.exit(1);
}

if (!STRIPE_SECRET_KEY) {
  console.error('[reconcile] Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // Pinned to the canonical platform version (see apps/web/lib/stripe.ts).
  apiVersion: '2025-01-27.acacia',
});

const dryRun = process.argv.includes('--dry-run');

interface EscrowRow {
  id: string;
  job_id: string;
  amount: number | null;
  payment_intent_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  refunded_at: string | null;
  updated_at: string;
}

async function main() {
  console.info(
    `[reconcile] missing-Stripe-refund reconciliation — mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`
  );

  // Pull every refunded escrow and filter for ones lacking a refund id
  // in metadata. Doing the filter in code rather than SQL because
  // jsonb-key probing is awkward across Postgres versions and the
  // refunded cohort is small.
  const { data: escrows, error } = await supabase
    .from('escrow_transactions')
    .select(
      'id, job_id, amount, payment_intent_id, status, metadata, refunded_at, updated_at'
    )
    .eq('status', 'refunded')
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('[reconcile] Failed to fetch refunded escrows', error);
    process.exit(2);
  }

  const rows = (escrows ?? []) as EscrowRow[];
  const candidates = rows.filter((r) => {
    if (!r.metadata || typeof r.metadata !== 'object') return true;
    const md = r.metadata as Record<string, unknown>;
    return !md.stripe_refund_id;
  });

  console.info(
    `[reconcile] Refunded escrows: ${rows.length} total, ${candidates.length} missing stripe_refund_id in metadata`
  );

  if (candidates.length === 0) {
    console.info('[reconcile] Nothing to reconcile. Exiting.');
    return;
  }

  let issued = 0;
  let alreadyRefunded = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of candidates) {
    if (!row.payment_intent_id) {
      console.warn(
        `[reconcile] SKIP escrow=${row.id} — no payment_intent_id (cannot Stripe-refund)`
      );
      skipped++;
      continue;
    }

    // Check Stripe first — someone may have refunded manually via the
    // dashboard, in which case we just back-fill the metadata and
    // don't issue a second refund.
    let existingRefundId: string | null = null;
    try {
      const refunds = await stripe.refunds.list({
        payment_intent: row.payment_intent_id,
        limit: 5,
      });
      const succeeded = refunds.data.find(
        (r) => r.status === 'succeeded' || r.status === 'pending'
      );
      if (succeeded) {
        existingRefundId = succeeded.id;
      }
    } catch (stripeListErr) {
      console.error(
        `[reconcile] ERROR escrow=${row.id} — refunds.list failed`,
        stripeListErr
      );
      errors++;
      continue;
    }

    if (existingRefundId) {
      if (dryRun) {
        console.info(
          `[reconcile] WOULD back-fill metadata for escrow=${row.id} (Stripe refund ${existingRefundId} already exists)`
        );
        alreadyRefunded++;
        continue;
      }
      const existingMetadata =
        typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
      const { error: backfillErr } = await supabase
        .from('escrow_transactions')
        .update({
          metadata: {
            ...existingMetadata,
            stripe_refund_id: existingRefundId,
            reconciled_via: 'backfill_existing_refund',
            reconciled_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (backfillErr) {
        console.error(
          `[reconcile] FAILED back-fill escrow=${row.id} — ${backfillErr.message}`
        );
        errors++;
        continue;
      }
      console.info(
        `[reconcile] ✓ Back-filled metadata for escrow=${row.id} (existing Stripe refund ${existingRefundId})`
      );
      alreadyRefunded++;
      continue;
    }

    // No existing Stripe refund — issue one for the full escrow amount.
    if (dryRun) {
      console.info(
        `[reconcile] WOULD Stripe-refund escrow=${row.id} (£${row.amount}, paymentIntent=${row.payment_intent_id})`
      );
      issued++;
      continue;
    }

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: row.payment_intent_id,
          // amount omitted → full refund of the captured charge.
          reason: 'requested_by_customer',
          metadata: {
            escrow_id: row.id,
            job_id: row.job_id,
            source: 'reconcile-missing-stripe-refunds',
          },
        },
        {
          idempotencyKey: `reconcile_missing_refund_${row.id}`,
        }
      );

      const existingMetadata =
        typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
      const { error: updateErr } = await supabase
        .from('escrow_transactions')
        .update({
          refunded_at: row.refunded_at ?? new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            stripe_refund_id: refund.id,
            refunded_via: 'reconcile-missing-stripe-refunds',
            reconciled_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (updateErr) {
        console.error(
          `[reconcile] CRITICAL escrow=${row.id} — Stripe refund ${refund.id} succeeded but DB update failed: ${updateErr.message}`
        );
        errors++;
        continue;
      }

      console.info(
        `[reconcile] ✓ Stripe-refunded escrow=${row.id} (refundId=${refund.id})`
      );
      issued++;
    } catch (stripeErr) {
      console.error(
        `[reconcile] ERROR escrow=${row.id} — Stripe refund failed`,
        stripeErr
      );
      errors++;
    }
  }

  console.info(
    `[reconcile] Summary: stripe-refunds-issued=${issued} already-refunded-backfilled=${alreadyRefunded} skipped=${skipped} errors=${errors} mode=${dryRun ? 'DRY-RUN' : 'EXECUTE'}`
  );
}

main().catch((err) => {
  console.error('[reconcile] Unexpected failure', err);
  process.exit(3);
});
