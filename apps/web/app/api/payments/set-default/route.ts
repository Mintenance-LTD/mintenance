import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const setDefaultSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
});

/**
 * POST /api/payments/set-default
 * Set a payment method as the default for the user
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, setDefaultSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId } = validation.data;

    // Get user's Stripe customer ID (column may not exist in DB schema)
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
      return NextResponse.json(
        { error: 'User or Stripe customer not found' },
        { status: 404 }
      );
    }

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
      return NextResponse.json(
        { error: 'Payment method does not belong to this user' },
        { status: 403 }
      );
    }

    // Set as default payment method
    try {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: error.message, type: error.type },
          { status: 400 }
        );
      }
      throw error;
    }

    logger.info('Default payment method set successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId,
    });

    return NextResponse.json({
      success: true,
      paymentMethodId,
    });
  }
);
