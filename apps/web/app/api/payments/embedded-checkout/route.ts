import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { env, getAppUrl } from '@/lib/env';
import { FeeCalculationService, type PaymentType } from '@/lib/services/payment/FeeCalculationService';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const bodySchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  jobId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  quantity: z.number().int().positive().optional().default(1),
  paymentType: z.enum(['deposit', 'final', 'milestone']).optional().default('final'),
});

/**
 * POST /api/payments/embedded-checkout
 * Create an embedded Stripe Checkout Session
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, bodySchema);
    if ('headers' in validation) {
      return validation;
    }

    const { priceId, jobId, contractorId, quantity, paymentType } = validation.data;

    // Get price details to calculate amount
    let paymentAmount: number | null = null;
    let currency = 'gbp';

    try {
      const price = await stripe.prices.retrieve(priceId);
      paymentAmount = (price.unit_amount || 0) / 100;
      currency = price.currency;
    } catch (error) {
      logger.error('Failed to retrieve price', error, {
        service: 'payments',
        priceId,
      });
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // If jobId is provided, validate job ownership and set up marketplace payment
    let contractorStripeAccountId: string | null = null;
    let applicationFeeAmount: number | null = null;

    if (jobId) {
      const { data: jobData, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, title, homeowner_id, contractor_id, budget')
        .eq('id', jobId)
        .eq('homeowner_id', user.id)
        .single();

      if (jobError || !jobData) {
        logger.warn('Job access denied or not found', {
          service: 'payments',
          jobId,
          userId: user.id,
          error: jobError?.message,
        });
        return NextResponse.json(
          { error: 'Job not found or access denied' },
          { status: 404 }
        );
      }

      // Validate contractor matches if provided
      if (contractorId && jobData.contractor_id !== contractorId) {
        return NextResponse.json(
          { error: 'Contractor does not match job assignment' },
          { status: 400 }
        );
      }

      // Get contractor's Stripe Connect account for marketplace payment
      if (jobData.contractor_id) {
        const { data: contractor, error: contractorError } = await serverSupabase
          .from('profiles')
          .select('stripe_connect_account_id')
          .eq('id', jobData.contractor_id)
          .single();

        if (contractorError || !contractor?.stripe_connect_account_id) {
          logger.warn('Contractor missing Stripe Connect account', {
            service: 'payments',
            contractorId: jobData.contractor_id,
            jobId,
          });
          return NextResponse.json(
            { error: 'Contractor has not set up payment account' },
            { status: 400 }
          );
        }

        contractorStripeAccountId = contractor.stripe_connect_account_id;

        // Calculate platform fee for marketplace payment
        const totalAmount = paymentAmount * (quantity ?? 1);
        const feeBreakdown = FeeCalculationService.calculateFees(totalAmount, {
          paymentType: paymentType as PaymentType,
        });

        // Application fee amount in cents (platform fee)
        applicationFeeAmount = Math.round(feeBreakdown.platformFee * 100);
      }
    }

    // Get the base URL for return URL
    const baseUrl = getAppUrl();
    const returnUrl = `${baseUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

    // Create metadata for tracking
    const metadata: Record<string, string> = {
      userId: user.id,
      userEmail: user.email || '',
      paymentType: paymentType ?? 'final',
    };

    if (jobId) {
      metadata.jobId = jobId;
    }

    if (contractorId) {
      metadata.contractorId = contractorId;
    }

    // Build payment intent data for marketplace payments
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {};

    // Store contractor account ID in metadata for later escrow release
    if (contractorStripeAccountId) {
      metadata.isMarketplacePayment = 'true';
      metadata.contractorStripeAccountId = contractorStripeAccountId;
      metadata.platformFeeAmount = applicationFeeAmount ? (applicationFeeAmount / 100).toString() : '0';

      const totalAmount = paymentAmount * (quantity ?? 1);
      metadata.totalAmount = totalAmount.toString();
    }

    // Create Checkout Session with embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      return_url: returnUrl,
      metadata,
      customer_email: user.email || undefined,
      ...(Object.keys(paymentIntentData).length > 0 && {
        payment_intent_data: paymentIntentData,
      }),
    });

    // If this is a marketplace payment, create escrow transaction record
    if (jobId && contractorStripeAccountId) {
      const totalAmount = paymentAmount * (quantity ?? 1);

      const { data: job } = await serverSupabase
        .from('jobs')
        .select('homeowner_id, contractor_id')
        .eq('id', jobId)
        .single();

      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .insert({
          job_id: jobId,
          payer_id: job?.homeowner_id || user.id,
          payee_id: job?.contractor_id || contractorStripeAccountId,
          amount: totalAmount,
          status: 'pending',
          payment_type: paymentType,
          stripe_checkout_session_id: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (escrowError) {
        logger.error('Failed to create escrow transaction for checkout session — aborting checkout', escrowError, {
          service: 'payments',
          sessionId: session.id,
          jobId,
        });
        // SECURITY: Fail loudly — a checkout without an escrow record creates an unrecoverable
        // inconsistency where payment is charged but no escrow exists.
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireError) {
          logger.error('Failed to expire checkout session after escrow failure', expireError, {
            service: 'payments',
            sessionId: session.id,
          });
        }
        return NextResponse.json(
          { error: 'Payment setup failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    logger.info('Embedded checkout session created', {
      service: 'payments',
      sessionId: session.id,
      userId: user.id,
      jobId: jobId || undefined,
      isMarketplacePayment: !!contractorStripeAccountId,
      platformFeeAmount: applicationFeeAmount ? applicationFeeAmount / 100 : undefined,
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      isMarketplacePayment: !!contractorStripeAccountId,
    });
  }
);
