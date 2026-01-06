/**
 * Invoice Payment API
 * Handles payment initiation for contractor invoices
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { requireCSRF } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rate-limiter';

// Payment initiation schema
const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  paymentMethod: z.enum(['card', 'bank_transfer']).default('card'),
  returnUrl: z.string().url().optional(),
});

// Create Stripe payment intent for invoice
async function createPaymentIntent(invoice: unknown, payerId: string) {
  try {
    // Get contractor's Stripe Connect account
    const { data: contractor } = await serverSupabase
      .from('users')
      .select('stripe_connect_account_id, email, company_name')
      .eq('id', invoice.contractor_id)
      .single();

    if (!contractor?.stripe_connect_account_id) {
      throw new Error('Contractor has not set up payment processing');
    }

    // Calculate platform fee (e.g., 5%)
    const platformFeePercent = 5;
    const amountCents = Math.round(invoice.total_amount * 100);
    const platformFeeCents = Math.round(amountCents * (platformFeePercent / 100));

    // Create payment intent
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
async function createEscrowTransaction(invoice: unknown, payerId: string, paymentIntentId: string) {
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

// POST: Initiate payment for invoice
export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = initiatePaymentSchema.parse(body);

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await serverSupabase
      .from('contractor_invoices')
      .select(`
        *,
        contractor:contractor_id (
          id,
          email,
          company_name,
          stripe_connect_account_id
        )
      `)
      .eq('id', validatedData.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice has already been paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invoice has been cancelled' },
        { status: 400 }
      );
    }

    // Verify user is authorized to pay (either the client or a homeowner for the job)
    let authorized = false;

    // Check if user email matches client email
    if (user.email === invoice.client_email) {
      authorized = true;
    }

    // Check if user is the homeowner for the linked job
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
      return NextResponse.json(
        { error: 'You are not authorized to pay this invoice' },
        { status: 403 }
      );
    }

    // Create Stripe payment intent
    const paymentIntent = await createPaymentIntent(invoice, user.id);

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
        platform_fee: invoice.total_amount * 0.05, // 5% platform fee
        processing_fee: invoice.total_amount * 0.029 + 0.30, // Stripe fee estimate
        net_amount: invoice.total_amount * 0.921 - 0.30, // After fees
      })
      .select()
      .single();

    if (paymentError) {
      logger.error('Error creating payment record', paymentError);
      // Continue anyway - payment intent exists
    }

    // Update invoice status to indicate payment initiated
    await serverSupabase
      .from('contractor_invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    // Create notification for contractor
    await serverSupabase
      .from('notifications')
      .insert({
        user_id: invoice.contractor_id,
        type: 'payment_initiated',
        title: 'Payment Initiated',
        message: `Payment has been initiated for invoice ${invoice.invoice_number}`,
        data: {
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

    // Return payment details for client to complete
    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      escrow: {
        id: escrow.id,
        status: escrow.status,
      },
      payment: payment ? {
        id: payment.id,
        status: payment.status,
      } : null,
      invoice: {
        id: invoice.id,
        number: invoice.invoice_number,
        amount: invoice.total_amount,
      },
      redirectUrl: validatedData.returnUrl || `/payments/${payment?.id || paymentIntent.id}/confirm`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Unexpected error initiating payment', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

// GET: Check payment status
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID required' },
        { status: 400 }
      );
    }

    // Fetch payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Fetch local payment record
    const { data: payment } = await serverSupabase
      .from('payments')
      .select(`
        *,
        invoice:invoice_id (
          invoice_number,
          title,
          total_amount
        )
      `)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    // Update local status if needed
    if (payment && payment.status !== paymentIntent.status) {
      await serverSupabase
        .from('payments')
        .update({
          status: paymentIntent.status === 'succeeded' ? 'completed' : payment.status,
          processed_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
        })
        .eq('id', payment.id);

      // If payment succeeded, update invoice
      if (paymentIntent.status === 'succeeded') {
        await serverSupabase
          .from('contractor_invoices')
          .update({
            status: 'paid',
            paid_amount: payment.invoice.total_amount,
            paid_date: new Date().toISOString(),
          })
          .eq('id', payment.invoice_id);

        // Update escrow status
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
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        invoice: payment.invoice,
      } : null,
    });

  } catch (error) {
    logger.error('Error checking payment status', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}