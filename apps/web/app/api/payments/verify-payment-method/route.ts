import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { stripe } from '@/lib/stripe';
import { withApiHandler } from '@/lib/api/with-api-handler';

const verifyPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
});

/**
 * POST /api/payments/verify-payment-method
 * Verify a payment method belongs to the authenticated user's Stripe customer
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, verifyPaymentMethodSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { paymentMethodId, customerId } = validation.data;

    // Verify the customer belongs to the authenticated user
    const { data: customer, error: customerError } = await serverSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerError || !customer) {
      logger.warn('Payment method verification for unauthorized customer', {
        service: 'payments',
        userId: user.id,
        customerId
      });
      throw new ForbiddenError('Customer not found or unauthorized');
    }

    // Verify payment method belongs to the customer
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.customer !== customerId) {
        logger.warn('Payment method does not belong to customer', {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
          customerId,
          actualCustomerId: paymentMethod.customer
        });
        throw new ForbiddenError('Payment method does not belong to customer');
      }

      logger.info('Payment method verified successfully', {
        service: 'payments',
        userId: user.id,
        paymentMethodId,
        customerId
      });

      return NextResponse.json({
        valid: true,
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          last4: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year,
        }
      });

    } catch (stripeError) {
      if (stripeError instanceof Stripe.errors.StripeError) {
        logger.warn('Stripe error during payment method verification', {
          service: 'payments',
          userId: user.id,
          paymentMethodId,
          error: stripeError.message
        });

        if (stripeError.code === 'resource_missing') {
          throw new NotFoundError('Payment method not found');
        }

        throw new BadRequestError(stripeError.message);
      }

      throw stripeError;
    }
  }
);
