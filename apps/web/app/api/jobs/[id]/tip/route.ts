import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { stripe } from '@/lib/stripe';

/**
 * /api/jobs/[id]/tip
 *
 *   POST — homeowner sends a tip on a completed job.
 *   GET  — list tips for a job (homeowner sees their own sends,
 *          contractor sees received).
 *
 * Stripe model
 * ------------
 * Direct Charge to the contractor's Connect account — money flows
 * straight from the homeowner to the contractor, no escrow hold,
 * no platform fee. Tips are intentionally gratuity-only; the
 * platform doesn't take a cut.
 *
 * Lifecycle
 * ---------
 *   1. POST creates a `job_tips` row with status='pending' +
 *      a Stripe PaymentIntent with `application_fee_amount: 0` and
 *      `transfer_data.destination` set to the contractor's
 *      `stripe_connect_account_id`.
 *   2. The PaymentIntent's `client_secret` is returned so the
 *      homeowner can confirm via Stripe Elements.
 *   3. `payment_intent.succeeded` webhook (in
 *      `/api/webhooks/stripe`) flips the row to status='completed'
 *      and fires a contractor notification.
 *
 * Backed by migration 20260520000006_job_tips.sql.
 */

const tipSchema = z.object({
  amount: z
    .number()
    .min(1, 'Minimum tip is £1')
    .max(500, 'Maximum tip is £500 — contact support for larger amounts'),
  note: z.string().max(500).optional(),
});

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request: NextRequest, { user, params }) => {
    const jobId = params.id;

    const validation = await validateRequest(request, tipSchema);
    if ('headers' in validation) {
      return validation;
    }
    const { amount, note } = validation.data;

    // 1. Verify job exists + homeowner owns it + status is completed
    const db = createRequestScopedClient(request) ?? serverSupabase;
    const { data: job, error: jobError } = await db
      .from('jobs')
      .select('id, homeowner_id, contractor_id, status, title')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }
    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the homeowner can tip on this job');
    }
    if (job.status !== 'completed') {
      throw new BadRequestError('Tips can only be sent on completed jobs');
    }
    if (!job.contractor_id) {
      throw new BadRequestError('No contractor assigned to this job');
    }

    // 2. Look up contractor's Stripe Connect account.
    //
    // 2026-06-11: must use the service-role client — the 2026-06-09
    // profiles column-grant lockdown revoked SELECT on stripe_* columns
    // for `authenticated`, so reading the CONTRACTOR's row through the
    // homeowner's RLS client 403s wholesale and every tip failed with a
    // misleading "Contractor profile not found". Same regression class
    // as the bid-accept gate (fixed in 12129500b). The account id never
    // leaves the server — it only feeds the PaymentIntent transfer.
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('profiles')
      .select('id, stripe_connect_account_id, first_name, last_name')
      .eq('id', job.contractor_id)
      .single();
    if (contractorError || !contractor) {
      throw new NotFoundError('Contractor profile not found');
    }
    if (!contractor.stripe_connect_account_id) {
      throw new BadRequestError(
        'Contractor has not set up payouts yet — tip cannot be sent until they do.'
      );
    }

    const amountPence = Math.round(amount * 100);

    // 3. Create the Stripe PaymentIntent (Direct Charge model).
    //
    // 2026-05-25 audit-45 P1: idempotency key previously hashed only
    // {jobId, userId, amountPence}, so a second £10 tip on the same job
    // by the same homeowner reused the FIRST PaymentIntent. The insert
    // below has a unique constraint on stripe_payment_intent_id —
    // every same-amount repeat tip then 23505'd at the DB layer and
    // the "Send another tip" CTA on TipJarCard.tsx looked broken.
    //
    // Three windows of dedup we still need:
    //   1. Network retry of the same POST (browser/SDK retry): preserve.
    //   2. Double-click within seconds: preserve.
    //   3. Genuinely-new tip later: must NOT collide.
    //
    // Salt with a coarse minute-bucket timestamp so (1)+(2) still
    // dedupe (any retry inside the same minute reuses the PI) while
    // (3) — tips sent minutes apart — gets a fresh key. Same shape used
    // by other production idempotency keys on this codebase.
    const minuteBucket = Math.floor(Date.now() / 60_000);
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountPence,
          currency: 'gbp',
          capture_method: 'automatic',
          transfer_data: {
            destination: contractor.stripe_connect_account_id,
          },
          // No application_fee_amount — full tip goes to contractor.
          metadata: {
            type: 'job_tip',
            job_id: jobId,
            payer_id: user.id,
            payee_id: contractor.id,
          },
        },
        {
          idempotencyKey: `tip_${jobId}_${user.id}_${amountPence}_${minuteBucket}`,
        }
      );
    } catch (err) {
      logger.error('Failed to create tip PaymentIntent', err, {
        service: 'job-tips',
        jobId,
        userId: user.id,
      });
      throw err;
    }

    // 4. Persist the pending tip row
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const { data: tip, error: tipError } = await userDb
      .from('job_tips')
      .insert({
        job_id: jobId,
        payer_id: user.id,
        payee_id: contractor.id,
        amount,
        currency: 'gbp',
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        note: note?.trim() || null,
      })
      .select('id, amount, currency, status, stripe_payment_intent_id')
      .single();

    if (tipError) {
      logger.error('Failed to persist tip row', tipError, {
        service: 'job-tips',
        jobId,
        userId: user.id,
        paymentIntentId: paymentIntent.id,
      });
      // Best-effort cancel the PaymentIntent so the homeowner isn't
      // left with a dangling auth.
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch {
        // Silent — Stripe will eventually drop the uncaptured intent.
      }
      throw tipError;
    }

    return NextResponse.json({
      tip,
      clientSecret: paymentIntent.client_secret,
    });
  }
);

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request: NextRequest, { user, params }) => {
    const jobId = params.id;

    // Just hit the table — RLS gates the rows (homeowner sees their
    // sends, contractor sees their receipts, admin sees all).
    const userDb = createRequestScopedClient(request) ?? serverSupabase;
    const { data, error } = await userDb
      .from('job_tips')
      .select(
        'id, amount, currency, status, note, paid_at, created_at, payer_id, payee_id'
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching job tips', error, {
        service: 'job-tips',
        jobId,
        userId: user.id,
      });
      throw error;
    }

    const completed = (data || []).filter((t) => t.status === 'completed');
    const totalCompleted = completed.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    return NextResponse.json({
      tips: data || [],
      totalCompleted,
    });
  }
);
