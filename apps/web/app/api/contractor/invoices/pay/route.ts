import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
import { getSafeReturnUrl } from '@/lib/security/safe-return-url';
import {
  getDeterministicIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
  releaseOnError,
} from '@/lib/idempotency';

const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  paymentMethod: z.enum(['card', 'bank_transfer']).default('card'),
  returnUrl: z.string().url().optional(),
});

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
    description: `Payment for invoice ${invoice.invoice_number}`,
    payment_type: 'final',
    metadata: {
      invoice_id: invoice.id,
      escrow_type: 'invoice_payment',
      release_conditions: {
        auto_release: false,
        requires_approval: true,
        invoice_paid: true,
      },
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

    const safeReturnUrl = getSafeReturnUrl(
      validatedData.returnUrl,
      new URL(request.url).origin,
      process.env.NEXT_PUBLIC_APP_URL
    );

    const idempotencyKey = getDeterministicIdempotencyKeyFromRequest(
      request,
      'pay_invoice',
      user.id,
      invoice.id
    );
    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'pay_invoice'
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    return await releaseOnError(idempotencyKey, 'pay_invoice', async () => {
      // Reuse a still-pending payment for this invoice/payer tuple.
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
              .eq('payment_intent_id', existingIntent.id)
              .maybeSingle();
            logger.info('Re-using existing pending invoice payment intent', {
              invoiceId: invoice.id,
              paymentId: existingPayment.id,
              paymentIntentId: existingIntent.id,
              intentStatus: existingIntent.status,
            });
            const responseData = {
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
                safeReturnUrl || `/payments/${existingPayment.id}/confirm`,
              reused: true,
            };
            await storeIdempotencyResult(
              idempotencyKey,
              'pay_invoice',
              responseData,
              user.id,
              { invoiceId: invoice.id, paymentId: existingPayment.id }
            );
            return NextResponse.json(responseData);
          }
        } catch (retrieveErr) {
          logger.warn('Failed to retrieve existing payment intent', {
            paymentIntentId: existingPayment.stripe_payment_intent_id,
            error:
              retrieveErr instanceof Error
                ? retrieveErr.message
                : String(retrieveErr),
          });
        }
      }

      const contractorTier = await FeeCalculationService.resolveContractorTier(
        invoice.contractor_id
      );
      const feeBreakdown = FeeCalculationService.calculateFees(
        invoice.total_amount,
        { contractorTier }
      );

      const paymentIntent = await createPaymentIntent(
        invoice,
        user.id,
        Math.round(feeBreakdown.platformFee * 100)
      );

      const escrow = await createEscrowTransaction(
        invoice,
        user.id,
        paymentIntent.id
      );

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
        throw new InternalServerError(
          'Payment was created but could not be recorded. Please contact support.'
        );
      }

      await serverSupabase
        .from('invoices')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

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

      const responseData = {
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
          safeReturnUrl ||
          `/payments/${payment?.id || paymentIntent.id}/confirm`,
      };
      await storeIdempotencyResult(
        idempotencyKey,
        'pay_invoice',
        responseData,
        user.id,
        { invoiceId: invoice.id, paymentIntentId: paymentIntent.id }
      );
      return NextResponse.json(responseData);
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

    // Authorize the client-supplied PaymentIntent ID against the local record
    // before reading or mutating payment state.
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

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    const isPayer = payment.payer_id === user.id;
    const isPayee = payment.payee_id === user.id;
    if (!isPayer && !isPayee) {
      throw new ForbiddenError('You are not authorized to view this payment');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

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
