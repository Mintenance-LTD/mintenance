/**
 * Invoice Payment API
 * Handles payment initiation for contractor invoices
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';

// Payment initiation schema
const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  paymentMethod: z.enum(['card', 'bank_transfer']).default('card'),
  returnUrl: z.string().url().optional(),
});

// Create Stripe payment intent for invoice
async function createPaymentIntent(
  invoice: {
    id: string;
    contractor_id: string;
    total_amount: number;
    invoice_number: string;
    title: string;
    client_email: string;
    job_id?: string;
    status: string;
  },
  payerId: string,
  platformFeeCents: number
) {
  try {
    const { data: contractor } = await serverSupabase
      .from('profiles')
      .select('stripe_connect_account_id, email, company_name')
      .eq('id', invoice.contractor_id)
      .single();

    if (!contractor?.stripe_connect_account_id) {
      throw new Error('Contractor has not set up payment processing');
    }

    const amountCents = Math.round(invoice.total_amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'gbp',
      description: `Invoice ${invoice.invoice_number}: ${invoice.title}`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        payer_id: payerId,
        contractor_id: invoice.contractor_id,
        job_id: invoice.job_id || '',
      },
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: contractor.stripe_connect_account_id,
      },
      payment_method_types: ['card'],
      receipt_email: invoice.client_email,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Error creating payment intent', error);
    throw error;
  }
}

// Create escrow transaction for invoice payment
async function createEscrowTransaction(
  invoice: {
    id: string;
    contractor_id: string;
    total_amount: number;
    invoice_number: string;
    title: string;
    client_email: string;
    job_id?: string;
    status: string;
  },
  payerId: string,
  paymentIntentId: string
) {
  const escrowData = {
    job_id: invoice.job_id,
    payer_id: payerId,
    payee_id: invoice.contractor_id,
    amount: invoice.total_amount,
    status: 'pending',
    payment_intent_id: paymentIntentId,
    invoice_id: invoice.id,
    description: `Payment for invoice ${invoice.invoice_number}`,
    escrow_type: 'invoice_payment',
    release_conditions: {
      auto_release: false,
      requires_approval: true,
      invoice_paid: true,
    },
  };

  const { data: escrow, error } = await serverSupabase
    .from('escrow_transactions')
    .insert(escrowData)
    .select()
    .single();

  if (error) {
    logger.error('Error creating escrow transaction', error);
    throw error;
  }

  return escrow;
}

/**
 * POST /api/contractor/invoices/pay
 * Initiate payment for invoice
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    // Parse and validate request
    let validatedData;
    try {
      const body = await request.json();
      validatedData = initiatePaymentSchema.parse(body);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: e.errors },
          { status: 400 }
        );
      }
      throw e;
    }

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await serverSupabase
      .from('invoices')
      .select(
        `
        *,
        contractor:contractor_id (
          id,
          email,
          company_name,
          stripe_connect_account_id
        )
      `
      )
      .eq('id', validatedData.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new NotFoundError('Invoice');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestError('Invoice has already been paid');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestError('Invoice has been cancelled');
    }

    // Verify user is authorized to pay
    let authorized = false;
    if (user.email === invoice.client_email) {
      authorized = true;
    }
    if (invoice.job_id) {
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('homeowner_id')
        .eq('id', invoice.job_id)
        .single();
      if (job && job.homeowner_id === user.id) {
        authorized = true;
      }
    }
    if (!authorized) {
      throw new ForbiddenError('You are not authorized to pay this invoice');
    }

    // 2026-05-23 audit-17 P1: the /payments/[id]/confirm page POSTs to
    // this route on mount. The previous implementation unconditionally
    // created a new PaymentIntent + escrow_transactions row + payments
    // row every time, so each refresh / re-open / navigation churn left
    // a trail of orphaned pending payments for the same invoice. Stripe
    // bills $0.00 PaymentIntents but each one consumes API quota AND
    // the duplicated rows make idempotent webhook handling much harder
    // (e.g. webhook fires for one intent while another is still pending
    // in the DB).
    //
    // Look up any existing pending payment for this (invoice, payer)
    // tuple first. If the Stripe PaymentIntent is still in a pre-payment
    // state (`requires_payment_method`, `requires_confirmation`,
    // `requires_action`) we re-use it and the linked escrow row. The
    // notification is also skipped on the reuse path so re-opens don't
    // re-spam the contractor.
    const { data: existingPayment } = await serverSupabase
      .from('payments')
      .select('id, status, stripe_payment_intent_id')
      .eq('invoice_id', invoice.id)
      .eq('payer_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const REUSABLE_STRIPE_STATUSES = new Set([
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
    ]);

    if (existingPayment?.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripe_payment_intent_id
        );
        if (REUSABLE_STRIPE_STATUSES.has(existingIntent.status)) {
          const { data: existingEscrow } = await serverSupabase
            .from('escrow_transactions')
            .select('id, status')
            .eq('invoice_id', invoice.id)
            .eq('payment_intent_id', existingIntent.id)
            .maybeSingle();
          logger.info('Re-using existing pending invoice payment intent', {
            invoiceId: invoice.id,
            paymentId: existingPayment.id,
            paymentIntentId: existingIntent.id,
            intentStatus: existingIntent.status,
          });
          return NextResponse.json({
            success: true,
            paymentIntent: {
              id: existingIntent.id,
              clientSecret: existingIntent.client_secret,
              amount: existingIntent.amount,
              currency: existingIntent.currency,
            },
            escrow: existingEscrow
              ? { id: existingEscrow.id, status: existingEscrow.status }
              : null,
            payment: {
              id: existingPayment.id,
              status: existingPayment.status,
            },
            invoice: {
              id: invoice.id,
              number: invoice.invoice_number,
              amount: invoice.total_amount,
            },
            redirectUrl:
              validatedData.returnUrl ||
              `/payments/${existingPayment.id}/confirm`,
            reused: true,
          });
        }
        // Existing intent is in a terminal state (canceled / succeeded /
        // requires nothing). Fall through to create a fresh one; the
        // stale row stays in `payments` for audit / Stripe-reconciliation.
      } catch (retrieveErr) {
        // Stripe lookup failure shouldn't block the user from paying —
        // log and fall through to create a fresh intent.
        logger.warn('Failed to retrieve existing payment intent', {
          paymentIntentId: existingPayment.stripe_payment_intent_id,
          error:
            retrieveErr instanceof Error
              ? retrieveErr.message
              : String(retrieveErr),
        });
      }
    }

    // 2026-07-04: tier-aware platform fee. This route shipped with a
    // hardcoded 5% and was missed in the 2026-05-23 tiered-pricing rollout,
    // under-collecting on free/basic (12%) and professional (8%) invoices.
    // Same pattern as payments/embedded-checkout: resolve tier, then let
    // FeeCalculationService produce the single fee breakdown used for both
    // the Stripe application fee and the payments-row bookkeeping.
    const contractorTier = await FeeCalculationService.resolveContractorTier(
      invoice.contractor_id
    );
    const feeBreakdown = FeeCalculationService.calculateFees(
      invoice.total_amount,
      { contractorTier }
    );

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent(
      invoice,
      user.id,
      Math.round(feeBreakdown.platformFee * 100)
    );

    // Create escrow transaction
    const escrow = await createEscrowTransaction(
      invoice,
      user.id,
      paymentIntent.id
    );

    // Create payment record
    const { data: payment, error: paymentError } = await serverSupabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        job_id: invoice.job_id,
        payer_id: user.id,
        payee_id: invoice.contractor_id,
        amount: invoice.total_amount,
        currency: 'GBP',
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        description: `Payment for invoice ${invoice.invoice_number}`,
        platform_fee: feeBreakdown.platformFee,
        processing_fee: feeBreakdown.stripeFee,
        net_amount: feeBreakdown.contractorAmount,
      })
      .select()
      .single();

    if (paymentError) {
      logger.error('Error creating payment record', paymentError);
    }

    // Update invoice status
    await serverSupabase
      .from('invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    // Create notification for contractor.
    // 2026-05-01 audit follow-up: the previous direct insert wrote a
    // `data` field, but the live `notifications` table column is
    // `metadata` (renamed in a later migration). PostgREST silently
    // dropped the unknown column and the notification reached the
    // contractor without invoice context. Routing through
    // `NotificationService.createNotification` also adds push delivery
    // + per-user preference checks.
    // 2026-05-21 Mint Editorial voice — amount-led, names the next step.
    const fmtAmount = `£${Number(invoice.total_amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    await NotificationService.createNotification({
      userId: invoice.contractor_id,
      type: 'payment_initiated',
      title: `${fmtAmount} on the way for ${invoice.invoice_number}`,
      message: `Payment is in flight — typically lands in 1–2 business days.`,
      metadata: {
        invoice_id: invoice.id,
        payment_id: payment?.id,
        amount: invoice.total_amount,
      },
    });

    logger.info('Payment initiated for invoice', {
      invoiceId: invoice.id,
      paymentIntentId: paymentIntent.id,
      escrowId: escrow.id,
      payerId: user.id,
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      escrow: { id: escrow.id, status: escrow.status },
      payment: payment ? { id: payment.id, status: payment.status } : null,
      invoice: {
        id: invoice.id,
        number: invoice.invoice_number,
        amount: invoice.total_amount,
      },
      redirectUrl:
        validatedData.returnUrl ||
        `/payments/${payment?.id || paymentIntent.id}/confirm`,
    });
  }
);

/**
 * GET /api/contractor/invoices/pay
 * Check payment status
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
      throw new BadRequestError('Payment intent ID required');
    }

    // Fetch payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Fetch local payment record
    const { data: payment } = await serverSupabase
      .from('payments')
      .select(
        `
        *,
        invoice:invoice_id (
          invoice_number,
          title,
          total_amount
        )
      `
      )
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    // Update local status if needed
    if (payment && payment.status !== paymentIntent.status) {
      await serverSupabase
        .from('payments')
        .update({
          status:
            paymentIntent.status === 'succeeded' ? 'completed' : payment.status,
          processed_at:
            paymentIntent.status === 'succeeded'
              ? new Date().toISOString()
              : null,
        })
        .eq('id', payment.id);

      if (paymentIntent.status === 'succeeded') {
        await serverSupabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_amount: payment.invoice.total_amount,
            paid_date: new Date().toISOString(),
          })
          .eq('id', payment.invoice_id);

        await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'held',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntentId);
      }
    }

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            invoice: payment.invoice,
          }
        : null,
    });
  }
);
