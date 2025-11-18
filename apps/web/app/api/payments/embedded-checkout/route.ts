import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { env } from '@/lib/env';
import { FeeCalculationService, type PaymentType } from '@/lib/services/payment/FeeCalculationService';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const bodySchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  jobId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  quantity: z.number().int().positive().optional().default(1),
  paymentType: z.enum(['deposit', 'final', 'milestone']).optional().default('final'),
});

/**
 * Create an embedded Stripe Checkout Session
 * POST /api/payments/embedded-checkout
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { priceId, jobId, contractorId, quantity, paymentType } = parsed.data;

    // Get price details to calculate amount
    let paymentAmount: number | null = null;
    let currency = 'usd';

    try {
      const price = await stripe.prices.retrieve(priceId);
      paymentAmount = (price.unit_amount || 0) / 100; // Convert cents to dollars
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
          .from('users')
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
        const totalAmount = paymentAmount * quantity;
        const feeBreakdown = FeeCalculationService.calculateFees(totalAmount, {
          paymentType: paymentType as PaymentType,
        });

        // Application fee amount in cents (platform fee)
        applicationFeeAmount = Math.round(feeBreakdown.platformFee * 100);
      }
    }

    // Get the base URL for return URL
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

    // Create metadata for tracking
    const metadata: Record<string, string> = {
      userId: user.id,
      userEmail: user.email || '',
      paymentType,
    };

    if (jobId) {
      metadata.jobId = jobId;
    }

    if (contractorId) {
      metadata.contractorId = contractorId;
    }

    // Build payment intent data for marketplace payments
    // NOTE: For escrow payments, we charge the full amount to the platform account first.
    // The contractor payout (minus platform fee) happens later when escrow is released.
    // This is different from direct marketplace payments where funds go directly to contractor.
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {};

    // Store contractor account ID in metadata for later escrow release
    // We don't transfer funds immediately - escrow holds the funds until job completion
    if (contractorStripeAccountId) {
      metadata.isMarketplacePayment = 'true';
      metadata.contractorStripeAccountId = contractorStripeAccountId;
      metadata.platformFeeAmount = applicationFeeAmount ? (applicationFeeAmount / 100).toString() : '0';
      
      // Calculate total amount for metadata
      const totalAmount = paymentAmount * quantity;
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
      // Add payment intent data for marketplace payments
      ...(Object.keys(paymentIntentData).length > 0 && {
        payment_intent_data: paymentIntentData,
      }),
    });

    // If this is a marketplace payment, create escrow transaction record
    if (jobId && contractorStripeAccountId) {
      const totalAmount = paymentAmount * quantity;
      
      const { error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .insert({
          job_id: jobId,
          amount: totalAmount,
          status: 'pending',
          payment_type: paymentType,
          stripe_checkout_session_id: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (escrowError) {
        logger.error('Failed to create escrow transaction for checkout session', escrowError, {
          service: 'payments',
          sessionId: session.id,
          jobId,
        });
        // Don't fail the checkout - we'll handle this in webhook
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
  } catch (err) {
    logger.error('Failed to create embedded checkout session', err, {
      service: 'payments',
    });
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

