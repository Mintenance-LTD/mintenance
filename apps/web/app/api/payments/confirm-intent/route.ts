import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';

const confirmIntentSchema = z.object({
  paymentIntentId: z.string().regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  jobId: z.string().uuid('Invalid job ID'),
});

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      logger.warn('Unauthorized payment confirmation attempt', {
        service: 'payments',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      throw new UnauthorizedError('Authentication required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, confirmIntentSchema);
    if ('headers' in validation) {
      logger.warn('Invalid payment confirmation request', {
        service: 'payments',
        userId: user.id,
      });
      return validation;
    }

    const { paymentIntentId, jobId } = validation.data;

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      logger.warn('Payment confirmation attempted for non-successful payment', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        status: paymentIntent.status
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

    // Verify job and escrow transaction
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Unauthorized');
    }

    // Get current escrow transaction for optimistic locking
    const { data: currentEscrow, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, job_id, amount, status, stripe_payment_intent_id, payment_intent_id, version, created_at, updated_at')
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !currentEscrow) {
      logger.error('Escrow transaction not found', fetchError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'Escrow transaction not found' },
        { status: 404 }
      );
    }

    // Update escrow transaction status with optimistic locking
    const originalUpdatedAt = currentEscrow.updated_at;
    const { data: updatedEscrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .update({
        status: 'held',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId)
      .eq('job_id', jobId)
      .eq('updated_at', originalUpdatedAt) // Optimistic lock
      .select()
      .single();

    if (escrowError) {
      logger.error('Error updating escrow transaction', escrowError, {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'Failed to update escrow transaction' },
        { status: 500 }
      );
    }

    // Check if update succeeded (optimistic lock check)
    if (!updatedEscrow) {
      logger.warn('Escrow confirmation failed - transaction was modified by another request (race condition)', {
        service: 'payments',
        userId: user.id,
        paymentIntentId,
        jobId
      });
      return NextResponse.json(
        { error: 'This escrow transaction was modified by another request. Please try again.' },
        { status: 409 }
      );
    }

    const escrowTransaction = updatedEscrow;

    logger.info('Payment confirmed and escrow updated', {
      service: 'payments',
      userId: user.id,
      paymentIntentId,
      jobId,
      escrowTransactionId: escrowTransaction.id,
      amount: escrowTransaction.amount
    });

    // Notify both parties about successful payment
    try {
      const amount = escrowTransaction.amount;
      const jobTitle = job.title || 'your job';
      const notificationPromises = [];

      if (job.contractor_id) {
        notificationPromises.push(
          NotificationService.createNotification({
            userId: job.contractor_id,
            title: 'Payment Secured in Escrow',
            message: `Payment of £${Number(amount).toLocaleString()} for "${jobTitle}" has been secured in escrow. You can now start work.`,
            type: 'payment',
            actionUrl: `/contractor/jobs/${jobId}`,
          })
        );
      }

      notificationPromises.push(
        NotificationService.createNotification({
          userId: user.id,
          title: 'Payment Confirmed',
          message: `Your payment of £${Number(amount).toLocaleString()} for "${jobTitle}" is now held securely in escrow until the job is completed.`,
          type: 'payment',
          actionUrl: `/jobs/${jobId}`,
        })
      );

      await Promise.all(notificationPromises);
    } catch (notifError) {
      logger.error('Failed to create payment confirmation notifications', notifError, { service: 'payments', jobId });
    }

    // Optionally update job status
    await serverSupabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      escrowTransactionId: escrowTransaction.id,
      status: escrowTransaction.status,
      amount: escrowTransaction.amount,
    });
  } catch (error) {
    logger.error('Error confirming payment intent', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
