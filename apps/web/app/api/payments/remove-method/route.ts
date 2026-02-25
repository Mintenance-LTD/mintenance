import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const removeMethodSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * DELETE /api/payments/remove-method
 * Detach a payment method from the user
 */
export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, removeMethodSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId } = validation.data;

    // Retrieve payment method to verify ownership
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.customer) {
      return NextResponse.json(
        { error: 'Payment method not attached to any customer' },
        { status: 400 }
      );
    }

    // Verify the payment method belongs to this user's customer
    let stripeCustomerId: string | null = null;
    const { data: stripeData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (stripeData) {
      stripeCustomerId = (stripeData as Record<string, unknown>).stripe_customer_id as string | null;
    }

    // Fallback: search Stripe by email
    if (!stripeCustomerId) {
      const { data: profileData } = await serverSupabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      if (profileData?.email) {
        const existing = await stripe.customers.list({ email: profileData.email, limit: 1 });
        stripeCustomerId = existing.data[0]?.id || null;
      }
    }

    if (!stripeCustomerId) {
      logger.warn('User has no Stripe customer record', {
        service: 'payments',
        userId: user.id
      });
      return NextResponse.json(
        { error: 'Customer account not found. Please add a payment method first.' },
        { status: 404 }
      );
    }

    if (paymentMethod.customer !== stripeCustomerId) {
      logger.warn('Payment method ownership verification failed', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        expectedCustomerId: stripeCustomerId,
        actualCustomerId: paymentMethod.customer
      });
      return NextResponse.json(
        { error: 'Payment method does not belong to user' },
        { status: 403 }
      );
    }

    // Detach payment method
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: error.message, type: error.type },
          { status: 400 }
        );
      }
      throw error;
    }

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
  }
);
