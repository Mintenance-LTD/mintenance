import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  logger,
  ESCROW_STATUS,
  validateEscrowTransition,
  type EscrowStatusValue,
} from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Audit P2 (2026-05-10): `.strict()` blocks unknown body keys so a
// rogue client can't smuggle e.g. `amount` / `escrowId` overrides
// past the server-authoritative state-machine in the handler.
const confirmIntentSchema = z
  .object({
    paymentIntentId: z
      .string()
      .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
    jobId: z.string().uuid('Invalid job ID'),
  })
  .strict();

/**
 * POST /api/payments/confirm-intent
 * Confirm a Stripe payment intent and update escrow status
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20, criticality: 'payment' } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, confirmIntentSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentIntentId, jobId } = validation.data;

    // Retrieve the payment intent from Stripe
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: error.message, type: error.type },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      logger.warn('Payment confirmation attempted for non-successful payment', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        status: paymentIntent.status,
      });
      return NextResponse.json(
        {
          error: 'Payment not completed',
          status: paymentIntent.status,
          requiresAction: paymentIntent.status === 'requires_action',
        },
        { status: 400 }
      );
    }

    // Verify job and escrow transaction.
    //
    // 2026-05-26 audit-60 P2: previously this route selected only
    // `homeowner_id` and rejected anyone else, but create-intent
    // (the sibling route) authorizes `payer_user_id || homeowner_id`
    // — landlord / agency payer jobs let a non-homeowner fund escrow
    // via the Stripe sheet, then the mobile follow-up confirm-intent
    // call 403'd, leaving escrow stuck in `pending` until the Stripe
    // webhook caught up. Pull payer_user_id too so the two routes
    // agree on who's allowed to drive the lifecycle.
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, payer_user_id, contractor_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    const authorizedPayerId =
      (job.payer_user_id as string | null) || job.homeowner_id;
    if (authorizedPayerId !== user.id) {
      throw new ForbiddenError('Unauthorized');
    }

    // Get current escrow transaction for optimistic locking
    const { data: currentEscrow, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        // 2026-05-23 audit-19 P1: live escrow_transactions has neither
        // `stripe_payment_intent_id` nor a `version` column — `payment_intent_id`
        // (no stripe_ prefix) is the only payment-intent ref, and there's
        // no optimistic-locking version column on this table. The previous
        // SELECT 400'd PostgREST and the route 404'd back to the homeowner,
        // leaving the escrow stuck in `pending` for any payment that
        // happened to arrive before the Stripe webhook (the supposed
        // fallback path). Verified via information_schema 2026-05-23.
        'id, job_id, amount, status, payment_intent_id, created_at, updated_at'
      )
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !currentEscrow) {
      logger.error('Escrow transaction not found', fetchError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId,
      });
      return NextResponse.json(
        { error: 'Escrow transaction not found' },
        { status: 404 }
      );
    }

    // FIX CRIT-5: Webhook is the source of truth for escrow status.
    // If webhook already updated escrow to 'held', just confirm that.
    // If not yet updated, update here as a fallback (webhook may arrive later).
    let escrowTransaction = currentEscrow;

    if (currentEscrow.status === ESCROW_STATUS.HELD) {
      // Webhook already processed — just return success
      logger.info('Escrow already held (webhook processed first)', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId,
      });
    } else if (currentEscrow.status === ESCROW_STATUS.PENDING) {
      // Validate escrow transition: pending -> held
      validateEscrowTransition(
        currentEscrow.status as EscrowStatusValue,
        ESCROW_STATUS.HELD as EscrowStatusValue
      );

      // Webhook hasn't arrived yet — update as fallback
      const { data: updatedEscrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .update({
          status: ESCROW_STATUS.HELD,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', paymentIntentId)
        .eq('job_id', jobId)
        .eq('status', ESCROW_STATUS.PENDING)
        .select()
        .single();

      if (escrowError || !updatedEscrow) {
        // Likely the webhook updated it between our read and write — re-fetch
        const { data: refetched } = await serverSupabase
          .from('escrow_transactions')
          .select(
            // Same audit-19 P1 column fix as above — payment_intent_id only.
            'id, job_id, amount, status, payment_intent_id, created_at, updated_at'
          )
          .eq('payment_intent_id', paymentIntentId)
          .eq('job_id', jobId)
          .single();

        if (refetched?.status === ESCROW_STATUS.HELD) {
          escrowTransaction = refetched;
        } else {
          logger.error('Error confirming escrow transaction', escrowError, {
            service: 'payments',
            userId: user.id,
            paymentIntentId,
            jobId,
          });
          return NextResponse.json(
            { error: 'Failed to confirm payment. Please refresh the page.' },
            { status: 500 }
          );
        }
      } else {
        escrowTransaction = updatedEscrow;
      }
    } else {
      // Escrow is in an unexpected state (failed, cancelled, etc.)
      return NextResponse.json(
        {
          error: `Payment cannot be confirmed. Current status: ${currentEscrow.status}`,
        },
        { status: 400 }
      );
    }

    logger.info('Payment confirmed and escrow updated', {
      service: 'payments',
      userId: user.id,
      paymentIntentId,
      jobId,
      escrowTransactionId: escrowTransaction.id,
      amount: escrowTransaction.amount,
    });

    // Notify both parties about successful payment.
    //
    // Capture the notification ids from createNotification() so we can
    // flip `email_sent = true` on each row after the corresponding
    // EmailService call succeeds — closes the observability story
    // opened by the 2026-04-20 multi-channel delivery tracking
    // migration (push_sent / email_sent / delivered_at). This is the
    // first call-site that fans out a notifications row across both
    // channels; the pattern used here should be replicated at the
    // other ~14 sites that also send email.
    try {
      const amount = escrowTransaction.amount;
      const jobTitle = job.title || 'your job';
      // 2026-05-21 Mint Editorial voice: amount-led titles, concrete
      // next step in the body.
      const fmtAmount = `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

      const contractorNotifPromise = job.contractor_id
        ? NotificationService.createNotification({
            userId: job.contractor_id,
            title: `${fmtAmount} funded — you're cleared to start`,
            message: `Escrow is good on "${jobTitle}". Upload before-photos and tap Start Job when you're on site.`,
            type: 'payment',
            actionUrl: `/contractor/jobs/${jobId}`,
          })
        : Promise.resolve<string | null>(null);

      const homeownerNotifPromise = NotificationService.createNotification({
        userId: user.id,
        title: `${fmtAmount} held in escrow`,
        message: `Your payment for "${jobTitle}" is locked in. The contractor only gets it once you approve the finished work.`,
        type: 'payment',
        actionUrl: `/jobs/${jobId}`,
      });

      const [contractorNotifId, homeownerNotifId] = await Promise.all([
        contractorNotifPromise,
        homeownerNotifPromise,
      ]);

      // Send email notifications (non-blocking)
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://www.mintenance.co.uk';
      const { data: homeownerProfile } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const { data: contractorProfile } = job.contractor_id
        ? await serverSupabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', job.contractor_id)
            .single()
        : { data: null };

      const homeownerName = homeownerProfile
        ? `${homeownerProfile.first_name || ''} ${homeownerProfile.last_name || ''}`.trim() ||
          'Homeowner'
        : 'Homeowner';
      const contractorName = contractorProfile
        ? `${contractorProfile.first_name || ''} ${contractorProfile.last_name || ''}`.trim() ||
          'Contractor'
        : 'Contractor';

      // Each email-send + email_sent-flag is wrapped in its own
      // async block so one provider failure doesn't hold up the
      // other side's flag. Promise.allSettled tolerates per-promise
      // rejections without rolling back the whole payment-confirm.
      const emailPromises: Promise<unknown>[] = [];

      if (homeownerProfile?.email) {
        emailPromises.push(
          (async () => {
            const ok = await EmailService.sendPaymentConfirmationEmail(
              homeownerProfile.email,
              {
                homeownerName,
                jobTitle,
                amount: Number(amount),
                contractorName,
                viewUrl: `${baseUrl}/payments`,
              }
            );
            if (ok) {
              await NotificationService.markEmailSent(homeownerNotifId);
            }
            return ok;
          })()
        );
      }

      if (contractorProfile?.email && job.contractor_id) {
        emailPromises.push(
          (async () => {
            const ok = await EmailService.sendPaymentReceivedEmail(
              contractorProfile.email,
              {
                contractorName,
                jobTitle,
                amount: Number(amount),
                homeownerName,
                viewUrl: `${baseUrl}/contractor/jobs/${jobId}`,
              }
            );
            if (ok) {
              await NotificationService.markEmailSent(contractorNotifId);
            }
            return ok;
          })()
        );
      }

      if (emailPromises.length > 0) {
        await Promise.allSettled(emailPromises);
      }
    } catch (notifError) {
      logger.error(
        'Failed to create payment confirmation notifications',
        notifError,
        { service: 'payments', jobId }
      );
    }

    // NOTE: Job status is NOT updated here. Per the canonical workflow (Phase 6),
    // the contractor must upload before-photos and click "Start Job" via POST /api/jobs/[id]/start
    // which transitions the job from 'assigned' to 'in_progress'. Payment confirmation
    // only moves escrow to 'held' — the job remains 'assigned' until work begins.

    return NextResponse.json({
      success: true,
      escrowTransactionId: escrowTransaction.id,
      status: escrowTransaction.status,
      amount: escrowTransaction.amount,
    });
  }
);
