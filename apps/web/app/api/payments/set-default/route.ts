import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured. Payment processing is disabled.');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const setDefaultSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * POST /api/payments/set-default
 * Set a payment method as the default for the user
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const parsed = setDefaultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentMethodId } = parsed.data;

    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await serverSupabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User or Stripe customer not found' },
        { status: 404 }
      );
    }

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== userData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Payment method does not belong to this user' },
        { status: 403 }
      );
    }

    // Set as default payment method
    await stripe.customers.update(userData.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    logger.info('Default payment method set successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId,
    });

    return NextResponse.json({
      success: true,
      paymentMethodId,
    });
  } catch (error) {
    logger.error('Error setting default payment method', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}

