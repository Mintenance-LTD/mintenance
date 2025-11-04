import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';
import { z } from 'zod';

const createSubscriptionSchema = z.object({
  planType: z.enum(['basic', 'professional', 'enterprise']),
});

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF
    if (!(await requireCSRF(request))) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { planType } = validation.data;

    // Check if user already has an active subscription
    const existingSubscription = await SubscriptionService.getContractorSubscription(user.id);
    if (existingSubscription && existingSubscription.status === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: userData } = await serverSupabase
      .from('users')
      .select('stripe_customer_id, email, trial_ends_at')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = userData?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const Stripe = (await import('stripe')).default;
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY not configured');
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-09-30.clover',
      });

      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        metadata: {
          userId: user.id,
          userRole: 'contractor',
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID
      await serverSupabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Get trial end date
    const trialStatus = await TrialService.getTrialStatus(user.id);
    const trialEnd = trialStatus?.trialEndsAt || null;

    // Create Stripe subscription
    const { subscriptionId, clientSecret } = await SubscriptionService.createStripeSubscription(
      user.id,
      planType,
      stripeCustomerId
    );

    // Get Stripe price ID (we'll need to store this)
    // For now, we'll get it from the subscription
    const Stripe = (await import('stripe')).default;
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    });

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items.data[0]?.price.id || '';

    // Save subscription to database
    const subscriptionDbId = await SubscriptionService.saveSubscription(
      user.id,
      planType,
      subscriptionId,
      stripeCustomerId,
      priceId,
      trialEnd || undefined
    );

    logger.info('Subscription created', {
      service: 'subscriptions',
      contractorId: user.id,
      planType,
      subscriptionId,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscriptionDbId,
      stripeSubscriptionId: subscriptionId,
      clientSecret,
      requiresPayment: !!clientSecret,
    });
  } catch (err) {
    logger.error('Error creating subscription', {
      service: 'subscriptions',
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: 'Failed to create subscription', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

