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

const removeMethodSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * DELETE /api/payments/remove-method
 * Detach a payment method from the user
 */
export async function DELETE(request: NextRequest) {
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
    const parsed = removeMethodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentMethodId } = parsed.data;

    // Retrieve payment method to verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.customer) {
      return NextResponse.json(
        { error: 'Payment method not attached to any customer' },
        { status: 400 }
      );
    }

    // Verify the payment method belongs to this user's customer
    const { data: userCustomer, error: customerError } = await serverSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !userCustomer) {
      logger.warn('User has no Stripe customer record', {
        service: 'payments',
        userId: user.id
      });
      return NextResponse.json(
        { error: 'Customer account not found' },
        { status: 404 }
      );
    }

    if (paymentMethod.customer !== userCustomer.stripe_customer_id) {
      logger.warn('Payment method ownership verification failed', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        expectedCustomerId: userCustomer.stripe_customer_id,
        actualCustomerId: paymentMethod.customer
      });
      return NextResponse.json(
        { error: 'Payment method does not belong to user' },
        { status: 403 }
      );
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    logger.info('Payment method removed successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId
    });

    return NextResponse.json({
      success: true,
      paymentMethodId,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    logger.error('Error removing payment method', error, { service: 'payments' });

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}
