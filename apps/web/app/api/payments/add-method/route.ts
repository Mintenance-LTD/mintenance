import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const addMethodSchema = z.object({
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  setAsDefault: z.boolean().default(false),
});

/**
 * POST /api/payments/add-method
 * Attach a payment method to the user's Stripe customer
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, addMethodSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId, setAsDefault } = validation.data;

    // Get user profile
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new NotFoundError('User not found');
    }

    // Try to get stripe_customer_id (column may not exist in DB schema)
    let stripeCustomerId: string | null = null;
    const { data: stripeData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (stripeData) {
      stripeCustomerId = (stripeData as Record<string, unknown>).stripe_customer_id as string | null;
    }

    // If not in DB, search Stripe by email to avoid creating duplicates
    if (!stripeCustomerId) {
      const existing = await stripe.customers.list({ email: userData.email, limit: 1 });
      stripeCustomerId = existing.data[0]?.id || null;
    }

    // Create customer if not found anywhere
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // Best-effort save to DB (column may not exist)
    await serverSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    // Attach payment method to customer
    let paymentMethod: Stripe.PaymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        logger.error('Stripe error adding payment method', error, { service: 'payments' });
        throw new BadRequestError(error.message);
      }
      throw error;
    }

    // Set as default payment method if requested
    if (setAsDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    logger.info('Payment method added successfully', {
      service: 'payments',
      userId: user.id,
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      isDefault: setAsDefault
    });

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            }
          : null,
      },
      isDefault: setAsDefault,
    });
  }
);
